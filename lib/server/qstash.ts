import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

let receiver: Receiver | null = null;

function getQstashReceiver(): Receiver | null {
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

export type QstashVerificationResult =
  | { ok: true; body: string }
  | { ok: false; response: NextResponse };

export async function verifyQstashRequest(
  req: NextRequest,
  workerName: string,
): Promise<QstashVerificationResult> {
  const qstashReceiver = getQstashReceiver();
  if (!qstashReceiver) {
    logger.error(
      `Worker ${workerName} called but QStash signing keys are not configured`,
    );
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Worker not configured" },
        { status: 500 },
      ),
    };
  }

  const body = await req.text();
  const signature = req.headers.get("upstash-signature");

  if (!signature) {
    logger.warn(`Worker ${workerName}: missing upstash-signature header`);
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const isValid = await qstashReceiver
    .verify({ body, signature })
    .catch(() => false);

  if (!isValid) {
    logger.warn(`Worker ${workerName}: invalid QStash signature`);
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, body };
}
