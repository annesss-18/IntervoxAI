import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import {
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import { InterviewService } from "@/lib/services/interview.service";
import type { User } from "@/types";
import { z } from "zod";
import { firestoreIdSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const processFeedbackSchema = z.object({
  interviewId: firestoreIdSchema,
});

const transcriptSchema = z
  .array(
    z.object({
      role: z.string().trim().min(1).max(40),
      content: z.string().trim().min(1).max(2000),
    }),
  )
  .min(1)
  .max(300);

type ClaimResult =
  | { type: "missing" }
  | { type: "unauthorized" }
  | { type: "no_transcript" }
  | { type: "already_processing" }
  | { type: "already_completed"; feedbackId: string | null }
  | { type: "claimed"; transcript: TranscriptSentence[] };

// F-012 FIX: 2-minute hard timeout on the Gemini feedback call.
// Without this, a hung model response keeps the session in 'processing'
// indefinitely and the user has no way to retry.
const FEEDBACK_AI_TIMEOUT_MS = 2 * 60 * 1000;

// Runs model generation outside the request lifecycle and writes final status.
async function runFeedbackGeneration(
  interviewId: string,
  userId: string,
  transcript: TranscriptSentence[],
) {
  // F-012 FIX: Wrap the AI call in an AbortController so a hung Gemini request
  // times out and the session is marked 'failed' instead of stuck forever.
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, FEEDBACK_AI_TIMEOUT_MS);

  try {
    const result = await InterviewService.createFeedback(
      {
        interviewId,
        userId,
        transcript,
      },
      // Pass the abort signal through to the AI SDK call so a stalled model
      // request cannot pin the session in "processing" forever.
      { abortSignal: controller.signal },
    );

    clearTimeout(timeoutHandle);

    if (!result.success || !result.feedbackId) {
      throw new Error(
        result.success
          ? "Feedback ID missing after generation"
          : "Feedback failed",
      );
    }

    await InterviewRepository.update(interviewId, {
      feedbackStatus: "completed",
      feedbackError: null,
      feedbackCompletedAt: new Date().toISOString(),
      feedbackId: result.feedbackId,
    });
  } catch (error) {
    clearTimeout(timeoutHandle);

    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message.toLowerCase().includes("abort"));

    const message = isTimeout
      ? "Feedback generation timed out. Please retry."
      : error instanceof Error
        ? error.message
        : "Failed to generate feedback";

    logger.error(
      `Async feedback processing failed for interview ${interviewId}:`,
      { error, isTimeout },
    );

    try {
      await InterviewRepository.update(interviewId, {
        feedbackStatus: "failed",
        feedbackError: message,
      });
    } catch (updateError) {
      logger.error(
        `Failed to persist feedback failure status for interview ${interviewId}:`,
        updateError,
      );
    }
  }
}

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json();
      const validation = processFeedbackSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid input",
            details: validation.error.issues,
          },
          { status: 400 },
        );
      }

      const { interviewId } = validation.data;

      const sessionRef = db.collection("interview_sessions").doc(interviewId);
      // F-002 FIX: Deterministic feedback doc ref — checked atomically inside
      // the transaction to eliminate the TOCTOU race window.
      const deterministicFeedbackRef = db
        .collection("feedback")
        .doc(`${user.id}_${interviewId}`);

      // Claim processing inside a transaction to keep retries idempotent.
      const claim = await db.runTransaction<ClaimResult>(
        async (transaction) => {
          const [sessionDoc, feedbackSnap] = await Promise.all([
            transaction.get(sessionRef),
            transaction.get(deterministicFeedbackRef),
          ]);

          if (!sessionDoc.exists) {
            return { type: "missing" };
          }

          const sessionData = sessionDoc.data();
          if (sessionData?.userId !== user.id) {
            return { type: "unauthorized" };
          }

          // Check deterministic feedback doc first (atomic — no TOCTOU)
          if (feedbackSnap.exists) {
            // Sync session metadata while we're inside the transaction
            transaction.update(sessionRef, {
              status: "completed",
              completedAt: sessionData?.completedAt || new Date().toISOString(),
              feedbackId: feedbackSnap.id,
              finalScore: feedbackSnap.data()?.totalScore ?? null,
              feedbackStatus: "completed",
              feedbackError: null,
              feedbackCompletedAt:
                sessionData?.feedbackCompletedAt || new Date().toISOString(),
            });
            return { type: "already_completed", feedbackId: feedbackSnap.id };
          }

          const feedbackId =
            typeof sessionData?.feedbackId === "string"
              ? sessionData.feedbackId
              : null;
          if (feedbackId) {
            transaction.update(sessionRef, {
              feedbackStatus: "completed",
              feedbackError: null,
              feedbackCompletedAt:
                sessionData?.feedbackCompletedAt || new Date().toISOString(),
            });
            return { type: "already_completed", feedbackId };
          }

          if (sessionData?.feedbackStatus === "processing") {
            return { type: "already_processing" };
          }

          const transcriptValidation = transcriptSchema.safeParse(
            sessionData?.transcript,
          );
          if (!transcriptValidation.success) {
            return { type: "no_transcript" };
          }

          const now = new Date().toISOString();
          transaction.update(sessionRef, {
            status: "completed",
            completedAt: sessionData?.completedAt || now,
            feedbackStatus: "processing",
            feedbackProcessingAt: now,
            feedbackError: null,
            feedbackRequestedAt: sessionData?.feedbackRequestedAt || now,
          });

          return { type: "claimed", transcript: transcriptValidation.data };
        },
      );

      if (claim.type === "missing") {
        return NextResponse.json(
          { error: "Interview session not found" },
          { status: 404 },
        );
      }

      if (claim.type === "unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      if (claim.type === "no_transcript") {
        return NextResponse.json(
          {
            error:
              "No transcript available. Submit the interview transcript first.",
          },
          { status: 400 },
        );
      }

      if (claim.type === "already_processing") {
        return NextResponse.json(
          {
            success: true,
            status: "processing",
          },
          { status: 202 },
        );
      }

      if (claim.type === "already_completed") {
        return NextResponse.json({
          success: true,
          status: "completed",
          feedbackId: claim.feedbackId,
          reused: true,
        });
      }

      // Queue async work after the HTTP response has been committed.
      after(async () => {
        await runFeedbackGeneration(interviewId, user.id, claim.transcript);
      });

      return NextResponse.json(
        {
          success: true,
          status: "processing",
          queued: true,
        },
        { status: 202 },
      );
    } catch (error) {
      logger.error("API /feedback/process error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Internal Server Error",
        },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
);
