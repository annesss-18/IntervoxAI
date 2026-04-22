// Process QStash-signed feedback jobs with retry semantics controlled by the response code.

import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { firestoreIdSchema, transcriptArraySchema } from "@/lib/schemas";
import { runFeedbackGeneration } from "@/lib/services/feedback-runner";

export const runtime = "nodejs";

// FIX: Increased from 180 to 300 seconds.
//
// Budget breakdown:
//   • FEEDBACK_AI_TIMEOUT_MS in feedback-runner.ts = 120 s (outer AbortController
//     that caps all retry attempts combined, not each individual attempt)
//   • withRetry backoff overhead (1 s + 2 s between up to 3 attempts) = ~3 s
//   • Post-generation work (stats, template avg, email) = ~10 s worst-case
//   • QStash signature verification + Firestore reads = ~2 s
//   Total ceiling: ~135 s
//
// 300 s gives ~165 s of headroom for slow Gemini responses, network jitter,
// and cold-start latency — well within the Vercel Pro function limit.
export const maxDuration = 300;

const payloadSchema = z.object({
  interviewId: firestoreIdSchema,
  userId: z.string().min(1).max(128),
  transcript: transcriptArraySchema,
});

// Lazily create the receiver used for QStash signature verification.
let receiver: Receiver | null = null;

function getReceiver(): Receiver | null {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey || !nextKey) return null;

  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });
  }

  return receiver;
}

export async function POST(req: NextRequest) {
  try {
    // Verify the request before processing any queued work.
    const qstashReceiver = getReceiver();
    if (!qstashReceiver) {
      logger.error(
        "Worker /api/workers/feedback called but QStash signing keys are not configured",
      );
      return NextResponse.json(
        { error: "Worker not configured" },
        { status: 500 },
      );
    }

    const body = await req.text();
    const signature = req.headers.get("upstash-signature");

    if (!signature) {
      logger.warn("Worker /api/workers/feedback: missing signature header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isValid = await qstashReceiver
      .verify({ body, signature })
      .catch(() => false);

    if (!isValid) {
      logger.warn("Worker /api/workers/feedback: invalid signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the worker payload.
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      logger.error("Worker /api/workers/feedback: invalid JSON body");
      // Malformed payloads are not retryable.
      return NextResponse.json({ error: "Invalid JSON" }, { status: 200 });
    }

    const validation = payloadSchema.safeParse(parsed);
    if (!validation.success) {
      logger.error("Worker /api/workers/feedback: invalid payload", {
        issues: validation.error.issues,
      });
      // Schema errors are not retryable.
      return NextResponse.json({ error: "Invalid payload" }, { status: 200 });
    }

    const { interviewId, userId, transcript } = validation.data;

    logger.info(
      `Worker processing feedback for interview ${interviewId}, user ${userId}`,
    );

    // Run the shared feedback pipeline.
    await runFeedbackGeneration(interviewId, userId, transcript);

    logger.info(`Worker completed feedback for interview ${interviewId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Worker /api/workers/feedback failed:", error);

    // Returning 500 tells QStash to retry the job.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
