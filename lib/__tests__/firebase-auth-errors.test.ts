import { describe, expect, it } from "vitest";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase-auth-errors";

// Mirrors the real shape Firebase's client SDK throws.
function firebaseError(code: string, text = "Error"): Error & { code: string } {
  const err = new Error(`Firebase: ${text} (${code}).`) as Error & {
    code: string;
  };
  err.code = code;
  return err;
}

describe("getFirebaseAuthErrorMessage", () => {
  it("never surfaces the raw SDK string for a config-level error (the reported bug)", () => {
    const err = firebaseError(
      "auth/api-key-expired",
      "Error",
    );
    const message = getFirebaseAuthErrorMessage(err, "Failed to sign in");
    expect(message).not.toContain("Firebase:");
    expect(message).not.toContain("api-key-expired");
    expect(message).toBe(
      "Sign-in is temporarily unavailable. Please try again shortly.",
    );
  });

  it("does not tell the user to retry for other config-level errors either", () => {
    for (const code of [
      "auth/invalid-api-key",
      "auth/app-deleted",
      "auth/configuration-not-found",
    ]) {
      const message = getFirebaseAuthErrorMessage(
        firebaseError(code),
        "fallback",
      );
      expect(message).toBe(
        "Sign-in is temporarily unavailable. Please try again shortly.",
      );
    }
  });

  it("maps common user-facing auth codes to friendly text", () => {
    expect(
      getFirebaseAuthErrorMessage(firebaseError("auth/wrong-password"), "x"),
    ).toBe("Incorrect email or password.");
    expect(
      getFirebaseAuthErrorMessage(firebaseError("auth/user-not-found"), "x"),
    ).toBe("No account found with that email.");
    expect(
      getFirebaseAuthErrorMessage(
        firebaseError("auth/email-already-in-use"),
        "x",
      ),
    ).toContain("already exists");
    expect(
      getFirebaseAuthErrorMessage(firebaseError("auth/too-many-requests"), "x"),
    ).toContain("Too many attempts");
  });

  it("falls back to the provided message for an unrecognized Firebase code", () => {
    const message = getFirebaseAuthErrorMessage(
      firebaseError("auth/some-brand-new-code-we-have-never-seen"),
      "Failed to sign in",
    );
    expect(message).toBe("Failed to sign in");
  });

  it("surfaces our own server action's hand-written error messages as-is", () => {
    // lib/actions/auth.action.ts throws plain Errors with already-friendly
    // text and no Firebase error code — these should pass through, not be
    // replaced by the generic fallback.
    const err = new Error("That email is already registered.");
    expect(getFirebaseAuthErrorMessage(err, "fallback")).toBe(
      "That email is already registered.",
    );
  });

  it("falls back to the generic message for a raw, code-less Firebase-prefixed error", () => {
    const err = new Error("Firebase: Something internal broke.");
    expect(getFirebaseAuthErrorMessage(err, "Failed to sign in")).toBe(
      "Failed to sign in",
    );
  });

  it("falls back to the generic message for a completely non-Error thrown value", () => {
    expect(getFirebaseAuthErrorMessage("a string was thrown", "fallback")).toBe(
      "fallback",
    );
    expect(getFirebaseAuthErrorMessage(null, "fallback")).toBe("fallback");
    expect(getFirebaseAuthErrorMessage(undefined, "fallback")).toBe(
      "fallback",
    );
  });
});
