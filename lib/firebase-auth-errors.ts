// Firebase's client SDK throws errors whose `.message` is formatted as
// `"Firebase: <text> (<error-code>)."` — e.g. exactly what showed up in a
// toast: "Firebase: Error (auth/api-key-expired.-please-renew-the-api-key.)."
// That's an internal SDK/infra string, not something a user can act on, and
// it leaks operational details (which specific credential is broken) to the
// public. This module maps known auth error codes to short, user-facing
// messages; call sites should always go through getFirebaseAuthErrorMessage()
// rather than reading `error.message` directly.

/**
 * Error codes that mean "this deployment is misconfigured," not "the user
 * did something wrong." Never suggest retrying — retrying cannot help until
 * an operator fixes the underlying credential/config, and telling the user
 * to "try again" for an error that will never resolve itself is worse than
 * a plain "unavailable" message.
 */
const CONFIG_ERROR_CODES = new Set([
  "auth/api-key-expired",
  "auth/api-key-not-valid",
  "auth/invalid-api-key",
  "auth/app-deleted",
  "auth/app-not-authorized",
  "auth/configuration-not-found",
  "auth/project-not-found",
]);

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-disabled":
    "This account has been disabled. Contact support if that seems wrong.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/email-already-in-use":
    "An account with that email already exists. Try signing in instead.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked":
    "Your browser blocked the sign-in popup. Please allow popups for this site and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
};

function extractFirebaseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * Turn any error thrown by the Firebase client SDK (or our own server
 * actions) into a short, user-facing message. Falls back to a generic
 * message for anything unrecognized — never forwards a raw SDK/error
 * string to the UI.
 */
export function getFirebaseAuthErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const code = extractFirebaseErrorCode(error);

  if (code && CONFIG_ERROR_CODES.has(code)) {
    return "Sign-in is temporarily unavailable. Please try again shortly.";
  }
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  // Our own server actions (lib/actions/auth.action.ts) throw plain Errors
  // with hand-written, already-user-facing messages (no Firebase "code"
  // field and no "Firebase:"-prefixed text) — those are safe to surface
  // as-is rather than falling back to the generic message.
  if (
    !code &&
    error instanceof Error &&
    error.message &&
    !error.message.startsWith("Firebase:")
  ) {
    return error.message;
  }

  return fallback;
}
