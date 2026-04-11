import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuthClaims } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import {
  getStoredTranscriptTurnCount,
  InterviewRepository,
  TranscriptSentence,
} from "@/lib/repositories/interview.repository";
import type { AuthClaims } from "@/types";
import {
  checkpointBaseSchema,
  firestoreIdSchema,
  transcriptAppendSchema,
  transcriptArraySchema,
} from "@/lib/schemas";

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

  let appendResult = await InterviewRepository.appendTranscriptEntries(
    sessionId,
    normalizedTranscript.slice(currentBase),
    currentBase,
  );

  if (!appendResult.success && appendResult.reason === "stale") {
    currentBase = appendResult.expectedBase ?? currentBase;
    if (normalizedTranscript.length <= currentBase) {
      return currentBase;
    }

    appendResult = await InterviewRepository.appendTranscriptEntries(
      sessionId,
      normalizedTranscript.slice(currentBase),
      currentBase,
    );
  }

  if (!appendResult.success) {
    throw new Error("Failed to persist transcript");
  }

  return appendResult.nextBase;
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
        await sessionRef.update({
          status: "completed",
          completedAt: sessionData.completedAt || now,
          feedbackId: existingFeedback.id,
          finalScore: existingFeedback.totalScore,
          feedbackStatus: "completed",
          feedbackError: null,
          feedbackRequestedAt: sessionData.feedbackRequestedAt || now,
          feedbackCompletedAt: now,
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
            error instanceof Error ? error.message : "Failed to persist transcript";
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

      await sessionRef.update({
        status: "completed",
        completedAt: sessionData.completedAt || now,
        feedbackStatus: "pending",
        feedbackError: null,
        feedbackRequestedAt: now,
      });

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
