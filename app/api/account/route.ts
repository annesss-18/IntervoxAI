import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-middleware";
import { UserRepository } from "@/lib/repositories/user.repository";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

const nameSchema = z.object({
  name: z.string().min(2).max(100),
});

const deleteAccountSchema = z
  .object({
    confirmation: z.literal("DELETE"),
  })
  .strict();

// PATCH /api/account — update display name
export const PATCH = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json();
      const validation = nameSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid name", details: validation.error.issues },
          { status: 400 },
        );
      }

      await UserRepository.updateProfile(user.id, {
        name: validation.data.name,
      });

      logger.audit("account.profile_updated", { actorId: user.id });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("API PATCH /api/account error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 10, windowMs: 60_000 },
);

// DELETE /api/account — permanently delete account
export const DELETE = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json().catch(() => null);
      const validation = deleteAccountSchema.safeParse(body);

      if (!validation.success) {
        logger.warn(
          `Rejected account deletion without server confirmation for user ${user.id}`,
        );
        return NextResponse.json(
          { error: "Account deletion confirmation is required" },
          { status: 400 },
        );
      }

      try {
        await UserRepository.deleteAccount(user.id);
      } finally {
        // Always clear the session cookie, even on partial failure.
        // If deleteAccount() threw after auth.deleteUser() succeeded,
        // the cookie would remain valid for up to 5 days otherwise.
        const cookieStore = await cookies();
        cookieStore.delete("session");
      }

      logger.audit("account.deleted", { actorId: user.id });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("API DELETE /api/account error:", error);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 3, windowMs: 60_000 },
);
