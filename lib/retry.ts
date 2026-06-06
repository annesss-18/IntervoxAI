import { isAbortError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  operationName?: string;
  abortSignal?: AbortSignal;
}

/**
 * Retry transient failures with exponential backoff.
 *
 * Abort-aware: if the provided `abortSignal` fires, pending backoff waits
 * are cancelled immediately and an `AbortError` is thrown.
 */
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

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        );

        // Make the backoff wait abort-aware so retries stop immediately on cancellation.
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
