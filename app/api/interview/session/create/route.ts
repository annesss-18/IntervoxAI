import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuthClaims } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { UserRepository } from "@/lib/repositories/user.repository";
import { firestoreIdSchema } from "@/lib/schemas";
import type { AuthClaims, SessionTemplateSnapshot } from "@/types";

const ALLOWED_DURATIONS = [15, 30, 45, 60] as const;

const createSessionSchema = z.object({
  templateId: firestoreIdSchema,
  /**
   * Desired interview duration in minutes.
   * Client sends a number literal; defaults to 15 for backward compatibility
   * with callers that predate this field.
   */
  durationMinutes: z
    .number()
    .int()
    .refine(
      (v): v is (typeof ALLOWED_DURATIONS)[number] =>
        (ALLOWED_DURATIONS as readonly number[]).includes(v),
      { message: "durationMinutes must be 15, 30, 45, or 60" },
    )
    .optional()
    .default(15),
});

function buildTemplateSnapshot(
  templateData: FirebaseFirestore.DocumentData | undefined,
): SessionTemplateSnapshot {
  const techStack = Array.isArray(templateData?.techStack)
    ? templateData.techStack
        .filter((item: unknown): item is string => typeof item === "string")
        .slice(0, 8)
    : [];

  return {
    role:
      typeof templateData?.role === "string"
        ? templateData.role
        : "Software Engineer",
    companyName:
      typeof templateData?.companyName === "string"
        ? templateData.companyName
        : "Unknown Company",
    companyLogoUrl:
      typeof templateData?.companyLogoUrl === "string"
        ? templateData.companyLogoUrl
        : undefined,
    level:
      typeof templateData?.level === "string"
        ? (templateData.level as SessionTemplateSnapshot["level"])
        : "Mid",
    type:
      typeof templateData?.type === "string"
        ? (templateData.type as SessionTemplateSnapshot["type"])
        : "Technical",
    techStack,
  };
}

export const POST = withAuthClaims(
  async (req: NextRequest, user: AuthClaims) => {
    try {
      const body = await req.json();
      const result = createSessionSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid input", details: result.error.issues },
          { status: 400 },
        );
      }

      const { templateId, durationMinutes } = result.data;

      const templateRef = db.collection("interview_templates").doc(templateId);
      const templateSnap = await templateRef.get();
      if (!templateSnap.exists) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }

      const templateData = templateSnap.data();
      if (!templateData?.isPublic && templateData?.creatorId !== user.id) {
        return NextResponse.json(
          {
            error:
              "Forbidden. You do not have access to this private template.",
          },
          { status: 403 },
        );
      }

      const templateSnapshot = buildTemplateSnapshot(templateData);

      // Create the session and increment template usage atomically.
      const sessionId = await db.runTransaction(async (transaction) => {
        const newSessionRef = db.collection("interview_sessions").doc();
        const now = new Date().toISOString();

        transaction.set(newSessionRef, {
          templateId,
          templateSnapshot,
          userId: user.id,
          hasResume: false,
          status: "setup",
          feedbackStatus: "idle",
          feedbackError: null,
          durationMinutes,
          startedAt: now,
          transcriptTurnCount: 0,
          transcriptChunkCount: 0,
          lastTranscriptCheckpointAt: null,
        });
        transaction.update(templateRef, {
          usageCount: FieldValue.increment(1),
        });
        return newSessionRef.id;
      });

      revalidateTag(`template:${templateId}`, "max");
      revalidateTag("templates-public", "max");

      await UserRepository.updateStats(user.id, { activeDelta: 1 }).catch((err) =>
        logger.warn(
          `Stats activeCount increment failed for user ${user.id}:`,
          err,
        ),
      );

      return NextResponse.json({ sessionId });
    } catch (error) {
      logger.error("Create Session Error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  },
);
