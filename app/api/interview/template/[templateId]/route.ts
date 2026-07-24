import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-middleware";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { firestoreIdSchema, trustedCompanyLogoUrlSchema } from "@/lib/schemas";
import {
  generateTemplateContent,
  needsTemplateRegeneration,
  TEMPLATE_GENERATION_RATE_LIMIT,
} from "@/lib/services/template-generation.service";
import type { InterviewTemplate, User } from "@/types";

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
    techStack: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    jobDescription: z.string().min(50).max(50000).optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

// PATCH /api/interview/template/:templateId — update user-editable fields.
//
// role, companyName, level, type, techStack, and jobDescription are the
// exact inputs generateTemplateContent() uses to produce baseQuestions,
// focusArea, companyCultureInsights, interviewerPersona, and
// systemInstruction. If a caller changes any of them, this route
// regenerates that AI-derived content in the same request so the template
// can never display one job description while the live interviewer
// actually runs off another. companyLogoUrl and isPublic are cosmetic and
// update instantly with no AI call.
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

      const shouldRegenerate = needsTemplateRegeneration(template, data);

      type FullUpdatePayload = typeof data & {
        baseQuestions?: InterviewTemplate["baseQuestions"];
        focusArea?: InterviewTemplate["focusArea"];
        companyCultureInsights?: InterviewTemplate["companyCultureInsights"];
        interviewerPersona?: InterviewTemplate["interviewerPersona"];
        systemInstruction?: InterviewTemplate["systemInstruction"];
      };

      let updatePayload: FullUpdatePayload = data;

      if (shouldRegenerate) {
        // Regeneration calls the same AI pipeline as template creation, so
        // it shares that flow's cost-control budget instead of the looser
        // limit meant for cheap metadata-only edits (see route options
        // below).
        const rateLimitResult = await checkRateLimit(
          `template-regen:${user.id}`,
          TEMPLATE_GENERATION_RATE_LIMIT,
        );
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error:
                "You're regenerating templates too quickly. Please wait a moment and try again.",
            },
            { status: 429 },
          );
        }

        try {
          const generated = await generateTemplateContent({
            role: data.role ?? template.role,
            companyName: data.companyName ?? template.companyName,
            level: data.level ?? template.level,
            type: data.type ?? template.type,
            jdInput: data.jobDescription ?? template.jobDescription,
            techStack: data.techStack ?? template.techStack ?? [],
          });

          updatePayload = { ...data, ...generated };
        } catch (error) {
          // Fail the whole request rather than writing a partial update:
          // the caller's raw edits (role/company/etc.) and the AI-derived
          // fields must always change together, never one without the
          // other.
          logger.error("Template regeneration failed during edit:", error);
          return NextResponse.json(
            {
              error:
                "Couldn't regenerate the interview from your changes, so nothing was saved. Please try again.",
            },
            { status: 502 },
          );
        }
      }

      await TemplateRepository.update(templateId, updatePayload);

      logger.audit("template.updated", {
        actorId: user.id,
        templateId,
        fields: Object.keys(updatePayload),
        regenerated: shouldRegenerate,
      });

      return NextResponse.json({
        success: true,
        regenerated: shouldRegenerate,
      });
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
