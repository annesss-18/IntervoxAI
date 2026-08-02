import { NextRequest, NextResponse } from "next/server";
import { withAuthClaims } from "@/lib/server/api-middleware";
import { logger } from "@/lib/logger";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import type { AuthClaims, ScoreHistoryEntry } from "@/types";

export const GET = withAuthClaims(
  async (_req: NextRequest, user: AuthClaims) => {
    try {
      const sessions = await InterviewRepository.findCompletedWithScores(
        user.id,
      );

      if (sessions.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const data: ScoreHistoryEntry[] = [];
      for (const session of sessions) {
        const template = session.templateSnapshot;
        if (!template?.role || session.finalScore == null) continue;
        data.push({
          sessionId: session.id,
          finalScore: session.finalScore,
          startedAt: session.startedAt,
          type: template.type as string,
          role: template.role,
          companyName: template.companyName || "Unknown Company",
        });
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      logger.error("API /dashboard/score-history error:", error);
      return NextResponse.json(
        { error: "Failed to fetch score history" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 30, windowMs: 60_000 },
);
