import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuthClaims } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import {
  getStoredTranscriptTurnCount,
  InterviewRepository,
} from "@/lib/repositories/interview.repository";
import {
  isQueueAvailable,
  publishFeedbackJob,
} from "@/lib/queue/feedback-queue";
import { firestoreIdSchema } from "@/lib/schemas";
import { runFeedbackGeneration } from "@/lib/services/feedback-runner";
import type { AuthClaims, FeedbackJobStatus } from "@/types";

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
  | { type: "claimed" };

function inferFeedbackStatus(
  session: Record<string, unknown>,
): FeedbackJobStatus {
  if (typeof session.feedbackStatus === "string") {
    return session.feedbackStatus as FeedbackJobStatus;
  }

  if (
    typeof session.feedbackId === "string" ||
    typeof session.finalScore === "number"
  ) {
    return "completed";
  }

  return session.status === "completed" ? "pending" : "idle";
}

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

    const session = sessionSnap.data() ?? {};

    if (session.userId !== userId) {
      return { type: "unauthorized" } as const;
    }

    if (getStoredTranscriptTurnCount(session) <= 0) {
      return { type: "no_transcript" } as const;
    }

    const currentStatus = inferFeedbackStatus(session);

    if (currentStatus === "processing") {
      return { type: "already_processing" } as const;
    }

    if (currentStatus === "completed") {
      return {
        type: "already_completed",
        feedbackId:
          typeof session.feedbackId === "string" ? session.feedbackId : null,
      } as const;
    }

    if (!["idle", "pending", "failed", undefined].includes(currentStatus)) {
      return { type: "already_processing" } as const;
    }

    const now = new Date().toISOString();
    transaction.update(sessionRef, {
      feedbackStatus: "processing",
      feedbackError: null,
      feedbackProcessingAt: now,
      feedbackRequestedAt:
        typeof session.feedbackRequestedAt === "string"
          ? session.feedbackRequestedAt
          : now,
    });

    return { type: "claimed" } as const;
  });
}

export const POST = withAuthClaims(
  async (req: NextRequest, user: AuthClaims) => {
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

      const transcript = await InterviewRepository.findTranscriptById(interviewId);
      if (transcript.length === 0) {
        await InterviewRepository.update(interviewId, {
          feedbackStatus: "failed",
          feedbackError: "Transcript could not be reconstructed for feedback.",
        });

        return NextResponse.json(
          {
            success: false,
            error: "Transcript could not be reconstructed for feedback.",
          },
          { status: 500 },
        );
      }

      if (isQueueAvailable()) {
        try {
          const { messageId } = await publishFeedbackJob({
            interviewId,
            userId: user.id,
            transcript,
          });

          logger.info(
            `Feedback job queued via QStash: ${messageId} for interview ${interviewId}`,
          );
        } catch (queueError) {
          logger.error(
            `QStash publish failed for interview ${interviewId}, falling back to after():`,
            queueError,
          );

          after(async () => {
            await runFeedbackGeneration(interviewId, user.id, transcript);
          });
        }
      } else {
        after(async () => {
          await runFeedbackGeneration(interviewId, user.id, transcript);
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
