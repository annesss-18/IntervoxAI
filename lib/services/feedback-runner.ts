import { isAbortError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { EmailService } from "@/lib/services/email.service";
import { InterviewService } from "@/lib/services/interview.service";

const FEEDBACK_AI_TIMEOUT_MS = 2 * 60 * 1000;

export async function runFeedbackGeneration(
  interviewId: string,
  userId: string,
  transcript?: TranscriptSentence[],
) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, FEEDBACK_AI_TIMEOUT_MS);

  try {
    const feedbackTranscript =
      transcript ?? (await InterviewRepository.findTranscriptById(interviewId));
    if (feedbackTranscript.length === 0) {
      throw new Error("Transcript could not be reconstructed for feedback.");
    }

    const result = await InterviewService.createFeedback(
      {
        interviewId,
        userId,
        transcript: feedbackTranscript,
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

    if (result.reused) {
      logger.info(
        `Feedback for session ${interviewId} was already generated (reused). Skipping stats/email.`,
      );
      return;
    }

    const totalScore = result.totalScore ?? null;
    const templateId = result.templateId ?? null;

    // Active/completed counters move when POST /api/feedback claims completion.
    const aggregateUpdates: Promise<void>[] = [];

    if (typeof totalScore === "number") {
      aggregateUpdates.push(
        UserRepository.updateStats(userId, {
          scoreDelta: totalScore,
          scoreCount: 1,
        }).catch((err) =>
          logger.warn(
            `Score stats update failed after feedback for user ${userId}:`,
            err,
          ),
        ),
      );
    }

    if (typeof totalScore === "number" && templateId) {
      aggregateUpdates.push(
        TemplateRepository.updateAvgScore(templateId, totalScore).catch((err) =>
          logger.warn(
            `Template avgScore update failed for template ${templateId}:`,
            err,
          ),
        ),
      );
    }
    await Promise.allSettled(aggregateUpdates);

    try {
      const [user, template] = await Promise.all([
        UserRepository.findById(userId),
        templateId
          ? TemplateRepository.findById(templateId)
          : Promise.resolve(null),
      ]);

      if (user?.email && typeof totalScore === "number") {
        await EmailService.sendFeedbackReady({
          toEmail: user.email,
          toName: user.name,
          sessionId: interviewId,
          score: totalScore,
          role: template?.role ?? "your interview",
          companyName: template?.companyName ?? "the company",
        });
      }
    } catch (emailError) {
      logger.warn(
        `Feedback-ready email failed for user ${userId} / session ${interviewId}:`,
        emailError,
      );
    }
  } catch (error) {
    clearTimeout(timeoutHandle);

    const isTimeout = isAbortError(error);

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

    throw error;
  }
}
