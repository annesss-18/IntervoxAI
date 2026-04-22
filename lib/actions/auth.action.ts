"use server";

import { headers } from "next/headers";
import { UserAlreadyExistsError } from "@/lib/errors/auth.errors";
import { checkRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { AuthService } from "@/lib/services/auth.service";
import {
  MAINTENANCE_BYPASS,
  DEMO_USER,
  DEMO_CLAIMS,
} from "@/lib/maintenance-bypass";
import { logger } from "../logger";
import {
  AuthClaims,
  GoogleAuthParams,
  SignInParams,
  SignUpParams,
  User,
} from "@/types";

const AUTH_ACTION_WINDOW_MS = 60_000;

type HeaderReader = {
  get(name: string): string | null;
};

function getClientIp(headerList: HeaderReader): string {
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "unknown";
}

async function isAuthActionAllowed(
  scope: string,
  config: RateLimitConfig,
): Promise<boolean> {
  const headerList = await headers();
  const ip = getClientIp(headerList);
  const result = await checkRateLimit(`auth-action:${scope}:${ip}`, config);

  if (!result.allowed) {
    logger.warn(`Rate limit exceeded for auth action ${scope} from IP ${ip}`);
  }

  return result.allowed;
}

export async function signUp(params: SignUpParams) {
  try {
    const allowed = await isAuthActionAllowed("sign-up", {
      maxRequests: 5,
      windowMs: AUTH_ACTION_WINDOW_MS,
    });
    if (!allowed) {
      return {
        success: false,
        message: "Too many attempts. Please try again later.",
      };
    }

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
    const allowed = await isAuthActionAllowed("sign-in", {
      maxRequests: 20,
      windowMs: AUTH_ACTION_WINDOW_MS,
    });
    if (!allowed) {
      return {
        success: false,
        message: "Too many attempts. Please try again later.",
      };
    }

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

export async function getCurrentUser(): Promise<User | null> {
  // TODO: Remove maintenance bypass after env rotation is complete.
  if (MAINTENANCE_BYPASS) return DEMO_USER;
  return await AuthService.getCurrentUser();
}

export async function getCurrentUserClaims(): Promise<AuthClaims | null> {
  // TODO: Remove maintenance bypass after env rotation is complete.
  if (MAINTENANCE_BYPASS) return DEMO_CLAIMS;
  return await AuthService.getCurrentUserClaims();
}

export async function googleAuthenticate(params: GoogleAuthParams) {
  try {
    const allowed = await isAuthActionAllowed("google-auth", {
      maxRequests: 20,
      windowMs: AUTH_ACTION_WINDOW_MS,
    });
    if (!allowed) {
      return {
        success: false,
        message: "Too many attempts. Please try again later.",
      };
    }

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
