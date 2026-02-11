"use server";

import { AuthService } from "@/lib/services/auth.service";
import { logger } from "../logger";
import { SignInParams, SignUpParams, User } from "@/types";
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
    if (e instanceof Error && e.message === "User already exists") {
      return {
        success: false,
        message: "Email already in use", // Mapping internal error to user-facing message
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
    cookieStore.delete("session");
    cookieStore.delete("session-refresh-needed");
    return { success: true };
  } catch (e) {
    logger.error("Error signing out:", e);
    return { success: false };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  return await AuthService.getCurrentUser();
}

export async function isAuthenticated() {
  const user = await AuthService.getCurrentUser();
  return !!user;
}

export async function googleAuthenticate(params: {
  uid: string;
  email: string;
  name: string;
  idToken: string;
}) {
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

export async function refreshSession(idToken: string) {
  try {
    await AuthService.setSessionCookie(idToken);
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete("session-refresh-needed");

    return {
      success: true,
      message: "Session refreshed successfully",
    };
  } catch (e: unknown) {
    logger.error("Error refreshing session:", e);
    return {
      success: false,
      message: "Failed to refresh session",
    };
  }
}
