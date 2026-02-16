import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const { templateId } = await req.json();

      if (!templateId) {
        return NextResponse.json(
          { error: "Template ID is required" },
          { status: 400 },
        );
      }

      // 1. Verify Template Exists
      const templateRef = db.collection("interview_templates").doc(templateId);
      const templateSnap = await templateRef.get();
      if (!templateSnap.exists) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }
      const templateData = templateSnap.data();
      if (!templateData?.isPublic && templateData?.creatorId !== user.id) {
        return NextResponse.json(
          {
            error:
              "Forbidden. You do not have access to this private template.",
          },
          { status: 403 },
        );
      }

      // 2. Create Session + Increment Usage Count (Atomic Transaction)
      const sessionId = await db.runTransaction(async (transaction) => {
        const newSessionRef = db.collection("interview_sessions").doc();
        transaction.set(newSessionRef, {
          templateId,
          userId: user.id,
          status: "setup",
          feedbackStatus: "idle",
          feedbackError: null,
          startedAt: new Date().toISOString(),
        });
        transaction.update(templateRef, {
          usageCount: FieldValue.increment(1),
        });
        return newSessionRef.id;
      });

      return NextResponse.json({ sessionId });
    } catch (error) {
      logger.error("Create Session Error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Internal Server Error",
        },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  },
);
