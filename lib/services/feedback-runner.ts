// Share feedback generation between the QStash worker and the local after() fallback.

import { logger } from "@/lib/logger";
import {
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { EmailService } from "@/lib/services/email.service";
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

    // Idempotency guard.
    // When feedback already existed (QStash retry or manual retry after a
    // successful first run), createFeedback() reconciled the session document
    // but the stats, template averages, and email were already applied on the
    // first pass. Skip all side-effects to avoid double-counting scores and
    // duplicate "feedback ready" emails.
    if (result.reused) {
      logger.info(
        `Feedback for session ${interviewId} was already generated (reused). Skipping stats/email.`,
      );
      return;
    }

    // createFeedback returns both values, so no extra Firestore reads are needed.
    const totalScore = result.totalScore ?? null;
    const templateId = result.templateId ?? null;

    // Best-effort aggregate updates. Await them so serverless runtimes do not
    // freeze before the dashboard counters and template score are persisted.
    const statsDelta = {
      activeDelta: -1,
      completedDelta: 1,
      ...(typeof totalScore === "number"
        ? { scoreDelta: totalScore, scoreCount: 1 }
        : {}),
    };
    const aggregateUpdates: Promise<void>[] = [
      UserRepository.updateStats(userId, statsDelta).catch((err) =>
        logger.warn(
          `Stats update failed after feedback for user ${userId}:`,
          err,
        ),
      ),
    ];

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

    // Best-effort feedback-ready email notification.
    // We need the user's email address and the template's role/company name.
    // Both are fetched in parallel to minimize latency. Failures are logged
    // but never propagate; a failed email must not roll back the generated
    // feedback.
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
      // Log but do not throw; email delivery is non-critical.
      logger.warn(
        `Feedback-ready email failed for user ${userId} / session ${interviewId}:`,
        emailError,
      );
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
