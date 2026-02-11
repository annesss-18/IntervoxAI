// app/api/interview/session/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { decryptResumeText, encryptResumeText } from "@/lib/resume-crypto";
import type { User } from "@/types";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

// Maximum resume text length
const MAX_RESUME_LENGTH = 5000;

// PATCH - Update session (e.g., add resume text)
export const PATCH = withAuth(
  async (req: NextRequest, user: User, context: RouteContext) => {
    try {
      const { sessionId } = await context.params;

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID is required" },
          { status: 400 },
        );
      }

      const body = await req.json();
      const { resumeText, status } = body;

      // Get session document
      const sessionRef = db.collection("interview_sessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data();

      // Verify user owns this session
      if (sessionData?.userId !== user.id) {
        logger.warn(
          `Unauthorized session update attempt: user ${user.id} tried to update session ${sessionId}`,
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // Build update object
      const updateData: Record<string, unknown> = {};

      if (resumeText !== undefined) {
        if (sessionData?.status !== "setup") {
          return NextResponse.json(
            { error: "Resume cannot be modified after interview starts" },
            { status: 400 },
          );
        }
        // Allow empty string to clear resume
        updateData.resumeText = resumeText
          ? encryptResumeText(String(resumeText).slice(0, MAX_RESUME_LENGTH))
          : null;
      }

      if (status !== undefined) {
        if (!["active", "completed"].includes(status)) {
          return NextResponse.json(
            { error: "Invalid status transition" },
            { status: 400 },
          );
        }

        const currentStatus = sessionData?.status;
        if (status === "active" && currentStatus !== "setup") {
          return NextResponse.json(
            { error: "Only setup sessions can be activated" },
            { status: 400 },
          );
        }
        if (
          status === "completed" &&
          !["setup", "active"].includes(currentStatus)
        ) {
          return NextResponse.json(
            { error: "Session is already completed" },
            { status: 400 },
          );
        }

        updateData.status = status;
        if (status === "active") {
          // Record when interview actually started for tracking/auditing.
          // Note: Google's ephemeral tokens enforce their own TTL on the WebSocket
          // connection, providing server-side session duration enforcement.
          updateData.activatedAt = new Date().toISOString();
        }
        if (status === "completed" && !sessionData?.completedAt) {
          updateData.completedAt = new Date().toISOString();
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 },
        );
      }

      // Update session
      await sessionRef.update(updateData);

      logger.info(
        `Session ${sessionId} updated with resume text by user ${user.id}`,
      );

      return NextResponse.json({
        success: true,
        sessionId,
      });
    } catch (error) {
      logger.error("Error updating session:", error);

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to update session",
        },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
);

// GET - Get session details
export const GET = withAuth(
  async (_req: NextRequest, user: User, context: RouteContext) => {
    try {
      const { sessionId } = await context.params;

      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID is required" },
          { status: 400 },
        );
      }

      const sessionDoc = await db
        .collection("interview_sessions")
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      const sessionData = sessionDoc.data();

      // Verify user owns this session
      if (sessionData?.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const decryptedResumeText = decryptResumeText(
        sessionData?.resumeText as string | undefined,
      );

      return NextResponse.json({
        success: true,
        session: {
          id: sessionDoc.id,
          ...sessionData,
          resumeText: decryptedResumeText,
        },
      });
    } catch (error) {
      logger.error("Error fetching session:", error);

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to fetch session",
        },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 120,
    windowMs: 60 * 1000,
  },
);
