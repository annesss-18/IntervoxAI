import { NextRequest, NextResponse } from "next/server";
import { withAuthClaims } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import type { AuthClaims, ScoreHistoryEntry } from "@/types";

// GET /api/dashboard/score-history — returns completed sessions with scores
// for rendering the score trend chart on the dashboard.
export const GET = withAuthClaims(
  async (_req: NextRequest, user: AuthClaims) => {
    try {
      const sessions = await InterviewRepository.findCompletedWithScores(
        user.id,
      );

      if (sessions.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // Batch-fetch all templates for the sessions
      const templateIds = [
        ...new Set(
          sessions
            .filter((session) => !session.templateSnapshot)
            .map((s) => s.templateId)
            .filter(Boolean),
        ),
      ];
      const templateMap =
        templateIds.length > 0
          ? await TemplateRepository.findManyByIds(templateIds)
          : new Map();

      const data: ScoreHistoryEntry[] = [];
      for (const session of sessions) {
        const template = session.templateSnapshot ?? templateMap.get(session.templateId);
        if (!template || session.finalScore == null) continue;
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
