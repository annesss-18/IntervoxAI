// app/api/interview/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { withAuth } from "@/lib/api-middleware";
import { InterviewTemplate, User } from "@/types";

export const runtime = "nodejs";

const MAX_TECH_ITEMS = 20;
const MAX_TECH_ITEM_LENGTH = 50;

const techStackItemSchema = z.string().trim().min(1).max(MAX_TECH_ITEM_LENGTH);
const techStackArraySchema = z.array(techStackItemSchema).max(MAX_TECH_ITEMS);

// Input validation schema
const requestSchema = z.object({
  role: z
    .string()
    .min(3, "Role must be at least 3 characters")
    .max(100, "Role too long"),
  companyName: z.string().max(100, "Company name too long").optional(),
  companyLogoUrl: z
    .string()
    .url("Invalid logo URL")
    .optional()
    .or(z.literal("")),
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

// Schema for AI output - Enhanced with culture analysis and persona
// Made resilient to handle partial AI responses gracefully
const templateSchema = z.object({
  role: z.string().optional(),
  companyName: z.string().optional(),
  techStack: z.array(z.string()).optional().default([]),
  baseQuestions: z
    .array(z.string())
    .min(1)
    .max(15)
    .describe("Scenario-based challenges that simulate real-world discussions"),
  focusArea: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Core competencies being evaluated"),
  companyCultureInsights: z
    .object({
      values: z
        .array(z.string())
        .optional()
        .default([])
        .describe("Identified company values and cultural traits"),
      workStyle: z
        .string()
        .optional()
        .default("collaborative")
        .describe("Inferred work style: fast-paced, collaborative, etc."),
      teamStructure: z
        .string()
        .optional()
        .default("cross-functional")
        .describe("Inferred team organization and dynamics"),
    })
    .optional()
    .describe("Deep analysis of company culture from the job description"),
  interviewerPersona: z
    .object({
      name: z
        .string()
        .optional()
        .default("Alex")
        .describe("Realistic first name for the interviewer"),
      title: z
        .string()
        .optional()
        .default("Senior Engineer")
        .describe("Job title of the interviewer at the company"),
      personality: z
        .string()
        .optional()
        .default("professional and friendly")
        .describe("Brief personality description: warm, rigorous, etc."),
    })
    .optional()
    .describe("Consistent persona for the AI interviewer"),
  systemInstruction: z
    .string()
    .optional()
    .describe("Complete persona and behavioral directives for the AI agent"),
});

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      // 1. Parse and validate form data
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

      // Validate input
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
                message: `Tech stack must be a JSON array of 1-${MAX_TECH_ITEMS} non-empty strings (max ${MAX_TECH_ITEM_LENGTH} chars each).`,
              },
            ],
          },
          { status: 400 },
        );
      }

      // 2. Generate template with AI - Enhanced deep-context analysis
      const constructedPrompt = `
You are a Principal Interview Architect who designs high-fidelity technical interview experiences. Engineer an interview template that feels like a genuine conversation with a senior engineer at ${validatedData.companyName || "a leading tech company"}.

═══════════════════════════════════════════════════════════════════
INPUT CONTEXT
═══════════════════════════════════════════════════════════════════

[JOB DESCRIPTION]
${validatedData.jdInput.substring(0, 20000)}

[INTERVIEW PARAMETERS]
• Role: ${validatedData.role}
• Level: ${validatedData.level}
• Type: ${validatedData.type}
• Core Tech Stack: ${userTechStack.join(", ")}

═══════════════════════════════════════════════════════════════════
STEP 1: COMPANY CULTURE EXTRACTION
═══════════════════════════════════════════════════════════════════

Analyze the JD for cultural signals:
- Explicit values and implicit norms (collaboration style, pace, autonomy level)
- Team structure hints (cross-functional pods, embedded teams, matrixed orgs)
- Cultural keywords ("move fast", "customer-obsessed", "engineering excellence", "ownership")
- Work style inference (async-first, meeting-heavy, documentation-driven)

═══════════════════════════════════════════════════════════════════
STEP 2: ROLE DEEP-DIVE
═══════════════════════════════════════════════════════════════════

- Map each listed responsibility to a testable competency
- Identify implicit requirements (skills the JD hints at but doesn't name directly)
- Determine day-1 expectations vs. 90-day growth expectations
- Identify the 2-3 "make or break" skills for this specific level

═══════════════════════════════════════════════════════════════════
STEP 3: GENERATE SCENARIO-BASED CHALLENGES
═══════════════════════════════════════════════════════════════════

Create 5-8 questions covering these archetypes (include at least one of each):

**Production Debugging** — Place the candidate in a live incident:
  "Your team's API latency spikes 10x during peak hours. Walk me through how you'd diagnose this."

**Architecture Discussion** — Explore system design thinking:
  "You're tasked with redesigning the notification system to handle 100x the current load. Where do you start?"

**Collaboration Scenario** — Test interpersonal and cross-functional skills:
  "A PM pushes back on your technical recommendation because it delays the launch by two weeks. How do you navigate this?"

**Trade-off Analysis** — Test decision-making under constraints:
  "You need to choose between refactoring the legacy auth system now or shipping the new feature first. What are the factors you'd weigh?"

All questions should:
- Open with a concrete, realistic scenario grounded in the role's actual work
- Require multi-step reasoning and trade-off thinking, not just recall
- Test both technical depth and communication clarity
- Be calibrated for the ${validatedData.level} level (${validatedData.level === "Junior" ? "focus on fundamentals and learning approach" : validatedData.level === "Mid" ? "focus on implementation quality and collaboration" : validatedData.level === "Senior" ? "focus on architecture, mentorship, and system-wide impact" : validatedData.level === "Staff" ? "focus on technical strategy, org-wide influence, and ambiguity handling" : "focus on vision, technical strategy, and organizational leadership"})

═══════════════════════════════════════════════════════════════════
STEP 4: CRAFT THE INTERVIEWER PERSONA
═══════════════════════════════════════════════════════════════════

Create a realistic interviewer:
- **Name**: A common, friendly first name (e.g., Alex, Sam, Jordan, Maya, Priya)
- **Title**: Contextual to the role level — use a title that's 1-2 levels above the candidate
  (e.g., "Staff Engineer" for Senior candidates, "Engineering Manager" for Mid-level)
- **Personality**: Write a brief personality sketch covering:
  - Communication style (direct but warm, Socratic, collaborative)
  - Pacing preference (gives candidates space to think, vs. fast-paced back-and-forth)
  - A distinguishing conversational habit (e.g., "tends to say 'walk me through that' when curious")

═══════════════════════════════════════════════════════════════════
STEP 5: SYSTEM INSTRUCTION BLUEPRINT
═══════════════════════════════════════════════════════════════════

Write a comprehensive System Instruction for the AI agent that will conduct this interview.
The instruction MUST cover each of these behavioral layers:

1. **Opening Protocol**: How to greet the candidate naturally (use their name if available from resume), briefly introduce yourself, set a relaxed tone, and ask a warm-up question about their recent work.

2. **Conversational Flow**:
   - Use natural bridges between topics: "That's interesting — it actually connects to something I wanted to ask about..."
   - Echo the candidate's language (if they say "scaling," use "scaling" back)
   - Vary sentence length: mix short reactions ("Totally.", "Got it.") with longer follow-ups
   - Use thinking pauses naturally: "Hmm, let me think about that for a sec..."

3. **Active Listening & Follow-ups**:
   - Ask follow-ups based on what the candidate actually said, not just from the question list
   - If an answer is surface-level: "Can you walk me through a specific example?"
   - If an answer is strong: "Nice — what would you do differently if you had more time?"

4. **Difficulty Calibration**:
   - If the candidate answers confidently and correctly → increase complexity
   - If the candidate struggles → simplify, offer a small hint, then assess their recovery
   - Give at most one hint per question before moving on

5. **Silence & Hesitation Handling**:
   - Short pause (3-5s): wait patiently
   - Medium pause (5-8s): offer gentle encouragement: "Take your time"
   - Long pause (8s+): rephrase the question or offer a smaller sub-question

6. **Closing**: Wind down naturally. Give genuine encouragement referencing something specific the candidate did well. Ask if they have questions. Keep it warm and conversational.

Output JSON matching the schema.
`.trim();

      const result = await generateObject({
        model: google("gemini-3-pro-preview"),
        schema: templateSchema,
        prompt: constructedPrompt,
      });

      const generatedData = result.object;

      // 3. Save to Firestore
      const templateData: Omit<InterviewTemplate, "id"> = {
        ...generatedData,
        role: validatedData.role,
        companyName: validatedData.companyName || "Unknown Company",
        companyLogoUrl: validatedData.companyLogoUrl || undefined,
        level: validatedData.level as InterviewTemplate["level"],
        type: validatedData.type as InterviewTemplate["type"],
        techStack: Array.from(
          new Set(
            [...userTechStack, ...(generatedData.techStack || [])]
              .map((item) => String(item).trim())
              .filter(
                (item) =>
                  item.length > 0 && item.length <= MAX_TECH_ITEM_LENGTH,
              ),
          ),
        ).slice(0, MAX_TECH_ITEMS),
        jobDescription: validatedData.jdInput,
        creatorId: user.id,
        isPublic: validatedData.isPublic === "true",
        usageCount: 0,
        avgScore: 0,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db
        .collection("interview_templates")
        .add(templateData);

      return NextResponse.json({ success: true, templateId: docRef.id });
    } catch (error) {
      console.error("Generation Error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate template",
        },
        { status: 500 },
      );
    }
  },
  {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
);
