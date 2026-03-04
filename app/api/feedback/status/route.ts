import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import type { User } from "@/types";
import type { FeedbackStatusResponse } from "@/lib/schemas/feedback-status.schema";
import { z } from "zod";
import { firestoreIdSchema } from "@/lib/schemas";

const feedbackStatusQuerySchema = z.object({
  interviewId: firestoreIdSchema,
});

function resolveFeedbackStatus(
  sessionStatus: string | undefined,
  feedbackStatus: string | undefined,
  hasTranscript: boolean,
): "idle" | "pending" | "processing" | "completed" | "failed" {
  if (
    feedbackStatus === "pending" ||
    feedbackStatus === "processing" ||
    feedbackStatus === "failed"
  ) {
    return feedbackStatus;
  }

  if (feedbackStatus === "completed") {
    return "completed";
  }

  if (sessionStatus === "completed" && hasTranscript) {
    return "pending";
  }

  return "idle";
}

export const GET = withAuth(
  async (req: NextRequest, user: User) => {
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
      const session = await InterviewRepository.findById(interviewId);

      if (!session) {
        return NextResponse.json(
          { error: "Interview session not found" },
          { status: 404 },
        );
      }

      if (session.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // M3: Auto-recover stuck "processing" state after 5 minutes.
      const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
      if (
        session.feedbackStatus === "processing" &&
        session.feedbackProcessingAt
      ) {
        const processingStart = new Date(
          session.feedbackProcessingAt,
        ).getTime();
        if (Date.now() - processingStart > PROCESSING_TIMEOUT_MS) {
          logger.warn(
            `Feedback for session ${interviewId} stuck in processing for >5m, auto-recovering to failed`,
          );
          InterviewRepository.update(interviewId, {
            feedbackStatus: "failed",
            feedbackError: "Processing timed out. Please try again.",
          }).catch((err) =>
            logger.warn(
              `Timeout recovery failed for interview ${interviewId}:`,
              err,
            ),
          );
          // Return the failed status immediately so the client can retry.
          return NextResponse.json({
            success: true,
            status: "failed",
            error: "Processing timed out. Please try again.",
          });
        }
      }

      const feedback = await FeedbackRepository.findByInterviewId(
        interviewId,
        user.id,
      );

      if (feedback) {
        if (
          session.feedbackStatus !== "completed" ||
          session.feedbackId !== feedback.id ||
          session.finalScore !== feedback.totalScore
        ) {
          // Best-effort metadata repair keeps session state aligned with feedback docs.
          InterviewRepository.update(interviewId, {
            status: "completed",
            completedAt: session.completedAt || new Date().toISOString(),
            feedbackStatus: "completed",
            feedbackError: null,
            feedbackCompletedAt:
              session.feedbackCompletedAt || new Date().toISOString(),
            feedbackId: feedback.id,
            finalScore: feedback.totalScore,
          }).catch((err) =>
            logger.warn(
              `Metadata repair failed for interview ${interviewId}:`,
              err,
            ),
          );
        }

        return NextResponse.json({
          success: true,
          status: "completed",
          feedbackId: feedback.id,
          error: null,
        });
      }

      const hasTranscript =
        Array.isArray(session.transcript) && session.transcript.length > 0;
      const status = resolveFeedbackStatus(
        session.status,
        session.feedbackStatus,
        hasTranscript,
      );

      return NextResponse.json({
        success: true,
        status,
        feedbackId: session.feedbackId || null,
        error:
          status === "failed"
            ? (session.feedbackError ?? "Feedback generation failed")
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
