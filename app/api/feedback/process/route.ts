import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import {
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import {
  isQueueAvailable,
  publishFeedbackJob,
} from "@/lib/queue/feedback-queue";
import {
  firestoreIdSchema,
  transcriptArraySchema,
} from "@/lib/schemas";
import { runFeedbackGeneration } from "@/lib/services/feedback-runner";
import type { User } from "@/types";

export const runtime = "nodejs";

const processFeedbackSchema = z.object({
  interviewId: firestoreIdSchema,
});

type ClaimResult =
  | { type: "missing" }
  | { type: "unauthorized" }
  | { type: "no_transcript" }
  | { type: "already_processing" }
  | { type: "already_completed"; feedbackId: string | null }
  | { type: "claimed"; transcript: TranscriptSentence[] };

// Claim feedback work exactly once, even under concurrent requests or retries.
async function claimSession(
  interviewId: string,
  userId: string,
): Promise<ClaimResult> {
  return db.runTransaction(async (transaction) => {
    const sessionRef = db.collection("interview_sessions").doc(interviewId);
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists) {
      return { type: "missing" } as const;
    }

    const session = sessionSnap.data()!;

    if (session.userId !== userId) {
      return { type: "unauthorized" } as const;
    }

    const rawTranscript = session.transcript;
    if (!rawTranscript || !Array.isArray(rawTranscript)) {
      return { type: "no_transcript" } as const;
    }

    const parsed = transcriptArraySchema.safeParse(rawTranscript);
    if (!parsed.success) {
      return { type: "no_transcript" } as const;
    }

    const current = session.feedbackStatus;

    if (current === "processing") {
      return { type: "already_processing" } as const;
    }

    if (current === "completed") {
      return {
        type: "already_completed",
        feedbackId: session.feedbackId ?? null,
      } as const;
    }

    if (!["idle", "pending", "failed", undefined].includes(current)) {
      return { type: "already_processing" } as const;
    }

    const now = new Date().toISOString();
    transaction.update(sessionRef, {
      feedbackStatus: "processing",
      feedbackError: null,
      feedbackProcessingAt: now,
      feedbackRequestedAt: session.feedbackRequestedAt ?? now,
    });

    return { type: "claimed", transcript: parsed.data } as const;
  });
}

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json();
      const validation = processFeedbackSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid input",
            details: validation.error.issues,
          },
          { status: 400 },
        );
      }

      const { interviewId } = validation.data;
      const claim = await claimSession(interviewId, user.id);

      if (claim.type === "missing") {
        return NextResponse.json(
          { success: false, error: "Interview not found" },
          { status: 404 },
        );
      }

      if (claim.type === "unauthorized") {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 },
        );
      }

      if (claim.type === "no_transcript") {
        try {
          await InterviewRepository.update(interviewId, {
            feedbackStatus: "idle",
          });
        } catch {
          // Best effort rollback.
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "No transcript found. Complete the interview before requesting feedback.",
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

      // Queue durable work in production and fall back to after() locally.
      if (isQueueAvailable()) {
        try {
          const { messageId } = await publishFeedbackJob({
            interviewId,
            userId: user.id,
            transcript: claim.transcript,
          });

          logger.info(
            `Feedback job queued via QStash: ${messageId} for interview ${interviewId}`,
          );
        } catch (queueError) {
          logger.error(
            `QStash publish failed for interview ${interviewId}, falling back to after():`,
            queueError,
          );

          // Fall back to after() so the user does not need to retry manually.
          after(async () => {
            await runFeedbackGeneration(
              interviewId,
              user.id,
              claim.transcript,
            );
          });
        }
      } else {
        // Run after the response commits when QStash is unavailable.
        after(async () => {
          await runFeedbackGeneration(
            interviewId,
            user.id,
            claim.transcript,
          );
        });
      }

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
