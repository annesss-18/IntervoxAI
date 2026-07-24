// Centralized environment-variable validation.
//
// Before this module existed, a misconfigured deployment only found out a
// variable was missing when a request first touched that specific feature
// (e.g. the first resume upload, the first feedback job, the first template
// generation) — each with its own inline check and error message scattered
// across lib/. This module collects every one of those checks in one place
// and runs them all at once at boot (see instrumentation.ts), so a bad
// deploy fails immediately and visibly instead of piecemeal, in production,
// hours or days later.
//
// Three tiers, matching how the rest of the codebase already treats these
// variables (see .env.example):
//   1. Always required — the app cannot do anything useful without these
//      (Firebase auth/DB, resume encryption). Missing any of these is a
//      hard error in every environment.
//   2. Required in production only — features that already have a
//      documented development fallback (APP_URL, Upstash rate limiting,
//      QStash queueing, the three Gemini feature keys/models). Hard error
//      in production; warning in development so a partial local setup
//      still boots.
//   3. Advisory — optional features that degrade gracefully when unset
//      (Resend email, Brandfetch logos). Warning only, never fatal.
import { z } from "zod";
import { parseEncryptionKey } from "@/lib/resume-crypto";
import { logger } from "@/lib/logger";

const alwaysRequiredSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "is required"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, "is required"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "is required"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "is required"),
  FIREBASE_PROJECT_ID: z.string().min(1, "is required"),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, "is required"),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1, "is required")
    .refine(
      (v) => v.includes("BEGIN") && v.includes("PRIVATE KEY"),
      "does not look like a PEM private key (missing a '-----BEGIN...PRIVATE KEY-----' marker) — check for a copy-paste error",
    ),
});

const productionRequiredSchema = z.object({
  APP_URL: z
    .string()
    .min(1, "is required in production")
    .url("must be a full URL, e.g. https://your-domain.com"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .min(1, "is required in production")
    .url("must be a full URL, e.g. https://your-domain.com"),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .min(1, "is required in production")
    .url("must be a full URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "is required in production"),
  QSTASH_TOKEN: z.string().min(1, "is required in production"),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1, "is required in production"),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1, "is required in production"),
  TEMPLATE_GENERATION_API_KEY: z.string().min(1, "is required in production"),
  TEMPLATE_GENERATION_MODEL: z.string().min(1, "is required in production"),
  LIVE_INTERVIEW_API_KEY: z.string().min(1, "is required in production"),
  LIVE_INTERVIEW_MODEL: z.string().min(1, "is required in production"),
  FEEDBACK_API_KEY: z.string().min(1, "is required in production"),
  FEEDBACK_MODEL: z.string().min(1, "is required in production"),
});

export interface EnvValidationResult {
  success: boolean;
  /** Fatal problems. Non-empty only when something in tier 1, or tier 2 in production, is missing/invalid. */
  errors: string[];
  /** Non-fatal problems: tier 2 outside production, and all of tier 3. */
  warnings: string[];
}

function issuesToMessages(issues: z.ZodIssue[]): string[] {
  return issues.map((issue) => `${issue.path.join(".")} ${issue.message}`);
}

/**
 * Runs every environment-variable check the codebase relies on and returns
 * a combined result. Pure with respect to the passed-in `env` (defaults to
 * `process.env`) so it can be unit tested with a fake env object — it does
 * not throw or log by itself; see assertValidEnv() for the boot-time
 * wrapper that does.
 */
export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = env.NODE_ENV === "production";

  const alwaysResult = alwaysRequiredSchema.safeParse(env);
  if (!alwaysResult.success) {
    errors.push(...issuesToMessages(alwaysResult.error.issues));
  }

  // RESUME_ENCRYPTION_KEY: reuse resume-crypto.ts's own parser for the
  // format check, so this can never drift from what
  // encryptResumeText()/decryptResumeText() actually accept. Checked
  // against the *passed-in* env (not resume-crypto's internal
  // process.env-reading, cached getEncryptionKey()), so this function
  // genuinely validates whatever `env` the caller gives it.
  const rawResumeKey = env.RESUME_ENCRYPTION_KEY;
  if (!rawResumeKey) {
    errors.push(
      "RESUME_ENCRYPTION_KEY is not set. This variable is required in all " +
        "environments. Generate one with: openssl rand -base64 32",
    );
  } else {
    try {
      parseEncryptionKey(rawResumeKey);
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "RESUME_ENCRYPTION_KEY is invalid",
      );
    }
  }

  const productionResult = productionRequiredSchema.safeParse(env);
  if (!productionResult.success) {
    const messages = issuesToMessages(productionResult.error.issues);
    if (isProduction) {
      errors.push(...messages);
    } else {
      warnings.push(
        ...messages.map((m) => `${m} (only checked in production for now)`),
      );
    }
  }

  const hasResendKey = Boolean(env.RESEND_API_KEY);
  const hasResendFrom = Boolean(env.RESEND_FROM_ADDRESS);
  if (hasResendKey !== hasResendFrom) {
    warnings.push(
      "Only one of RESEND_API_KEY / RESEND_FROM_ADDRESS is set — both are " +
        "required for feedback-ready emails to send; emails will be " +
        "silently skipped until both are set.",
    );
  }

  if (!env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID) {
    warnings.push(
      "NEXT_PUBLIC_BRANDFETCH_CLIENT_ID is not set — company logos will " +
        "not resolve on template cards.",
    );
  }

  return { success: errors.length === 0, errors, warnings };
}

/**
 * Boot-time entry point: logs every warning, and throws a single
 * consolidated error (logged first) if anything fatal is missing. Intended
 * to be called once from instrumentation.ts's register(), which Next.js
 * runs before the server accepts requests — see
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export function assertValidEnv(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateEnv(env);

  for (const warning of result.warnings) {
    logger.warn(`[env] ${warning}`);
  }

  if (!result.success) {
    const message =
      `Invalid or missing environment variables (${result.errors.length}):\n` +
      result.errors.map((e) => `  - ${e}`).join("\n") +
      "\n\nSee .env.example for the full list and setup notes.";
    logger.error(`[env] ${message}`);
    throw new Error(message);
  }
}
