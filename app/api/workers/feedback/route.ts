import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { firestoreIdSchema } from "@/lib/schemas";
import { verifyQstashRequest } from "@/lib/server/qstash";
import { runFeedbackGeneration } from "@/lib/services/feedback-runner";

export const runtime = "nodejs";

export const maxDuration = 300;

const payloadSchema = z.object({
  interviewId: firestoreIdSchema,
  userId: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const verified = await verifyQstashRequest(req, "/api/workers/feedback");
    if (!verified.ok) return verified.response;

    let parsed: unknown;
    try {
      parsed = JSON.parse(verified.body);
    } catch {
      logger.error("Worker /api/workers/feedback: invalid JSON body");
      // Acknowledge invalid jobs to prevent retries.
      return NextResponse.json({ error: "Invalid JSON" }, { status: 200 });
    }

    const validation = payloadSchema.safeParse(parsed);
    if (!validation.success) {
      logger.error("Worker /api/workers/feedback: invalid payload", {
        issues: validation.error.issues,
      });
      // Acknowledge invalid jobs to prevent retries.
      return NextResponse.json({ error: "Invalid payload" }, { status: 200 });
    }

    const { interviewId, userId } = validation.data;

    logger.info(
      `Worker processing feedback for interview ${interviewId}, user ${userId}`,
    );

    // Queue messages contain identifiers only; load transcripts after verification.
    await runFeedbackGeneration(interviewId, userId);

    logger.audit("feedback.worker_completed", {
      userId,
      sessionId: interviewId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Worker /api/workers/feedback failed:", error);

    // A 500 response prompts QStash to retry the job.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
