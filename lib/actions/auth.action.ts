"use server";

import { UserAlreadyExistsError } from "@/lib/errors/auth.errors";
import { AuthService } from "@/lib/services/auth.service";
import { logger } from "../logger";
import { GoogleAuthParams, SignInParams, SignUpParams, User } from "@/types";
import { cookies } from "next/headers";

export async function signUp(params: SignUpParams) {
  try {
    await AuthService.signUp(params);

    return {
      success: true,
      message: "Account created successfully",
    };
  } catch (e: unknown) {
    logger.error("Error signing up user:", e);
    if (e instanceof UserAlreadyExistsError) {
      return {
        success: false,
        message: "Email already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account",
    };
  }
}

export async function signIn(params: SignInParams) {
  try {
    await AuthService.signIn(params);

    return {
      success: true,
      message: "Signed in successfully",
    };
  } catch (e: unknown) {
    logger.error("Error signing in user:", e);

    if (e instanceof Error && e.message === "User not found") {
      return {
        success: false,
        message: "User not found. Please sign up first.",
      };
    }

    return {
      success: false,
      message: "Failed to sign in. Please try again.",
    };
  }
}

export async function signOut() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    // Revoke the Firebase refresh tokens to fully invalidate the session.
    if (sessionCookie) {
      try {
        const { auth: adminAuth } = await import("@/firebase/admin");
        // Match getCurrentUser() by checking revocation before revoking refresh tokens.
        const decodedClaims = await adminAuth.verifySessionCookie(
          sessionCookie,
          true,
        );
        await adminAuth.revokeRefreshTokens(decodedClaims.uid);
      } catch (revokeError) {
        // Continue deleting the cookie even if token revocation fails.
        logger.warn(
          "Failed to revoke refresh tokens during signOut:",
          revokeError,
        );
      }
    }

    cookieStore.delete("session");
    return { success: true };
  } catch (e) {
    logger.error("Error signing out:", e);
    return { success: false };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  return await AuthService.getCurrentUser();
}

export async function googleAuthenticate(params: GoogleAuthParams) {
  try {
    await AuthService.googleAuthenticate(params);
    return {
      success: true,
      message: "Signed in successfully",
    };
  } catch (e: unknown) {
    logger.error("Error authenticating with Google:", e);
    return {
      success: false,
      message: "Failed to authenticate with Google",
    };
  }
}
