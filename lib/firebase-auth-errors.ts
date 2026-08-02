// Map Firebase errors to safe user-facing messages.

/** Configuration errors require operator intervention. */
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

/** Returns a safe user-facing message for Firebase or server auth errors. */
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

  // Surface explicitly user-facing server action errors.
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
