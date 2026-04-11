import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { logger } from "@/lib/logger";
import {
  firestoreIdSchema,
  trustedCompanyLogoUrlSchema,
} from "@/lib/schemas";
import type { User } from "@/types";

interface RouteContext {
  params: Promise<{ templateId: string }>;
}

const templateUpdateSchema = z
  .object({
    role: z.string().min(3).max(100).optional(),
    companyName: z.string().max(100).optional(),
    companyLogoUrl: trustedCompanyLogoUrlSchema,
    level: z.enum(["Junior", "Mid", "Senior", "Staff", "Executive"]).optional(),
    type: z
      .enum(["Technical", "System Design", "Behavioral", "HR", "Mixed"])
      .optional(),
    techStack: z
      .array(z.string().trim().min(1).max(50))
      .max(20)
      .optional(),
    jobDescription: z.string().min(50).max(50000).optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

// PATCH /api/interview/template/:templateId — update user-editable fields
export const PATCH = withAuth(
  async (req: NextRequest, user: User, context: RouteContext) => {
    try {
      const { templateId } = await context.params;

      const idResult = firestoreIdSchema.safeParse(templateId);
      if (!idResult.success) {
        return NextResponse.json(
          { error: "Invalid template ID" },
          { status: 400 },
        );
      }

      const body = await req.json();
      const validation = templateUpdateSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid input",
            details: validation.error.issues.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
          { status: 400 },
        );
      }

      const data = validation.data;

      if (Object.keys(data).length === 0) {
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 },
        );
      }

      // Verify the template exists and the user owns it.
      const template = await TemplateRepository.findById(templateId);
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }

      if (template.creatorId !== user.id) {
        return NextResponse.json(
          { error: "You can only edit templates you created" },
          { status: 403 },
        );
      }

      await TemplateRepository.update(templateId, data);

      logger.info(
        `Template ${templateId} updated by user ${user.id} (fields: ${Object.keys(data).join(", ")})`,
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("API PATCH /api/interview/template/:id error:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
);
