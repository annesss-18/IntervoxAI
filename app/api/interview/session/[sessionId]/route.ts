import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { decryptResumeText, encryptResumeText } from "@/lib/resume-crypto";
import { UserRepository } from "@/lib/repositories/user.repository";
import type { User } from "@/types";
import { firestoreIdSchema } from "@/lib/schemas";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const MAX_RESUME_LENGTH = 5000;

export const PATCH = withAuth(
  async (req: NextRequest, user: User, context: RouteContext) => {
    try {
      const { sessionId } = await context.params;

      const idResult = firestoreIdSchema.safeParse(sessionId);
      if (!idResult.success) {
        return NextResponse.json(
          { error: "Invalid session ID" },
          { status: 400 },
        );
      }

      const body = await req.json();
      const { resumeText, status } = body;

      const sessionRef = db.collection("interview_sessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data();

      if (sessionData?.userId !== user.id) {
        logger.warn(
          `Unauthorized session update attempt: user ${user.id} tried to update session ${sessionId}`,
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const updateData: Record<string, unknown> = {};

      if (resumeText !== undefined) {
        // Resume context is mutable only before the live interview starts.
        if (sessionData?.status !== "setup") {
          return NextResponse.json(
            { error: "Resume cannot be modified after interview starts" },
            { status: 400 },
          );
        }
        updateData.resumeText = resumeText
          ? encryptResumeText(String(resumeText).slice(0, MAX_RESUME_LENGTH))
          : null;
        updateData.hasResume =
          typeof resumeText === "string" && resumeText.trim().length > 0;
      }

      if (status !== undefined) {
        // Enforce one-way status progression.
        if (!["active", "completed"].includes(status)) {
          return NextResponse.json(
            { error: "Invalid status transition" },
            { status: 400 },
          );
        }

        const currentStatus = sessionData?.status;
        if (status === "active" && currentStatus !== "setup") {
          return NextResponse.json(
            { error: "Only setup sessions can be activated" },
            { status: 400 },
          );
        }
        if (
          status === "completed" &&
          !["setup", "active"].includes(currentStatus)
        ) {
          return NextResponse.json(
            { error: "Session is already completed" },
            { status: 400 },
          );
        }

        updateData.status = status;
        if (status === "active") {
          updateData.activatedAt = new Date().toISOString();
        }
        if (status === "completed" && !sessionData?.completedAt) {
          updateData.completedAt = new Date().toISOString();
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 },
        );
      }

      await sessionRef.update(updateData);

      const updatedFields = Object.keys(updateData).join(", ");
      logger.info(
        `Session ${sessionId} updated (${updatedFields}) by user ${user.id}`,
      );

      return NextResponse.json({
        success: true,
        sessionId,
      });
    } catch (error) {
      logger.error("Error updating session:", error);

      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
);

export const GET = withAuth(
  async (_req: NextRequest, user: User, context: RouteContext) => {
    try {
      const { sessionId } = await context.params;

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID is required" },
          { status: 400 },
        );
      }

      const sessionDoc = await db
        .collection("interview_sessions")
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data();

      if (sessionData?.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const decryptedResumeText = decryptResumeText(
        sessionData?.resumeText as string | undefined,
      );

      return NextResponse.json({
        success: true,
        session: {
          id: sessionDoc.id,
          ...sessionData,
          resumeText: decryptedResumeText,
        },
      });
    } catch (error) {
      logger.error("Error fetching session:", error);

      return NextResponse.json(
        { error: "Failed to fetch session" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 120,
    windowMs: 60 * 1000,
  },
);

// R-13: Delete a session and its associated feedback document.
export const DELETE = withAuth(
  async (_req: NextRequest, user: User, context: RouteContext) => {
    try {
      const { sessionId } = await context.params;

      const idResult = firestoreIdSchema.safeParse(sessionId);
      if (!idResult.success) {
        return NextResponse.json(
          { error: "Invalid session ID" },
          { status: 400 },
        );
      }

      const sessionRef = db.collection("interview_sessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data();
      if (sessionData?.userId !== user.id) {
        logger.warn(
          `Unauthorized session delete attempt: user ${user.id} tried to delete session ${sessionId}`,
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // Batch delete: session doc + associated feedback doc (no-op if absent).
      const feedbackId = sessionData?.feedbackId;
      const batch = db.batch();
      batch.delete(sessionRef);
      if (feedbackId) {
        batch.delete(db.collection("feedback").doc(feedbackId));
      }
      await batch.commit();

      // Reverse the same aggregate counters that were applied when the session was created or completed.
      if (sessionData?.status === "completed") {
        const finalScore =
          typeof sessionData?.finalScore === "number"
            ? sessionData.finalScore
            : null;

        UserRepository.updateStats(user.id, {
          completedDelta: -1,
          ...(finalScore !== null
            ? { scoreDelta: -finalScore, scoreCount: -1 }
            : {}),
        }).catch((err) =>
          logger.warn(
            `Stats update failed on completed session delete for user ${user.id}:`,
            err,
          ),
        );
      } else {
        UserRepository.updateStats(user.id, { activeDelta: -1 }).catch((err) =>
          logger.warn(
            `Stats update failed on active session delete for user ${user.id}:`,
            err,
          ),
        );
      }

      logger.info(`Session ${sessionId} deleted by user ${user.id}`);

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Error deleting session:", error);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
);
