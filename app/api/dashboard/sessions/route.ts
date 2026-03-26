import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { InterviewService } from "@/lib/services/interview.service";
import type { SessionStatusFilter, User } from "@/types";
import { z } from "zod";

const querySchema = z.object({
  cursor: z.string().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  status: z.enum(["active", "completed"]).optional(),
});

// GET /api/dashboard/sessions?cursor=<sessionId>&limit=20
// Returns a single page of session cards for the authenticated user.
export const GET = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const rawCursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
      const rawLimit = req.nextUrl.searchParams.get("limit") ?? undefined;
      const rawStatus = req.nextUrl.searchParams.get("status") ?? undefined;

      const validation = querySchema.safeParse({
        cursor: rawCursor,
        limit: rawLimit,
        status: rawStatus,
      });

      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid query", details: validation.error.issues },
          { status: 400 },
        );
      }

      const { cursor, limit, status } = validation.data;
      const page = await InterviewService.getUserSessionsPage(
        user.id,
        cursor,
        limit,
        status as SessionStatusFilter | undefined,
      );

      return NextResponse.json({
        success: true,
        sessions: page.sessions,
        nextCursor: page.nextCursor,
      });
    } catch (error) {
      logger.error("API /dashboard/sessions error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
);
