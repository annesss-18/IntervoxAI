import { isAbortError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  operationName?: string;
  abortSignal?: AbortSignal;
}

interface StatusLike {
  statusCode?: number;
  status?: number;
}

/**
 * Failures that will produce the identical result on retry — a malformed
 * schema response, a bad request, an auth problem — aren't worth paying
 * for again. Only transient failures (rate limits, timeouts, 5xx) retry.
 */
function isNonRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const name = error.name || "";
  if (
    name.includes("NoObjectGeneratedError") ||
    name.includes("TypeValidationError") ||
    name.includes("InvalidArgumentError") ||
    name.includes("InvalidPromptError")
  ) {
    return true;
  }

  const status =
    (error as StatusLike).statusCode ?? (error as StatusLike).status;
  if (typeof status === "number") {
    // 429 (rate limit) and 5xx are transient; other 4xx are not.
    return status >= 400 && status < 500 && status !== 429;
  }

  return false;
}

/** Retries transient failures with abort-aware exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    operationName = "operation",
    abortSignal,
  } = options;
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (abortSignal?.aborted) {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isAbortError(error) || abortSignal?.aborted) {
        throw error;
      }

      if (isNonRetryable(error)) {
        logger.warn(
          `${operationName} failed with a non-retryable error, not retrying: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        );

        // Stop waiting immediately when cancelled.
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          abortSignal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            },
            { once: true },
          );
        });
      }
    }
  }

  logger.error(`${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}
