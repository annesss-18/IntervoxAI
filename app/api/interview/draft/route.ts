// app/api/interview/draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { withAuth } from "@/lib/api-middleware";
import { extractTextFromUrl, extractTextFromFile } from "@/lib/server-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Enhanced Schema with Focus Areas
const draftSchema = z.object({
  role: z
    .string()
    .describe(
      "The specific job title, inferred or explicit (e.g. 'Senior Backend Engineer').",
    ),
  companyName: z.string().optional(),
  techStack: z
    .array(z.string())
    .describe("List of core technologies extracted from the JD."),
  baseQuestions: z
    .array(z.string())
    .min(3)
    .describe(
      "5-10 challenging, role-specific questions testing the focus areas.",
    ),
  jobDescription: z.string(),
  level: z.enum(["Junior", "Mid", "Senior", "Staff", "Executive"]),
  type: z.enum(["Technical", "Behavioral", "System Design", "HR", "Mixed"]),
  // NEW: Analytical Fields
  focusArea: z
    .array(z.string())
    .describe(
      "3-5 key competencies/topics to evaluate (e.g. 'Memory Management', 'System Scalability', 'Event Loops').",
    ),
  systemInstruction: z
    .string()
    .describe(
      "A highly detailed persona and instruction set for the AI Interviewer agent.",
    ),
});

export const POST = withAuth(
  async (req: NextRequest) => {
    // Parse formData ONCE before try block so fallback can access values
    const formData = await req.formData();
    const jdType = formData.get("jdType") as string;
    const jdInput = formData.get("jdInput");
    const roleInput = formData.get("role") as string;
    const levelInput = (formData.get("level") as string) || "Mid";
    const typeInput = (formData.get("type") as string) || "Technical";

    try {
      // 1. Robust Extraction
      let jdText = "";
      try {
        if (jdType === "url" && typeof jdInput === "string") {
          jdText = await extractTextFromUrl(jdInput);
        } else if (
          jdType === "file" &&
          jdInput &&
          typeof (jdInput as unknown as { arrayBuffer?: unknown })
            .arrayBuffer === "function"
        ) {
          jdText = await extractTextFromFile(jdInput as unknown as File);
        } else if (typeof jdInput === "string") {
          jdText = jdInput;
        }
      } catch (err) {
        logger.error("JD processing error:", err);
        // Don't fail, just continue with what we have
      }

      // 2. Safe Fallback Context construction
      // If Role is missing, mark it as UNKNOWN for the AI to fix.
      const safeRoleContext =
        roleInput && roleInput.trim().length > 0
          ? `Target Role: ${roleInput}`
          : `Target Role: UNKNOWN (You MUST extract the role from the JD)`;

      const safeJdText = jdText
        ? jdText.substring(0, 20000)
        : "No Job Description provided. Infer standard requirements for the role.";

      // 3. Deep Research Prompt
      const constructedPrompt = `
        You are a Senior Technical Hiring Manager building a rigorous interview template.
        Perform a deep analysis of the Job Description to create a template that accurately targets the role's core competencies.

        INPUT CONTEXT:
        ${safeRoleContext}
        Level: ${levelInput}
        Type: ${typeInput}

        [JOB DESCRIPTION START]
        ${safeJdText}
        [JOB DESCRIPTION END]

        ANALYSIS STEPS:

        1. **Role Extraction**: If the "Target Role" is UNKNOWN, extract the exact job title from the JD. If the JD is vague, infer the most likely technical role (e.g., "Full Stack Developer"). Normalize variations ("Sr." → "Senior").

        2. **Tech Stack Extraction**: Identify all critical technologies. Be specific — extract "Next.js" rather than "JavaScript framework". Include tools that are strongly implied by responsibilities (e.g., "CI/CD pipelines" implies Jenkins/GitHub Actions/etc.).

        3. **Focus Area Identification** (3-5 core competencies to evaluate):
           Calibrate focus areas to the candidate level:
           - Junior: Syntax fluency, debugging fundamentals, code readability, learning aptitude
           - Mid: Design patterns, testing strategies, code review quality, collaboration
           - Senior: System architecture, scalability thinking, mentorship, technical leadership
           - Staff: Cross-team technical strategy, organizational impact, ambiguity resolution
           - Executive: Engineering vision, team building, business-technical alignment

        4. **Question Generation** (5-10 questions):
           Distribute difficulty intentionally:
           - ~30% warm-up / rapport-building (open-ended, about their experience)
           - ~50% core competency probes (scenario-based, targeting focus areas)
           - ~20% stretch / challenge questions (push beyond comfort zone)
           Every question should be grounded in a concrete, realistic scenario relevant to the role.

        5. **System Instruction for the AI Interviewer Agent**:
           Write a detailed behavioral specification that covers:
           - **Opening**: How to greet the candidate, introduce yourself, and set a relaxed, conversational tone. Start with a warm-up question about their recent work.
           - **Conversational style**: Use natural bridges between topics ("That actually connects to..."), echo the candidate's terminology, vary sentence length, and use thinking pauses ("Let me think about that...").
           - **Active listening**: Ask follow-ups based on what the candidate said — probe vague answers ("Can you walk me through a specific example?"), celebrate strong answers ("Nice, that's exactly the kind of thinking we look for").
           - **Difficulty adaptation**: Increase complexity if the candidate is strong; simplify and offer hints if they struggle. Give at most one hint per question.
           - **Silence handling**: Wait patiently for 3-5 seconds. After 5-8 seconds, offer encouragement ("Take your time"). After 8+ seconds, rephrase or offer a sub-question.
           - **Closing**: Wind down naturally, give genuine encouragement referencing something specific the candidate did well, and ask if they have questions.

        Output the result as a structured JSON object matching the schema.
        `.trim();

      const result = await generateObject({
        model: google("gemini-3-pro-preview"),
        schema: draftSchema,
        prompt: constructedPrompt,
      });

      // Ensure we return the object directly
      return NextResponse.json(result.object);
    } catch (error) {
      logger.error("Draft Generation Error:", error);

      // Return 503 with fallback data so the client knows AI failed
      return NextResponse.json(
        {
          error:
            "AI service failed to generate interview draft. You may use the fallback data below.",
          code: "AI_GENERATION_FAILED",
          fallback: {
            role: roleInput || "Software Engineer",
            techStack: ["General"],
            baseQuestions: [
              "Tell me about your most challenging technical project.",
              "How do you handle difficult debugging scenarios?",
              "What is your preferred tech stack and why?",
            ],
            jobDescription: "Auto-generated fallback due to error.",
            level: levelInput as
              | "Junior"
              | "Mid"
              | "Senior"
              | "Staff"
              | "Executive",
            type: typeInput as
              | "Technical"
              | "Behavioral"
              | "System Design"
              | "HR"
              | "Mixed",
            focusArea: ["General Competence", "Problem Solving"],
            systemInstruction:
              "You are a helpful and professional technical interviewer.",
          },
        },
        { status: 503 },
      );
    }
  },
  {
    maxRequests: 8,
    windowMs: 60 * 1000,
  },
);
