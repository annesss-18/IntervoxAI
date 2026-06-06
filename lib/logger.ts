/* eslint-disable no-console */

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";
const REDACTED = "[redacted]";
const SENSITIVE_KEY_PATTERN =
  /(^authorization$|cookie|credential|password|private[_-]?key|secret|^session$|session[_-]?cookie|signature|token|api[_-]?key)/i;
const MAX_LOG_DEPTH = 4;

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevelName = keyof typeof LOG_LEVELS;
const configuredLevel =
  (process.env.LOG_LEVEL?.toLowerCase() as LogLevelName) ||
  (isProduction ? "info" : "debug");
const currentLogLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;

    url.username = "";
    url.password = "";
    if (url.search) url.search = "?redacted";
    if (url.hash) url.hash = "#redacted";

    return url.toString();
  } catch {
    return value;
  }
}

function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactUrl(value);
  if (typeof value !== "object") return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactUrl(value.message),
      ...(isDevelopment ? { stack: value.stack } : {}),
    };
  }

  if (depth >= MAX_LOG_DEPTH) return "[truncated]";

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : sanitizeLogValue(nestedValue, depth + 1);
  }

  return sanitized;
}

function stringifyMessage(message: unknown): string {
  const sanitized = sanitizeLogValue(message);
  if (typeof sanitized === "string") return sanitized;

  try {
    return JSON.stringify(sanitized);
  } catch {
    return "[unserializable]";
  }
}

function emit(
  level: "debug" | "info" | "warn" | "error",
  args: unknown[],
): void {
  if (isProduction) {
    const [message, ...rest] = args;
    const entry: Record<string, unknown> = {
      level,
      message: stringifyMessage(message),
    };

    if (rest.length === 1) {
      const extra = rest[0];
      if (extra !== undefined) entry.context = sanitizeLogValue(extra);
    } else if (rest.length > 1) {
      entry.context = sanitizeLogValue(rest);
    }

    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else if (level === "info") console.info(line);
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    if (level === "error") console.error(prefix, ...args);
    else if (level === "warn") console.warn(prefix, ...args);
    else if (level === "info") console.info(prefix, ...args);
    else if (isDevelopment) console.debug(prefix, ...args);
  }
}

export const logger = {
  info: (...args: unknown[]) => {
    if (currentLogLevel <= LOG_LEVELS.info) emit("info", args);
  },

  debug: (...args: unknown[]) => {
    if (currentLogLevel <= LOG_LEVELS.debug) emit("debug", args);
  },

  warn: (...args: unknown[]) => {
    emit("warn", args);
  },

  error: (...args: unknown[]) => {
    emit("error", args);
  },

  audit: (event: string, context?: Record<string, unknown>) => {
    // Audit events always emit unconditionally with a distinct level label.
    const sanitized = context
      ? (sanitizeLogValue(context) as Record<string, unknown>)
      : {};
    const entry = { level: "audit", event, ...sanitized };
    console.info(JSON.stringify(entry));
  },
};
