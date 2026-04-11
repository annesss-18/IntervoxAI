// Publish feedback jobs to QStash so retries and deduplication stay outside the request path.

import { Client } from "@upstash/qstash";
import { logger } from "@/lib/logger";

export interface FeedbackJobPayload {
  interviewId: string;
  userId: string;
  transcript: Array<{ role: string; content: string }>;
}

// Lazily create the QStash client only when the full worker handshake is configured.
let qstashClient: Client | null = null;

function hasQStashConfig(): boolean {
  return !!(
    process.env.QSTASH_TOKEN &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY
  );
}

function getQStashClient(): Client | null {
  if (!hasQStashConfig()) return null;
  if (!qstashClient) {
    qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });
  }
  return qstashClient;
}

// Report whether QStash is configured for durable background work.
export function isQueueAvailable(): boolean {
  return hasQStashConfig();
}

// Build the absolute worker URL for both production and local development.
function getWorkerUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/workers/feedback`;
}

// Publish a feedback job and let QStash retry failures on the worker endpoint.
export async function publishFeedbackJob(
  payload: FeedbackJobPayload,
): Promise<{ messageId: string }> {
  const client = getQStashClient();
  if (!client) {
    throw new Error(
      "QStash is not configured. Set QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, and QSTASH_NEXT_SIGNING_KEY.",
    );
  }

  const workerUrl = getWorkerUrl();

  logger.info(
    `Publishing feedback job for interview ${payload.interviewId} to QStash`,
  );

  const result = await client.publishJSON({
    url: workerUrl,
    body: payload,
    retries: 3,
    // Deduplicate repeated enqueue attempts for the same interview.
    deduplicationId: `feedback-${payload.interviewId}`,
  });

  logger.info(
    `QStash message published: ${result.messageId} for interview ${payload.interviewId}`,
  );

  return { messageId: result.messageId };
}
