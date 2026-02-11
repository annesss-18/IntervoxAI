// app/api/interview/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { extractTextFromUrl, extractTextFromFile } from "@/lib/server-utils";
import { getCompanyLogoUrl } from "@/lib/company-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Constants for input validation
const MIN_JD_LENGTH = 50;
const MAX_JD_LENGTH = 25000;

// Enhanced schema with company extraction
const analysisSchema = z.object({
  role: z
    .string()
    .describe("The exact job title (e.g. 'Senior Backend Engineer')"),
  companyName: z
    .string()
    .describe(
      "The hiring company name. Look for 'About [Company]', company header, or metadata. If not found, return 'Unknown Company'",
    ),
  techStack: z
    .array(z.string())
    .describe(
      "List of technologies, languages, frameworks (e.g. ['React', 'Node.js', 'PostgreSQL'])",
    ),
  level: z.enum(["Junior", "Mid", "Senior", "Staff", "Executive"]),
  suggestedType: z.enum([
    "Technical",
    "Behavioral",
    "System Design",
    "HR",
    "Mixed",
  ]),
  cleanedJd: z
    .string()
    .describe("Pure job description without navigation/footer/ads"),
});

export const POST = withAuth(
  async (req: NextRequest) => {
    let jdType: string = "";
    let jdText: string = "";

    try {
      const formData = await req.formData();
      jdType = formData.get("jdType") as string;
      const jdInput = formData.get("jdInput");

      // 1. Extract Raw Text
      if (jdType === "url" && typeof jdInput === "string") {
        try {
          jdText = await extractTextFromUrl(jdInput);
        } catch (urlError) {
          const message =
            urlError instanceof Error ? urlError.message : "Unknown error";
          logger.error("URL extraction failed", {
            url: jdInput,
            error: message,
          });
          return NextResponse.json(
            {
              error:
                "Could not fetch the job posting. Please paste the text directly instead.",
              details: message,
              code: "URL_FETCH_FAILED",
            },
            { status: 422 },
          );
        }
      } else if (jdType === "file" && jdInput) {
        try {
          jdText = await extractTextFromFile(jdInput as unknown as File);
        } catch (fileError) {
          const message =
            fileError instanceof Error ? fileError.message : "Unknown error";
          logger.error("File extraction failed", { error: message });
          return NextResponse.json(
            {
              error:
                "Could not read the uploaded file. Please try a different format or paste the text directly.",
              details: message,
              code: "FILE_PARSE_FAILED",
            },
            { status: 422 },
          );
        }
      } else if (typeof jdInput === "string") {
        jdText = jdInput;
      }

      // 2. Input Validation
      if (!jdText || jdText.length < MIN_JD_LENGTH) {
        return NextResponse.json(
          {
            error: `Job description is too short. Please provide at least ${MIN_JD_LENGTH} characters.`,
            code: "INPUT_TOO_SHORT",
          },
          { status: 400 },
        );
      }

      if (jdText.length > MAX_JD_LENGTH) {
        return NextResponse.json(
          {
            error: `Job description is too long (${jdText.length.toLocaleString()} characters). Maximum is ${MAX_JD_LENGTH.toLocaleString()} characters.`,
            code: "INPUT_TOO_LONG",
          },
          { status: 400 },
        );
      }

      // 3. AI Extraction
      const result = await generateObject({
        model: google("gemini-3-pro-preview"),
        schema: analysisSchema,
        prompt: `
            Analyze this job posting and extract structured information.
            
            [RAW TEXT START]
            ${jdText.substring(0, MAX_JD_LENGTH)}
            [RAW TEXT END]
            
            CRITICAL TASKS:
            1. **COMPANY NAME**: Look for:
               - "About [Company]" sections
               - Company name in header/title (e.g. "Google - Software Engineer")
               - Metadata like "Posted by [Company]"
               - Domain name hints (e.g. stripe.com → Stripe)
               If truly not found, return "Unknown Company"
            
            2. **ROLE**: Extract exact title (e.g. "Senior DevOps Engineer")
            
            3. **TECH STACK**: Extract ALL mentioned technologies:
               - Programming languages (Python, JavaScript, etc.)
               - Frameworks (React, Django, Spring Boot, etc.)
               - Databases (PostgreSQL, MongoDB, Redis, etc.)
               - Tools (Docker, Kubernetes, Jenkins, etc.)
               - Cloud platforms (AWS, GCP, Azure)
            
            4. **CLEAN JD**: Remove all navigation, "Sign In", "Apply Now" buttons, 
               cookie notices, "Similar Jobs", footers. Keep ONLY the actual job description.
            `,
      });

      const extractedData = result.object;

      // 4. Generate Company Logo URL
      const companyLogoUrl = getCompanyLogoUrl(extractedData.companyName);

      // 5. Return enriched data
      return NextResponse.json({
        ...extractedData,
        companyLogoUrl,
      });
    } catch (error) {
      // Structured error logging
      const errorContext = {
        timestamp: new Date().toISOString(),
        jdType,
        jdLength: jdText?.length || 0,
        errorType: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      logger.error("Job analysis failed", errorContext);

      // Differentiated error responses
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        // AI SDK rate limit / quota errors
        if (
          errorMsg.includes("rate") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("limit")
        ) {
          return NextResponse.json(
            {
              error:
                "AI service is temporarily overloaded. Please try again in a moment.",
              code: "RATE_LIMITED",
            },
            { status: 429 },
          );
        }

        // AI model unavailable
        if (
          errorMsg.includes("model") ||
          errorMsg.includes("unavailable") ||
          errorMsg.includes("not found")
        ) {
          return NextResponse.json(
            {
              error:
                "AI service is temporarily unavailable. Please try again later.",
              code: "SERVICE_UNAVAILABLE",
            },
            { status: 503 },
          );
        }

        // Network / timeout issues
        if (
          errorMsg.includes("timeout") ||
          errorMsg.includes("network") ||
          errorMsg.includes("econnrefused")
        ) {
          return NextResponse.json(
            {
              error: "Connection to AI service timed out. Please try again.",
              code: "TIMEOUT",
            },
            { status: 504 },
          );
        }
      }

      // Generic fallback
      return NextResponse.json(
        {
          error:
            "Failed to analyze job description. Please try again or paste the text directly.",
          code: "ANALYSIS_FAILED",
        },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 8,
    windowMs: 60 * 1000,
  },
);
