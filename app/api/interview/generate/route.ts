import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { withAuth } from "@/lib/server/api-middleware";
import { logger } from "@/lib/logger";
import { trustedCompanyLogoUrlSchema } from "@/lib/schemas";
import {
  generateTemplateContent,
  TEMPLATE_GENERATION_RATE_LIMIT,
  TEMPLATE_MAX_TECH_ITEMS,
  TEMPLATE_MAX_TECH_ITEM_LENGTH,
} from "@/lib/services/template-generation.service";
import { InterviewTemplate, User } from "@/types";

export const runtime = "nodejs";

const techStackItemSchema = z
  .string()
  .trim()
  .min(1)
  .max(TEMPLATE_MAX_TECH_ITEM_LENGTH);
const techStackArraySchema = z
  .array(techStackItemSchema)
  .max(TEMPLATE_MAX_TECH_ITEMS);

const requestSchema = z.object({
  role: z
    .string()
    .min(3, "Role must be at least 3 characters")
    .max(100, "Role too long"),
  companyName: z.string().max(100, "Company name too long").optional(),
  companyLogoUrl: trustedCompanyLogoUrlSchema,
  level: z.enum(["Junior", "Mid", "Senior", "Staff", "Executive"]),
  type: z.enum(["Technical", "Behavioral", "System Design", "HR", "Mixed"]),
  jdInput: z
    .string()
    .min(50, "Job description too short")
    .max(50000, "Job description too long"),
  techStack: z.string().min(2, "Tech stack is required"),
  isPublic: z.enum(["true", "false"]),
});

function parseAndNormalizeTechStack(raw: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid tech stack format");
  }

  const validated = techStackArraySchema.parse(parsed);

  const deduped = Array.from(
    new Set(validated.map((item) => item.trim())),
  ).filter(Boolean);

  return deduped;
}

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const formData = await req.formData();

    const rawData = {
      role: formData.get("role") as string,
      companyName: formData.get("companyName") as string,
      companyLogoUrl: formData.get("companyLogoUrl") as string,
      level: formData.get("level") as string,
      type: formData.get("type") as string,
      jdInput: formData.get("jdInput") as string,
      techStack: formData.get("techStack") as string,
      isPublic: formData.get("isPublic") as string,
    };

    const validation = requestSchema.safeParse(rawData);

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

    const validatedData = validation.data;

    let userTechStack: string[];
    try {
      userTechStack = parseAndNormalizeTechStack(validatedData.techStack);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: [
            {
              field: "techStack",
              message: `Tech stack must be a JSON array of 1-${TEMPLATE_MAX_TECH_ITEMS} non-empty strings (max ${TEMPLATE_MAX_TECH_ITEM_LENGTH} chars each).`,
            },
          ],
        },
        { status: 400 },
      );
    }

    const generatedData = await generateTemplateContent({
      role: validatedData.role,
      companyName: validatedData.companyName,
      level: validatedData.level as InterviewTemplate["level"],
      type: validatedData.type as InterviewTemplate["type"],
      jdInput: validatedData.jdInput,
      techStack: userTechStack,
    });

    const templateData: Omit<InterviewTemplate, "id"> = {
      ...generatedData,
      role: validatedData.role,
      companyName: validatedData.companyName || "Unknown Company",
      companyLogoUrl: validatedData.companyLogoUrl || undefined,
      level: validatedData.level as InterviewTemplate["level"],
      type: validatedData.type as InterviewTemplate["type"],
      jobDescription: validatedData.jdInput,
      creatorId: user.id,
      isPublic: validatedData.isPublic === "true",
      usageCount: 0,
      avgScore: 0,
      createdAt: new Date().toISOString(),
    };

    const templateId = await TemplateRepository.create(templateData);

    if (templateData.isPublic) {
      revalidateTag("templates-public", "max");
      revalidateTag(`template:${templateId}`, "max");
    }

    return NextResponse.json({ success: true, templateId });
  } catch (error) {
    logger.error("Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}, TEMPLATE_GENERATION_RATE_LIMIT);
