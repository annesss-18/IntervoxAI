// Share feedback generation between the QStash worker and the local after() fallback.

import { logger } from "@/lib/logger";
import {
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { InterviewService } from "@/lib/services/interview.service";

// Abort Gemini feedback generation if it runs too long.
const FEEDBACK_AI_TIMEOUT_MS = 2 * 60 * 1000;

// Run the full feedback pipeline and persist any terminal failure state.
export async function runFeedbackGeneration(
  interviewId: string,
  userId: string,
  transcript: TranscriptSentence[],
) {
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

    // Best-effort aggregate stats updates should not fail feedback generation.
    const totalScore = await (async () => {
      try {
        const fb = await InterviewService.getFeedbackByInterviewId({
          interviewId,
          userId,
        });
        return fb?.totalScore ?? null;
      } catch {
        return null;
      }
    })();

    const statsDelta = {
      activeDelta: -1,
      completedDelta: 1,
      ...(typeof totalScore === "number"
        ? { scoreDelta: totalScore, scoreCount: 1 }
        : {}),
    };
    UserRepository.updateStats(userId, statsDelta).catch((err) =>
      logger.warn(
        `Stats update failed after feedback for user ${userId}:`,
        err,
      ),
    );

    // Best-effort template score updates should not fail feedback generation.
    if (typeof totalScore === "number") {
      const session = await InterviewRepository.findById(interviewId);
      if (session?.templateId) {
        TemplateRepository.updateAvgScore(session.templateId, totalScore).catch(
          (err) =>
            logger.warn(
              `Template avgScore update failed for template ${session.templateId}:`,
              err,
            ),
        );
      }
    }
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

    // Re-throw so the worker can return 500 and trigger a retry.
    throw error;
  }
}
