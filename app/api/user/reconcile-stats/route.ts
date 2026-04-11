// Recompute the signed-in user's aggregate stats from source-of-truth session and feedback data.

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { UserRepository } from "@/lib/repositories/user.repository";
import type { User } from "@/types";

export const POST = withAuth(
  async (_req: NextRequest, user: User) => {
    try {
      const { activeCount, completedCount, scoreSum, scoreCount } =
        await UserRepository.reconcileStats(user.id);

      return NextResponse.json({
        success: true,
        stats: {
          activeCount,
          completedCount,
          scoreSum,
          scoreCount,
          avgScore:
            scoreCount > 0
              ? Math.round((scoreSum / scoreCount) * 10) / 10
              : null,
        },
      });
    } catch (error) {
      logger.error("Error reconciling user stats:", error);
      return NextResponse.json(
        { error: "Failed to reconcile stats" },
        { status: 500 },
      );
    }
  },
  {
    // Reconciliation is a low-frequency maintenance operation.
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
);
