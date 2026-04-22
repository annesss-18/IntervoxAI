import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthClaims } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { firestoreIdSchema } from "@/lib/schemas";
import type { AuthClaims, FeedbackJobStatus } from "@/types";

const feedbackStatusQuerySchema = z.object({
  interviewId: firestoreIdSchema,
});

interface FeedbackStatusSnapshot {
  userId: string;
  status: FeedbackJobStatus;
  feedbackId: string | null;
  finalScore: number | null;
  error: string | null;
  requestedAt: string | null;
  processingAt: string | null;
  completedAt: string | null;
}

function resolveStatus(
  session: Awaited<ReturnType<typeof InterviewRepository.findStatusById>>,
): FeedbackStatusSnapshot | null {
  if (!session) return null;

  const status =
    typeof session.feedbackStatus === "string"
      ? (session.feedbackStatus as FeedbackJobStatus)
      : typeof session.feedbackId === "string" ||
          typeof session.finalScore === "number"
        ? "completed"
        : session.status === "completed"
          ? "pending"
          : "idle";

  return {
    userId: session.userId,
    status,
    feedbackId: session.feedbackId ?? null,
    finalScore: session.finalScore ?? null,
    error: session.feedbackError ?? null,
    requestedAt: session.feedbackRequestedAt ?? null,
    processingAt: session.feedbackProcessingAt ?? null,
    completedAt: session.feedbackCompletedAt ?? null,
  };
}

async function recoverCompletedStatus(
  interviewId: string,
  statusRecord: FeedbackStatusSnapshot,
): Promise<FeedbackStatusSnapshot> {
  const needsRecovery =
    statusRecord.status !== "completed" ||
    !statusRecord.feedbackId ||
    typeof statusRecord.finalScore !== "number";

  if (!needsRecovery) return statusRecord;

  const session = await InterviewRepository.findStatusById(interviewId);
  if (!session) return statusRecord;

  const sessionLooksCompleted =
    session.status === "completed" ||
    session.feedbackStatus === "completed" ||
    Boolean(session.feedbackId) ||
    typeof session.finalScore === "number";

  if (!sessionLooksCompleted) return statusRecord;

  let feedbackId = session.feedbackId ?? statusRecord.feedbackId ?? null;
  let finalScore =
    typeof session.finalScore === "number"
      ? session.finalScore
      : typeof statusRecord.finalScore === "number"
        ? statusRecord.finalScore
        : null;
  let completedAt =
    session.feedbackCompletedAt ??
    session.completedAt ??
    statusRecord.completedAt ??
    null;

  if (needsRecovery) {
    const feedback = await FeedbackRepository.findByInterviewId(
      interviewId,
      session.userId,
    );

    if (!feedback) return statusRecord;

    feedbackId = feedback.id;
    finalScore = feedback.totalScore;
    completedAt = completedAt ?? feedback.createdAt;
  }

  if (!feedbackId || finalScore === null) {
    return statusRecord;
  }

  const resolvedCompletedAt = completedAt ?? new Date().toISOString();
  const resolvedRequestedAt =
    session.feedbackRequestedAt ??
    statusRecord.requestedAt ??
    resolvedCompletedAt;
  const resolvedProcessingAt =
    session.feedbackProcessingAt ?? statusRecord.processingAt ?? null;

  const recovered: FeedbackStatusSnapshot = {
    userId: session.userId,
    status: "completed",
    feedbackId,
    finalScore,
    error: null,
    requestedAt: resolvedRequestedAt,
    processingAt: resolvedProcessingAt,
    completedAt: resolvedCompletedAt,
  };

  const needsSessionPatch =
    session.status !== "completed" ||
    session.feedbackStatus !== "completed" ||
    session.feedbackId !== feedbackId ||
    session.finalScore !== finalScore ||
    session.feedbackError !== null ||
    session.feedbackCompletedAt !== resolvedCompletedAt ||
    session.feedbackRequestedAt !== resolvedRequestedAt ||
    session.feedbackProcessingAt !== (resolvedProcessingAt ?? undefined);

  if (needsSessionPatch) {
    await InterviewRepository.update(interviewId, {
      status: "completed",
      completedAt: session.completedAt || resolvedCompletedAt,
      feedbackId,
      finalScore,
      feedbackStatus: "completed",
      feedbackError: null,
      feedbackRequestedAt: resolvedRequestedAt,
      feedbackCompletedAt: resolvedCompletedAt,
      ...(resolvedProcessingAt
        ? { feedbackProcessingAt: resolvedProcessingAt }
        : {}),
    });
  }

  return recovered;
}

export const GET = withAuthClaims(
  async (req: NextRequest, user: AuthClaims) => {
    try {
      const rawInterviewId = req.nextUrl.searchParams.get("interviewId") ?? "";
      const validation = feedbackStatusQuerySchema.safeParse({
        interviewId: rawInterviewId,
      });

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid query",
            details: validation.error.issues,
          },
          { status: 400 },
        );
      }

      const { interviewId } = validation.data;
      const session = await InterviewRepository.findStatusById(interviewId);
      const statusRecord = resolveStatus(session);

      if (!statusRecord) {
        return NextResponse.json(
          { error: "Interview session not found" },
          { status: 404 },
        );
      }

      if (statusRecord.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const resolvedStatus = await recoverCompletedStatus(
        interviewId,
        statusRecord,
      );

      const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
      if (
        resolvedStatus.status === "processing" &&
        resolvedStatus.processingAt
      ) {
        const processingStart = new Date(resolvedStatus.processingAt).getTime();
        if (Date.now() - processingStart > PROCESSING_TIMEOUT_MS) {
          logger.warn(
            `Feedback for session ${interviewId} stuck in processing for >5m, auto-recovering to failed`,
          );

          const failureMessage = "Processing timed out. Please try again.";
          await InterviewRepository.update(interviewId, {
            feedbackStatus: "failed",
            feedbackError: failureMessage,
          });

          return NextResponse.json({
            success: true,
            status: "failed",
            error: failureMessage,
          });
        }
      }

      return NextResponse.json({
        success: true,
        status: resolvedStatus.status,
        feedbackId: resolvedStatus.feedbackId ?? null,
        error:
          resolvedStatus.status === "failed"
            ? (resolvedStatus.error ?? "Feedback generation failed")
            : null,
      });
    } catch (error) {
      logger.error("API /feedback/status error:", error);
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
    maxRequests: 120,
    windowMs: 60 * 1000,
  },
);
