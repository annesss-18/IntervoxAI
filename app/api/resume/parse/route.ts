import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import {
  isAllowedResumeFile,
  MAX_RESUME_SIZE_BYTES,
  RESUME_MAX_STORED_CHARS,
} from "@/lib/resume-types";
import { extractTextFromFile } from "@/lib/server-utils";
import type { User } from "@/types";

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      if (!isAllowedResumeFile(file)) {
        return NextResponse.json(
          { error: "Only PDF, DOCX, or TXT files are accepted" },
          { status: 400 },
        );
      }

      if (file.size > MAX_RESUME_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File size exceeds 5MB limit" },
          { status: 400 },
        );
      }

      logger.info(
        `Parsing resume for user ${user.id}, file size: ${file.size} bytes`,
      );

      const text = await extractTextFromFile(
        file,
        MAX_RESUME_SIZE_BYTES / (1024 * 1024),
      );

      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          {
            error:
              "Could not extract text from the file. It may be scanned, empty, or image-only.",
          },
          { status: 422 },
        );
      }

      // Normalize whitespace and control characters before truncation.
      const cleanedText = text
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim()
        .slice(0, RESUME_MAX_STORED_CHARS);

      logger.info(
        `Successfully parsed resume: ${cleanedText.length} characters extracted`,
      );

      return NextResponse.json({
        success: true,
        text: cleanedText,
        truncated: text.length > RESUME_MAX_STORED_CHARS,
        originalLength: text.trim().length,
      });
    } catch (error) {
      logger.error("Error parsing resume:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("Invalid PDF") ||
          error.message.includes("Failed to parse") ||
          error.message.includes("not a valid")
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid file. Please upload a valid PDF, DOCX, or TXT document.",
            },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "Failed to parse resume file" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Failed to parse resume file" },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
);
