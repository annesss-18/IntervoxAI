import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { UserRepository } from "@/lib/repositories/user.repository";
import { firestoreIdSchema } from "@/lib/schemas";
import type { User } from "@/types";

const createSessionSchema = z.object({ templateId: firestoreIdSchema });

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json();
      const result = createSessionSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid input", details: result.error.issues },
          { status: 400 },
        );
      }

      const { templateId } = result.data;

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

      // Create the session and increment template usage atomically.
      const sessionId = await db.runTransaction(async (transaction) => {
        const newSessionRef = db.collection("interview_sessions").doc();
        transaction.set(newSessionRef, {
          templateId,
          userId: user.id,
          hasResume: false,
          status: "setup",
          feedbackStatus: "idle",
          feedbackError: null,
          startedAt: new Date().toISOString(),
        });
        transaction.update(templateRef, {
          usageCount: FieldValue.increment(1),
        });
        return newSessionRef.id;
      });

      // Next.js 16 recommends the "max" cache-life profile so stale template
      // data can be served immediately while refresh happens in the background.
      revalidateTag(`template:${templateId}`, "max");
      revalidateTag("templates-public", "max");

      // Update the user's active count without blocking session creation on stats errors.
      UserRepository.updateStats(user.id, { activeDelta: 1 }).catch((err) =>
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
