// Recompute the signed-in user's aggregate stats from source-of-truth session and feedback data.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

export const POST = withAuth(
  async (_req: NextRequest, user: User) => {
    try {
      // Read all sessions because reconciliation needs finalScore data.
      const sessionsSnapshot = await db
        .collection("interview_sessions")
        .where("userId", "==", user.id)
        .get();

      let activeCount = 0;
      let completedCount = 0;
      let scoreSum = 0;
      let scoreCount = 0;

      sessionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "completed") {
          completedCount++;
          if (typeof data.finalScore === "number") {
            scoreSum += data.finalScore;
            scoreCount++;
          }
        } else {
          activeCount++;
        }
      });

      const reconciledStats = {
        "stats.activeCount": activeCount,
        "stats.completedCount": completedCount,
        "stats.scoreSum": scoreSum,
        "stats.scoreCount": scoreCount,
      };

      await db.collection("users").doc(user.id).update(reconciledStats);

      logger.info(
        `Reconciled stats for user ${user.id}: active=${activeCount}, completed=${completedCount}, scoreSum=${scoreSum}, scoreCount=${scoreCount}`,
      );

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
