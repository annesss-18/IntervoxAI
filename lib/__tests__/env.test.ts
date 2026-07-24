import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env";

// A syntactically valid 32-byte key, matching what
// `openssl rand -base64 32` produces — same format resume-crypto.ts expects.
const VALID_RESUME_KEY = randomBytes(32).toString("base64");

function validDevEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "development",
    NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "fake.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "fake-project",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "fake-project.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789012",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789012:web:abcdef",
    FIREBASE_PROJECT_ID: "fake-project",
    FIREBASE_CLIENT_EMAIL: "sdk@fake-project.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY:
      "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n",
    RESUME_ENCRYPTION_KEY: VALID_RESUME_KEY,
  };
}

function validProductionEnv(): NodeJS.ProcessEnv {
  return {
    ...validDevEnv(),
    NODE_ENV: "production",
    APP_URL: "https://example.com",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    UPSTASH_REDIS_REST_URL: "https://fake.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "fake-token",
    QSTASH_TOKEN: "fake-qstash-token",
    QSTASH_CURRENT_SIGNING_KEY: "fake-current-key",
    QSTASH_NEXT_SIGNING_KEY: "fake-next-key",
    TEMPLATE_GENERATION_API_KEY: "fake-key",
    TEMPLATE_GENERATION_MODEL: "gemini-2.5-pro",
    LIVE_INTERVIEW_API_KEY: "fake-key",
    LIVE_INTERVIEW_MODEL: "gemini-live-2.5-flash-native-audio",
    FEEDBACK_API_KEY: "fake-key",
    FEEDBACK_MODEL: "gemini-2.5-pro",
    RESEND_API_KEY: "fake-resend-key",
    RESEND_FROM_ADDRESS: "IntervoxAI <noreply@example.com>",
    NEXT_PUBLIC_BRANDFETCH_CLIENT_ID: "fake-client-id",
  };
}

describe("validateEnv", () => {
  it("succeeds for a complete, valid development env", () => {
    const result = validateEnv(validDevEnv());
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("succeeds for a complete, valid production env with zero warnings", () => {
    const result = validateEnv(validProductionEnv());
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("warns (does not error) about missing production-tier vars in development", () => {
    const env = validDevEnv(); // no APP_URL, Upstash, QStash, Gemini keys
    const result = validateEnv(env);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("APP_URL"))).toBe(true);
    expect(
      result.warnings.some((w) => w.includes("TEMPLATE_GENERATION_API_KEY")),
    ).toBe(true);
  });

  it("errors on missing production-tier vars in production", () => {
    const env = { ...validDevEnv(), NODE_ENV: "production" as const };
    const result = validateEnv(env);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("APP_URL"))).toBe(true);
    expect(
      result.errors.some((e) => e.includes("UPSTASH_REDIS_REST_URL")),
    ).toBe(true);
  });

  it("errors when a core Firebase var is missing, in every environment", () => {
    const devEnv = validDevEnv();
    delete devEnv.FIREBASE_CLIENT_EMAIL;
    expect(validateEnv(devEnv).success).toBe(false);

    const prodEnv = validProductionEnv();
    delete prodEnv.FIREBASE_CLIENT_EMAIL;
    const prodResult = validateEnv(prodEnv);
    expect(prodResult.success).toBe(false);
    expect(
      prodResult.errors.some((e) => e.includes("FIREBASE_CLIENT_EMAIL")),
    ).toBe(true);
  });

  it("errors when FIREBASE_PRIVATE_KEY doesn't look like a PEM key", () => {
    const env = validDevEnv();
    env.FIREBASE_PRIVATE_KEY = "not-a-real-key";
    const result = validateEnv(env);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("FIREBASE_PRIVATE_KEY"))).toBe(
      true,
    );
  });

  it("errors when RESUME_ENCRYPTION_KEY is missing, reusing resume-crypto's own message", () => {
    const env = validDevEnv();
    delete env.RESUME_ENCRYPTION_KEY;
    const result = validateEnv(env);
    expect(result.success).toBe(false);
    expect(
      result.errors.some((e) => e.includes("RESUME_ENCRYPTION_KEY is not set")),
    ).toBe(true);
  });

  it("errors when RESUME_ENCRYPTION_KEY has the wrong format", () => {
    const env = validDevEnv();
    env.RESUME_ENCRYPTION_KEY = "too-short";
    const result = validateEnv(env);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("32-byte key"))).toBe(true);
  });

  it("warns when only one of RESEND_API_KEY / RESEND_FROM_ADDRESS is set", () => {
    const env = validDevEnv();
    env.RESEND_API_KEY = "fake-key-only";
    const result = validateEnv(env);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("RESEND"))).toBe(true);
  });

  it("does not warn about Resend when both or neither are set", () => {
    const neitherSet = validateEnv(validDevEnv());
    expect(neitherSet.warnings.some((w) => w.includes("RESEND"))).toBe(false);

    const bothSet = validateEnv({
      ...validDevEnv(),
      RESEND_API_KEY: "k",
      RESEND_FROM_ADDRESS: "a@b.com",
    });
    expect(bothSet.warnings.some((w) => w.includes("RESEND"))).toBe(false);
  });

  it("warns (never errors) when NEXT_PUBLIC_BRANDFETCH_CLIENT_ID is missing", () => {
    const result = validateEnv(validDevEnv());
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("BRANDFETCH"))).toBe(true);
  });
});
