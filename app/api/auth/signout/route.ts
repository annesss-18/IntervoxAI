import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { auth as adminAuth } from "@/firebase/admin";
import { logger } from "@/lib/logger";

export const POST = withRateLimit(
  async () => {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session")?.value;

      // Best-effort revocation of Firebase refresh tokens.
      if (sessionCookie) {
        try {
          // FIX F-009: Added `true` (checkRevoked) to match the behaviour of
          // getCurrentUser() in auth.service.ts. Without it, a cookie that has
          // already been revoked is still accepted here, leading to a redundant
          // revokeRefreshTokens call and inconsistency across auth paths.
          const decoded = await adminAuth.verifySessionCookie(
            sessionCookie,
            true,
          );
          await adminAuth.revokeRefreshTokens(decoded.uid);
        } catch {
          // Continue with cookie deletion even if revocation fails
          // (e.g. cookie was already revoked or expired).
        }
      }

      cookieStore.delete("session");
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Sign out error:", error);
      return NextResponse.json(
        { error: "Failed to sign out" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
);
