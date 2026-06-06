import { Client } from "@upstash/qstash";
import { logger } from "@/lib/logger";

export interface FeedbackJobPayload {
  interviewId: string;
  userId: string;
  transcript: Array<{ role: string; content: string }>;
}

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

export function isQueueAvailable(): boolean {
  return hasQStashConfig();
}

function getWorkerUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL is required in production. " +
          "QStash needs an absolute callback URL to deliver feedback jobs. " +
          "Set NEXT_PUBLIC_APP_URL to the canonical URL of your deployment " +
          "(e.g. https://your-domain.com).",
      );
    }
    return "http://localhost:3000/api/workers/feedback";
  }

  return `${appUrl}/api/workers/feedback`;
}

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
