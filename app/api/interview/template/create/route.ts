// app/api/interview/template/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import type { InterviewTemplate, User } from "@/types";
import { z } from "zod";

const VALID_LEVELS = ["Junior", "Mid", "Senior", "Staff", "Executive"] as const;
const VALID_TYPES = [
  "Technical",
  "System Design",
  "Behavioral",
  "HR",
  "Mixed",
] as const;

const templateCreateSchema = z.object({
  role: z.string().trim().min(1, "Role is required").max(100),
  companyName: z.string().trim().max(100).default(""),
  companyLogoUrl: z
    .string()
    .url("Invalid logo URL format")
    .refine((url) => url.startsWith("https://"), {
      message: "Logo URL must use HTTPS",
    })
    .optional(),
  level: z.enum(VALID_LEVELS).default("Mid"),
  type: z.enum(VALID_TYPES).default("Technical"),
  techStack: z.array(z.string().trim().max(50)).max(20).default([]),
  focusArea: z.array(z.string().trim().max(100)).max(10).default([]),
  isPublic: z.boolean().default(false),
  jobDescription: z.string().trim().max(5000).default(""),
  baseQuestions: z
    .array(z.string().trim().min(1).max(1000))
    .min(1, "At least one question is required")
    .max(20),
  systemInstruction: z.string().trim().max(10000).optional(),
  interviewerPersona: z
    .object({
      name: z.string().trim().max(50),
      title: z.string().trim().max(100),
      personality: z.string().trim().max(500),
    })
    .optional(),
});

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json();
      const validation = templateCreateSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid template data",
            details: validation.error.issues,
          },
          { status: 400 },
        );
      }

      const data = validation.data;

      const templateData: Omit<InterviewTemplate, "id"> = {
        role: data.role,
        companyName: data.companyName,
        companyLogoUrl: data.companyLogoUrl,
        level: data.level,
        type: data.type,
        techStack: data.techStack,
        focusArea: data.focusArea,
        isPublic: data.isPublic,
        jobDescription: data.jobDescription,
        baseQuestions: data.baseQuestions,
        systemInstruction: data.systemInstruction,
        interviewerPersona: data.interviewerPersona,
        creatorId: user.id,
        usageCount: 0,
        avgScore: 0,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db
        .collection("interview_templates")
        .add(templateData);

      return NextResponse.json({ success: true, templateId: docRef.id });
    } catch (error) {
      logger.error("Create Template Error:", error);
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
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  },
);
