/* eslint-disable no-console */

/**
 * Minimal structured logger.
 *
 * In production (NODE_ENV === "production"):
 *   - debug and info are suppressed to reduce log volume in serverless
 *     environments where every log line is billed / stored.
 *   - warn and error always emit so operational issues remain visible.
 *
 * In development (NODE_ENV === "development"):
 *   - All levels emit, prefixed with a level tag for easy grepping.
 *
 * Output format: plain text in development, JSON in production.
 * JSON output makes logs machine-parseable in Vercel, GCP, and similar
 * platforms that expect structured log lines.
 *
 * Usage:
 *   logger.info("Token generated", { sessionId });   // suppressed in prod
 *   logger.warn("Rate limit hit", { userId });        // always emits
 *   logger.error("DB write failed", error);           // always emits
 */

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

function emit(
  level: "debug" | "info" | "warn" | "error",
  args: unknown[],
): void {
  if (isProduction) {
    // Emit a single JSON line so structured log processors can parse it.
    // Errors receive special handling so the stack trace is preserved.
    const [message, ...rest] = args;
    const entry: Record<string, unknown> = {
      level,
      message: typeof message === "string" ? message : JSON.stringify(message),
    };

    if (rest.length === 1) {
      const extra = rest[0];
      if (extra instanceof Error) {
        entry.error = extra.message;
        entry.stack = extra.stack;
      } else if (extra && typeof extra === "object") {
        entry.context = extra;
      } else if (extra !== undefined) {
        entry.context = extra;
      }
    } else if (rest.length > 1) {
      entry.context = rest;
    }

    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    // info / debug are suppressed in production (see module docstring).
  } else {
    // Plain-text development output.
    const prefix = `[${level.toUpperCase()}]`;
    if (level === "error") console.error(prefix, ...args);
    else if (level === "warn") console.warn(prefix, ...args);
    else if (level === "info") console.info(prefix, ...args);
    else if (isDevelopment) console.debug(prefix, ...args);
  }
}

export const logger = {
  /** Verbose operational detail. Suppressed in production. */
  info: (...args: unknown[]) => {
    if (!isProduction) emit("info", args);
  },

  /** Low-level tracing. Only emits in development. */
  debug: (...args: unknown[]) => {
    if (isDevelopment) emit("debug", args);
  },

  /** Unexpected-but-recoverable conditions. Always emits. */
  warn: (...args: unknown[]) => {
    emit("warn", args);
  },

  /** Errors requiring attention. Always emits. */
  error: (...args: unknown[]) => {
    emit("error", args);
  },
};
