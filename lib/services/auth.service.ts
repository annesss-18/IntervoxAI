import { auth } from "@/firebase/admin";
import { cookies } from "next/headers";
import { GoogleAuthParams, SignInParams, SignUpParams, User } from "@/types";
import { UserRepository } from "@/lib/repositories/user.repository";
import { logger } from "@/lib/logger";
import { googleAuthSchema, signInSchema, signUpSchema } from "@/lib/schemas";

const SESSION_EXPIRY = 60 * 60 * 24 * 5;

type VerifiedIdentity = {
  uid: string;
  email: string;
  name?: string;
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
        // F-006 FIX: changed from 'lax' to 'strict'.
        // 'strict' ensures the cookie is never sent on any cross-site request,
        // eliminating cross-site navigation CSRF vectors.
        // Google OAuth is handled entirely client-side via the Firebase JS SDK,
        // so this does not break the Google sign-in flow: the cookie is set after
        // the OAuth redirect completes and the client POSTs an idToken to our
        // Server Action on a same-origin request.
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
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "User already exists") {
      } else {
        throw e;
      }
    }

    await this.setSessionCookie(idToken);
    return { success: true };
  },
};
