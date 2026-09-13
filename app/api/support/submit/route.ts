import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-middleware";
import { EmailService } from "@/lib/services/email.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const supportRequestSchema = z.object({
  category: z.enum([
    "Microphone or audio",
    "Live interview session",
    "Feedback generation",
    "Account or billing",
    "Something else",
  ]),
  message: z.string().trim().min(10).max(2000),
});

export const POST = withAuth(
  async (req: NextRequest, user) => {
    const parsed = supportRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please fill in a category and a message (10+ characters)." },
        { status: 400 },
      );
    }

    try {
      const delivered = await EmailService.sendSupportRequest({
        userId: user.id,
        userEmail: user.email,
        category: parsed.data.category,
        message: parsed.data.message,
      });

      if (!delivered) {
        return NextResponse.json(
          {
            error:
              "Support messaging isn't set up yet. Please reach out on GitHub instead.",
          },
          { status: 503 },
        );
      }
    } catch (error) {
      logger.error("Failed to send support request:", error);
      return NextResponse.json(
        { error: "Could not send your message. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  },
  { maxRequests: 5, windowMs: 60 * 1000 },
);
