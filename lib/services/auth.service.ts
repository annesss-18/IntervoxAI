import { auth } from "@/firebase/admin";
import { cookies } from "next/headers";
import {
  isUserAlreadyExistsError,
} from "@/lib/errors/auth.errors";
import { GoogleAuthParams, SignInParams, SignUpParams, User } from "@/types";
import { UserRepository } from "@/lib/repositories/user.repository";
import { logger } from "@/lib/logger";
import { googleAuthSchema, signInSchema, signUpSchema } from "@/lib/schemas";

const SESSION_EXPIRY = 60 * 60 * 24 * 5;

type VerifiedIdentity = {
  uid: string;
  email: string;
  name?: string;
  // R-12: Google profile photo URL from the ID token.
  picture?: string;
};

async function verifyIdentityToken(idToken: string): Promise<VerifiedIdentity> {
  try {
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const normalizedEmail = decodedToken.email?.trim().toLowerCase();

    if (!decodedToken.uid || !normalizedEmail) {
      throw new Error("Token missing required identity claims");
    }

    return {
      uid: decodedToken.uid,
      email: normalizedEmail,
      name: decodedToken.name?.trim(),
      // R-12: Extract avatar URL from the Google ID token.
      picture:
        typeof decodedToken.picture === "string"
          ? decodedToken.picture.trim()
          : undefined,
    };
  } catch (error) {
    logger.warn("Invalid ID token submitted for authentication", error);
    throw new Error("Invalid authentication token");
  }
}

function resolveDisplayName(
  providedName: string | undefined,
  tokenName: string | undefined,
  email: string,
): string {
  const candidate = providedName?.trim() || tokenName?.trim();
  if (candidate) return candidate;

  const localPart = email.split("@")[0]?.trim();
  return localPart || "User";
}

export const AuthService = {
  async signUp(params: SignUpParams) {
    const validation = signUpSchema.safeParse(params);
    if (!validation.success) {
      throw new Error("Invalid input data");
    }
    const { name, idToken } = validation.data;
    const identity = await verifyIdentityToken(idToken);
    const displayName = resolveDisplayName(name, identity.name, identity.email);

    await UserRepository.createTransactionally(identity.uid, {
      name: displayName,
      email: identity.email,
      ...(identity.picture ? { photoURL: identity.picture } : {}),
    });
    await this.setSessionCookie(idToken);

    return { success: true };
  },

  async signIn(params: SignInParams) {
    const validation = signInSchema.safeParse(params);
    if (!validation.success) {
      throw new Error("Invalid input data");
    }
    const { idToken } = validation.data;
    const identity = await verifyIdentityToken(idToken);

    // Ensure the account exists before issuing a session.
    const existingUser = await UserRepository.findById(identity.uid);
    if (!existingUser) {
      throw new Error("User not found");
    }

    await this.setSessionCookie(idToken);

    // R-12: Update photoURL on sign-in if it changed (e.g. user updated their Google avatar).
    if (identity.picture && existingUser.photoURL !== identity.picture) {
      UserRepository.updatePhotoURL(identity.uid, identity.picture).catch(
        (err) =>
          logger.warn(`photoURL update failed for user ${identity.uid}:`, err),
      );
    }

    return { success: true };
  },

  async setSessionCookie(idToken: string) {
    const cookieStore = await cookies();
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production";

    try {
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRY * 1000,
      });

      cookieStore.set("session", sessionCookie, {
        maxAge: SESSION_EXPIRY,
        httpOnly: true,
        secure: isProduction,
        path: "/",
        // Use SameSite=strict because Google OAuth finishes client-side before this cookie is set.
        sameSite: "strict",
      });
    } catch (error) {
      logger.error("Error setting session cookie:", error);
      throw new Error("Failed to create session");
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) return null;

    try {
      // Reject revoked or invalid sessions.
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      return await UserRepository.findById(decodedClaims.uid);
    } catch (error) {
      logger.error("Error verifying session cookie:", error);
      return null;
    }
  },

  async googleAuthenticate(params: GoogleAuthParams) {
    const validation = googleAuthSchema.safeParse(params);
    if (!validation.success) {
      throw new Error("Invalid input data");
    }
    const { name, idToken } = validation.data;
    const identity = await verifyIdentityToken(idToken);
    const displayName = resolveDisplayName(name, identity.name, identity.email);

    // Create user on first sign-in; continue if already provisioned.
    try {
      await UserRepository.createTransactionally(identity.uid, {
        name: displayName,
        email: identity.email,
        ...(identity.picture ? { photoURL: identity.picture } : {}),
      });
    } catch (e: unknown) {
      if (!isUserAlreadyExistsError(e)) {
        throw e;
      }
    }

    await this.setSessionCookie(idToken);
    return { success: true };
  },
};
