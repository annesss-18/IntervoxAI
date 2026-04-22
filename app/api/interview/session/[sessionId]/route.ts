import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuthClaims } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { encryptResumeText } from "@/lib/resume-crypto";
import { RESUME_MAX_STORED_CHARS } from "@/lib/resume-types";
import {
  getStoredTranscriptTurnCount,
  InterviewRepository,
} from "@/lib/repositories/interview.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import type { AuthClaims } from "@/types";
import {
  checkpointBaseSchema,
  firestoreIdSchema,
  transcriptAppendSchema,
  transcriptArraySchema,
} from "@/lib/schemas";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export const PATCH = withAuthClaims(
  async (req: NextRequest, user: AuthClaims, context: RouteContext) => {
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
      const {
        resumeText,
        status,
        transcriptAppend,
        checkpointBase,
        transcript,
      } = body ?? {};

      const sessionRef = db.collection("interview_sessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data() ?? {};

      if (sessionData.userId !== user.id) {
        logger.warn(
          `Unauthorized session update attempt: user ${user.id} tried to update session ${sessionId}`,
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const updateData: Record<string, unknown> = {};

      if (resumeText !== undefined) {
        if (sessionData.status !== "setup") {
          return NextResponse.json(
            { error: "Resume cannot be modified after interview starts" },
            { status: 400 },
          );
        }

        updateData.resumeText = resumeText
          ? encryptResumeText(
              String(resumeText).slice(0, RESUME_MAX_STORED_CHARS),
            )
          : null;
        updateData.hasResume =
          typeof resumeText === "string" && resumeText.trim().length > 0;
      }

      if (status !== undefined) {
        if (!["active", "completed"].includes(status)) {
          return NextResponse.json(
            { error: "Invalid status transition" },
            { status: 400 },
          );
        }

        const currentStatus = sessionData.status;
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
        if (status === "completed" && !sessionData.completedAt) {
          updateData.completedAt = new Date().toISOString();
        }
      }

      let nextCheckpointBase: number | null = null;

      if (transcriptAppend !== undefined || transcript !== undefined) {
        if (sessionData.status === "completed") {
          return NextResponse.json(
            {
              error: "Transcript cannot be modified after session is completed",
            },
            { status: 400 },
          );
        }

        let appendEntries: Array<{ role: string; content: string }> = [];
        let appendBase: number;

        if (transcriptAppend !== undefined) {
          const parsedAppend =
            transcriptAppendSchema.safeParse(transcriptAppend);
          const parsedBase = checkpointBaseSchema.safeParse(checkpointBase);

          if (!parsedAppend.success || !parsedBase.success) {
            return NextResponse.json(
              {
                error: "Invalid transcript checkpoint payload",
                details: [
                  ...(parsedAppend.success ? [] : parsedAppend.error.issues),
                  ...(parsedBase.success ? [] : parsedBase.error.issues),
                ],
              },
              { status: 400 },
            );
          }

          appendEntries = parsedAppend.data;
          appendBase = parsedBase.data;
        } else {
          const parsedTranscript = transcriptArraySchema.safeParse(transcript);
          if (!parsedTranscript.success) {
            return NextResponse.json(
              {
                error: "Invalid transcript format",
                details: parsedTranscript.error.issues,
              },
              { status: 400 },
            );
          }

          appendBase = getStoredTranscriptTurnCount(sessionData);
          appendEntries = parsedTranscript.data.slice(appendBase);
        }

        const appendResult = await InterviewRepository.appendTranscriptEntries(
          sessionId,
          appendEntries,
          appendBase,
        );

        if (!appendResult.success) {
          if (appendResult.reason === "missing") {
            return NextResponse.json(
              { error: "Session not found" },
              { status: 404 },
            );
          }

          return NextResponse.json(
            {
              error: "Transcript checkpoint is out of date",
              expectedBase: appendResult.expectedBase ?? 0,
            },
            { status: 409 },
          );
        }

        nextCheckpointBase = appendResult.nextBase;
      }

      if (Object.keys(updateData).length > 0) {
        await sessionRef.update(updateData);
      }

      if (Object.keys(updateData).length === 0 && nextCheckpointBase === null) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 },
        );
      }

      const updatedFields = Object.keys(updateData);
      if (nextCheckpointBase !== null) {
        updatedFields.push("transcriptAppend");
      }

      logger.info(
        `Session ${sessionId} updated (${updatedFields.join(", ")}) by user ${user.id}`,
      );

      return NextResponse.json({
        success: true,
        sessionId,
        nextCheckpointBase,
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

export const GET = withAuthClaims(
  async (_req: NextRequest, user: AuthClaims, context: RouteContext) => {
    try {
      const { sessionId } = await context.params;

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID is required" },
          { status: 400 },
        );
      }

      const session = await InterviewRepository.findById(sessionId);

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      if (session.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        session,
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

export const DELETE = withAuthClaims(
  async (_req: NextRequest, user: AuthClaims, context: RouteContext) => {
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

      const sessionData = sessionDoc.data() ?? {};
      if (sessionData.userId !== user.id) {
        logger.warn(
          `Unauthorized session delete attempt: user ${user.id} tried to delete session ${sessionId}`,
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const feedbackCollection = db.collection("feedback");
      const transcriptChunkSnap = await sessionRef
        .collection("transcript_chunks")
        .get();

      // FIX: Collect all refs first, then delete in chunks of ≤500.
      // Firestore batches are capped at 500 write operations. A 60-minute
      // interview at 10-turn checkpoint intervals can produce 60+ chunk
      // documents. Attempting to delete them all in a single batch would
      // silently fail once the count exceeds 500.
      //
      // FIX: Always delete using the deterministic feedback ID format
      // (`${userId}_${sessionId}`), which is what FeedbackRepository.create()
      // uses as the document ID. The session's feedbackId field holds this same
      // value for all current sessions, but the field can be missing (session
      // never completed) or differ from the deterministic ID in legacy sessions.
      // Using both ensures no document is orphaned regardless of field state.
      const feedbackDocIds = new Set<string>();
      const deterministicFeedbackId = `${sessionData.userId}_${sessionId}`;
      feedbackDocIds.add(deterministicFeedbackId);
      const sessionFeedbackId = sessionData.feedbackId;
      if (typeof sessionFeedbackId === "string" && sessionFeedbackId) {
        feedbackDocIds.add(sessionFeedbackId);
      }

      const allDeleteRefs: FirebaseFirestore.DocumentReference[] = [sessionRef];
      for (const fid of feedbackDocIds) {
        allDeleteRefs.push(feedbackCollection.doc(fid));
      }
      for (const chunkDoc of transcriptChunkSnap.docs) {
        allDeleteRefs.push(chunkDoc.ref);
      }

      const BATCH_LIMIT = 500;
      for (let i = 0; i < allDeleteRefs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        allDeleteRefs
          .slice(i, i + BATCH_LIMIT)
          .forEach((ref) => batch.delete(ref));
        await batch.commit();
      }

      if (sessionData.status === "completed") {
        const finalScore =
          typeof sessionData.finalScore === "number"
            ? sessionData.finalScore
            : null;

        await UserRepository.updateStats(user.id, {
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
      } else if (
        sessionData.status === "setup" ||
        sessionData.status === "active"
      ) {
        await UserRepository.updateStats(user.id, { activeDelta: -1 }).catch(
          (err) =>
            logger.warn(
              `Stats update failed on active session delete for user ${user.id}:`,
              err,
            ),
        );
        // Note: "expired" sessions are intentionally skipped here. The nightly
        // cleanup worker already decremented activeCount when it expired the
        // session, so decrementing again would underflow the counter.
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
