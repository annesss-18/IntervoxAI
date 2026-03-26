// Validate critical production env vars before the app handles requests.
const REQUIRED_PRODUCTION_VARS: ReadonlyArray<{ key: string; hint: string }> = [
  {
    key: "FIREBASE_PROJECT_ID",
    hint: "Firebase Admin SDK project ID",
  },
  {
    key: "FIREBASE_CLIENT_EMAIL",
    hint: "Firebase Admin SDK service account email",
  },
  {
    key: "FIREBASE_PRIVATE_KEY",
    hint: "Firebase Admin SDK private key (keep \\n escapes)",
  },
  {
    key: "TEMPLATE_GENERATION_API_KEY",
    hint: "Gemini API key for template generation",
  },
  {
    key: "LIVE_INTERVIEW_API_KEY",
    hint: "Gemini API key for live audio interviews",
  },
  {
    key: "FEEDBACK_API_KEY",
    hint: "Gemini API key for feedback processing",
  },
  {
    key: "RESUME_ENCRYPTION_KEY",
    hint: "32-byte resume encryption key",
  },
  {
    key: "UPSTASH_REDIS_REST_URL",
    hint: "Upstash Redis URL for distributed rate limiting",
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    hint: "Upstash Redis auth token",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    hint: "Canonical app URL for CSRF origin validation",
  },
];

let checked = false;

export function assertProductionEnv(): void {
  if (checked || process.env.NODE_ENV !== "production") return;
  checked = true;

  const missing = REQUIRED_PRODUCTION_VARS.filter(
    ({ key }) => !process.env[key],
  );

  if (missing.length === 0) return;

  const details = missing
    .map(({ key, hint }) => `  - ${key}: ${hint}`)
    .join("\n");

  throw new Error(
    `[startup-checks] Missing required production environment variables:\n${details}\n\n` +
      "Set these values before deploying. See .env.example for reference.",
  );
}
