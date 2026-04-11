import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { extractTextFromUrl, extractTextFromFile } from "@/lib/server-utils";
import { getCompanyLogoUrl } from "@/lib/icon-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MIN_JD_LENGTH = 50;
const MAX_JD_LENGTH = 25000;

const templateGenGoogle = createGoogleGenerativeAI({
  apiKey: process.env.TEMPLATE_GENERATION_API_KEY,
});

const TEMPLATE_GENERATION_MODEL = process.env.TEMPLATE_GENERATION_MODEL;

if (!TEMPLATE_GENERATION_MODEL) {
  throw new Error("TEMPLATE_GENERATION_MODEL is required");
}

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

      // Normalize all input modes into plain JD text before analysis.
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

      const result = await generateObject({
        model: templateGenGoogle(TEMPLATE_GENERATION_MODEL),
        schema: analysisSchema,
        prompt: `
You extract structured information from a job posting. Be precise and literal. Extract only what the posting supports, and infer only where these instructions explicitly allow it.

[JOB POSTING START]
${jdText.substring(0, MAX_JD_LENGTH)}
[JOB POSTING END]

EXTRACTION TASKS (priority order):

1. COMPANY NAME
   Search in this order:
   a. Page header or title (for example, "Google - Software Engineer" -> "Google")
   b. "About [Company]" or "About Us" sections
   c. "Posted by [Company]" or "Hiring for [Company]" metadata
   d. Domain name in URLs (for example, stripe.com/careers -> "Stripe")
   e. Logo alt text or footer branding
   If none of these produce a result, return "Unknown Company".

2. ROLE
   Extract the exact job title as written.
   Normalize only obvious abbreviations such as "Sr." -> "Senior" and "SW" -> "Software".

3. TECH STACK
   Extract every explicitly mentioned technology, including languages, frameworks, databases, infrastructure tools, and cloud services.
   Add an implied technology only when a named platform or service makes it unavoidable.

4. LEVEL
   Infer seniority from the role scope:
   - "Junior", "Entry", "Associate", or "0-2 years" -> Junior
   - "3-5 years" or "Mid-level" with no leadership scope -> Mid
   - "5-8 years", mentoring, leading technical decisions, or owning systems -> Senior
   - "8+ years", technical strategy, cross-team influence, or "Principal" -> Staff
   - "VP", "CTO", "Director of Engineering", or org-wide technical vision -> Executive
   When signals conflict, prefer scope of impact over years of experience.

5. SUGGESTED TYPE
   Infer the interview type:
   - Systems design, architecture, or scalability focus -> "System Design"
   - Algorithms, coding, or deep technical implementation focus -> "Technical"
   - Leadership, teamwork, communication, or culture focus -> "Behavioral"
   - Recruiting, screening, compensation, or benefits focus -> "HR"
   - Balanced technical and soft-skill focus -> "Mixed"

6. CLEAN JD
   Remove navigation, sign-in or apply buttons, cookie banners, "Similar Jobs" sections, page chrome, and footers. Keep only the job description content.
        `,
      });

      const extractedData = result.object;

      // Precompute a stable logo URL so the client can render immediately.
      const companyLogoUrl = getCompanyLogoUrl(extractedData.companyName);

      return NextResponse.json({
        ...extractedData,
        companyLogoUrl,
      });
    } catch (error) {
      const errorContext = {
        timestamp: new Date().toISOString(),
        jdType,
        jdLength: jdText?.length || 0,
        errorType: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      logger.error("Job analysis failed", errorContext);

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

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
