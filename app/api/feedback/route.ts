import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuthClaims } from "@/lib/server/api-middleware";
import { logger } from "@/lib/logger";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import {
  getStoredTranscriptTurnCount,
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import type { AuthClaims } from "@/types";
import {
  checkpointBaseSchema,
  firestoreIdSchema,
  transcriptAppendSchema,
  transcriptArraySchema,
} from "@/lib/schemas";
import { isQueueAvailable, publishFeedbackJob } from "@/lib/feedback-queue";
import { runFeedbackGeneration } from "@/lib/services/feedback-runner";

const feedbackQueueSchema = z
  .object({
    interviewId: firestoreIdSchema,
    transcript: transcriptArraySchema.optional(),
    transcriptAppend: transcriptAppendSchema.optional(),
    checkpointBase: checkpointBaseSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.transcript && !value.transcriptAppend) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transcript data is required",
        path: ["transcript"],
      });
    }

    if (value.transcriptAppend && value.checkpointBase === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "checkpointBase is required with transcriptAppend",
        path: ["checkpointBase"],
      });
    }
  });

function normalizeTranscript(transcript: TranscriptSentence[]) {
  return transcript
    .map((entry) => ({
      role: entry.role.trim().slice(0, 40),
      content: entry.content.replace(/\s+/g, " ").trim(),
    }))
    .filter((entry) => entry.content.length > 0);
}

type CompletionClaimResult =
  | { type: "missing" }
  | { type: "unauthorized" }
  | { type: "not_started" }
  | { type: "expired" }
  | { type: "already_processing" }
  | { type: "completed"; movedStats: boolean };

function completionClaimResponse(
  claim: CompletionClaimResult,
): NextResponse | null {
  if (claim.type === "completed") return null;

  if (claim.type === "missing") {
    return NextResponse.json(
      { error: "Interview session not found" },
      { status: 404 },
    );
  }

  if (claim.type === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (claim.type === "not_started") {
    return NextResponse.json(
      { error: "Interview session has not been started yet" },
      { status: 400 },
    );
  }

  if (claim.type === "expired") {
    return NextResponse.json(
      { error: "Interview session has expired" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      status: "processing",
      message: "Feedback is already being generated",
    },
    { status: 202 },
  );
}

async function claimCompletedSession(
  sessionRef: FirebaseFirestore.DocumentReference,
  userId: string,
  now: string,
  existingFeedback?: { id: string; totalScore: number } | null,
): Promise<CompletionClaimResult> {
  return db.runTransaction(async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);

    if (!sessionSnap.exists) {
      return { type: "missing" } as const;
    }

    const session = sessionSnap.data() ?? {};

    if (session.userId !== userId) {
      return { type: "unauthorized" } as const;
    }

    const currentStatus =
      typeof session.status === "string" ? session.status : undefined;
    const currentFeedbackStatus =
      typeof session.feedbackStatus === "string"
        ? session.feedbackStatus
        : undefined;

    if (currentStatus === "setup") {
      return { type: "not_started" } as const;
    }

    if (currentStatus === "expired") {
      return { type: "expired" } as const;
    }

    if (!existingFeedback && currentFeedbackStatus === "processing") {
      return { type: "already_processing" } as const;
    }

    const updateData: Record<string, unknown> = {
      status: "completed",
      completedAt:
        typeof session.completedAt === "string" ? session.completedAt : now,
      feedbackStatus: existingFeedback ? "completed" : "pending",
      feedbackError: null,
      feedbackRequestedAt:
        typeof session.feedbackRequestedAt === "string"
          ? session.feedbackRequestedAt
          : now,
    };

    if (existingFeedback) {
      updateData.feedbackId = existingFeedback.id;
      updateData.finalScore = existingFeedback.totalScore;
      updateData.feedbackCompletedAt = now;
    }

    transaction.update(sessionRef, updateData);

    return {
      type: "completed",
      movedStats: currentStatus === "active",
    } as const;
  });
}

async function appendFullTranscriptTail(
  sessionId: string,
  sessionData: Record<string, unknown>,
  transcript: TranscriptSentence[],
): Promise<number> {
  const normalizedTranscript = normalizeTranscript(transcript);
  let currentBase = getStoredTranscriptTurnCount(sessionData);

  if (normalizedTranscript.length <= currentBase) {
    return currentBase;
  }

  // Keep every Firestore chunk well below document-size limits.  The incoming
  // full transcript may be valid as an API payload but is never stored as a
  // single document.
  while (normalizedTranscript.length > currentBase) {
    const entries: TranscriptSentence[] = [];
    let characters = 0;
    for (const entry of normalizedTranscript.slice(currentBase)) {
      if (
        entries.length >= 100 ||
        (entries.length > 0 && characters + entry.content.length > 20_000)
      ) {
        break;
      }
      entries.push(entry);
      characters += entry.content.length;
    }

    if (entries.length === 0) {
      throw new Error("Transcript entry exceeds storage limits");
    }

    const appendResult = await InterviewRepository.appendTranscriptEntries(
      sessionId,
      entries,
      currentBase,
    );

    if (!appendResult.success) {
      if (appendResult.reason === "stale") {
        currentBase = appendResult.expectedBase ?? currentBase;
        continue;
      }
      throw new Error("Failed to persist transcript");
    }

    currentBase = appendResult.nextBase;
  }

  return currentBase;
}

async function appendExplicitTranscriptTail(
  sessionId: string,
  transcriptAppend: TranscriptSentence[],
  checkpointBase: number,
): Promise<number> {
  const appendResult = await InterviewRepository.appendTranscriptEntries(
    sessionId,
    normalizeTranscript(transcriptAppend),
    checkpointBase,
  );

  if (!appendResult.success) {
    if (appendResult.reason === "stale") {
      throw new Error(
        `Transcript checkpoint is out of date:${appendResult.expectedBase ?? 0}`,
      );
    }

    throw new Error("Failed to persist transcript");
  }

  return appendResult.nextBase;
}

export const POST = withAuthClaims(
  async (req: NextRequest, user: AuthClaims) => {
    try {
      const body = await req.json();
      const validation = feedbackQueueSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid input",
            details: validation.error.issues,
          },
          { status: 400 },
        );
      }

      const { interviewId, transcript, transcriptAppend, checkpointBase } =
        validation.data;

      // A serverless background callback is not a durable production queue.
      // Refuse to accept work that cannot be delivered reliably.
      if (process.env.NODE_ENV === "production" && !isQueueAvailable()) {
        return NextResponse.json(
          {
            error:
              "Feedback processing is temporarily unavailable. Please try again shortly.",
          },
          { status: 503 },
        );
      }

      const sessionRef = db.collection("interview_sessions").doc(interviewId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Interview session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data() ?? {};
      if (sessionData.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const currentStatus = sessionData.status;
      const currentFeedbackStatus = sessionData.feedbackStatus;

      if (currentStatus === "setup") {
        return NextResponse.json(
          { error: "Interview session has not been started yet" },
          { status: 400 },
        );
      }

      if (currentStatus === "expired") {
        return NextResponse.json(
          { error: "Interview session has expired" },
          { status: 409 },
        );
      }

      if (currentFeedbackStatus === "processing") {
        return NextResponse.json(
          {
            success: true,
            status: "processing",
            message: "Feedback is already being generated",
          },
          { status: 202 },
        );
      }

      const now = new Date().toISOString();
      const existingFeedback = await FeedbackRepository.findByInterviewId(
        interviewId,
        user.id,
      );

      if (existingFeedback) {
        const claim = await claimCompletedSession(
          sessionRef,
          user.id,
          now,
          existingFeedback,
        );
        if (claim.type !== "completed") {
          return completionClaimResponse(claim)!;
        }

        if (claim.movedStats) {
          UserRepository.updateStats(user.id, {
            activeDelta: -1,
            completedDelta: 1,
          }).catch((err) =>
            logger.warn(
              `Stats active-to-completed update failed for user ${user.id}:`,
              err,
            ),
          );
        }

        logger.audit("feedback.reused", {
          actorId: user.id,
          sessionId: interviewId,
          feedbackId: existingFeedback.id,
        });

        return NextResponse.json({
          success: true,
          queued: false,
          status: "completed",
          feedbackId: existingFeedback.id,
          reused: true,
        });
      }

      let storedTranscriptCount = getStoredTranscriptTurnCount(sessionData);

      if (transcriptAppend && checkpointBase !== undefined) {
        try {
          storedTranscriptCount = await appendExplicitTranscriptTail(
            interviewId,
            transcriptAppend,
            checkpointBase,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to persist transcript";
          if (message.startsWith("Transcript checkpoint is out of date:")) {
            return NextResponse.json(
              {
                error: "Transcript checkpoint is out of date",
                expectedBase: Number(message.split(":")[1] ?? 0),
              },
              { status: 409 },
            );
          }

          throw error;
        }
      } else if (transcript) {
        storedTranscriptCount = await appendFullTranscriptTail(
          interviewId,
          sessionData,
          transcript,
        );
      }

      if (storedTranscriptCount <= 0) {
        return NextResponse.json(
          {
            error: "Invalid input",
            details: [{ message: "Transcript cannot be empty" }],
          },
          { status: 400 },
        );
      }

      const claim = await claimCompletedSession(sessionRef, user.id, now);
      if (claim.type !== "completed") {
        return completionClaimResponse(claim)!;
      }

      // Move counters once when the session is definitively completed.
      if (claim.movedStats) {
        UserRepository.updateStats(user.id, {
          activeDelta: -1,
          completedDelta: 1,
        }).catch((err) =>
          logger.warn(
            `Stats active→completed update failed for user ${user.id}:`,
            err,
          ),
        );
      }

      logger.audit("feedback.queued", {
        actorId: user.id,
        sessionId: interviewId,
        transcriptTurns: storedTranscriptCount,
      });

      // Trigger durable feedback processing immediately.  The worker rehydrates
      // the transcript from Firestore rather than receiving it in the queue.
      if (storedTranscriptCount > 0) {
        await InterviewRepository.update(interviewId, {
          feedbackStatus: "processing",
          feedbackProcessingAt: now,
        });

        if (isQueueAvailable()) {
          try {
            await publishFeedbackJob({ interviewId, userId: user.id });
          } catch (queueError) {
            logger.error(
              `QStash publish failed for interview ${interviewId}; leaving job pending for retry:`,
              queueError,
            );
            await InterviewRepository.update(interviewId, {
              feedbackStatus: "pending",
              feedbackError:
                "Feedback delivery could not be queued. Please retry.",
            });
            return NextResponse.json(
              { error: "Feedback could not be queued. Please retry." },
              { status: 503 },
            );
          }
        } else {
          // Development-only convenience path.  Production is rejected above.
          after(async () => {
            await runFeedbackGeneration(interviewId, user.id);
          });
        }

        return NextResponse.json(
          {
            success: true,
            queued: true,
            status: "processing",
            queuedViaQStash: isQueueAvailable(),
          },
          { status: 202 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          queued: true,
          status: "pending",
        },
        { status: 202 },
      );
    } catch (error) {
      logger.error("API /feedback queue error:", error);
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
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
);
