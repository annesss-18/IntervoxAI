// app/api/interview/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { db } from '@/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { InterviewTemplate, User } from '@/types'

export const runtime = 'nodejs'

// Input validation schema
const requestSchema = z.object({
  role: z.string().min(3, 'Role must be at least 3 characters').max(100, 'Role too long'),
  companyName: z.string().max(100, 'Company name too long').optional(),
  companyLogoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']),
  type: z.enum(['Technical', 'Behavioral', 'System Design', 'HR', 'Mixed']),
  jdInput: z.string().min(50, 'Job description too short').max(50000, 'Job description too long'),
  techStack: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val)
        return Array.isArray(parsed) && parsed.length <= 20
      } catch {
        return false
      }
    },
    { message: 'Invalid tech stack format or too many items' }
  ),
  isPublic: z.enum(['true', 'false']),
})

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
    .describe('Scenario-based challenges that simulate real-world discussions'),
  focusArea: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Core competencies being evaluated'),
  companyCultureInsights: z
    .object({
      values: z
        .array(z.string())
        .optional()
        .default([])
        .describe('Identified company values and cultural traits'),
      workStyle: z
        .string()
        .optional()
        .default('collaborative')
        .describe('Inferred work style: fast-paced, collaborative, etc.'),
      teamStructure: z
        .string()
        .optional()
        .default('cross-functional')
        .describe('Inferred team organization and dynamics'),
    })
    .optional()
    .describe('Deep analysis of company culture from the job description'),
  interviewerPersona: z
    .object({
      name: z
        .string()
        .optional()
        .default('Alex')
        .describe('Realistic first name for the interviewer'),
      title: z
        .string()
        .optional()
        .default('Senior Engineer')
        .describe('Job title of the interviewer at the company'),
      personality: z
        .string()
        .optional()
        .default('professional and friendly')
        .describe('Brief personality description: warm, rigorous, etc.'),
    })
    .optional()
    .describe('Consistent persona for the AI interviewer'),
  systemInstruction: z
    .string()
    .optional()
    .describe('Complete persona and behavioral directives for the AI agent'),
})

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      // 1. Parse and validate form data
      const formData = await req.formData()

      const rawData = {
        role: formData.get('role') as string,
        companyName: formData.get('companyName') as string,
        companyLogoUrl: formData.get('companyLogoUrl') as string,
        level: formData.get('level') as string,
        type: formData.get('type') as string,
        jdInput: formData.get('jdInput') as string,
        techStack: formData.get('techStack') as string,
        isPublic: formData.get('isPublic') as string,
      }

      // Validate input
      const validation = requestSchema.safeParse(rawData)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            details: validation.error.issues.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        )
      }

      const validatedData = validation.data
      const userTechStack = JSON.parse(validatedData.techStack)

      // 2. Generate template with AI - Enhanced deep-context analysis
      const constructedPrompt = `
You are a Principal Interview Architect specializing in creating high-fidelity technical interview experiences. Your task is to engineer an interview template that feels like a genuine conversation with a senior engineer at ${validatedData.companyName || 'a leading tech company'}.

═══════════════════════════════════════════════════════════════════
DEEP CONTEXT ANALYSIS
═══════════════════════════════════════════════════════════════════

[JOB DESCRIPTION]
${validatedData.jdInput.substring(0, 20000)}

[INTERVIEW PARAMETERS]
• Role: ${validatedData.role}
• Level: ${validatedData.level}
• Type: ${validatedData.type}  
• Core Tech Stack: ${userTechStack.join(', ')}

═══════════════════════════════════════════════════════════════════
ANALYSIS INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

1. **COMPANY CULTURE EXTRACTION**
   - Identify explicit and implicit values (collaboration style, pace, autonomy)
   - Note team structure hints (cross-functional, pod-based, etc.)
   - Detect cultural keywords ("move fast", "customer-obsessed", "engineering excellence")
   
2. **ROLE DEEP-DIVE**
   - Map primary responsibilities to testable competencies
   - Identify the "hidden requirements" (what they can't directly ask but need)
   - Determine the day-1 vs. day-90 expectations

3. **GENERATE SCENARIO-BASED CHALLENGES**
   Create 5-8 questions that:
   - Start with a realistic scenario ("You've just joined the team and...")
   - Require multi-step reasoning, not just recall
   - Test both technical depth AND communication style
   - Include at least one production debugging scenario
   - Include at least one system design/architecture discussion
   - Include one collaboration/conflict resolution scenario (for ${validatedData.type} interview)
   
   ❌ AVOID: "What is X?", "Explain Y", "List Z"
   ✅ USE: "You're on-call at 2 AM and...", "A PM comes to you with...", "Your team disagrees on..."

4. **CRAFT THE INTERVIEWER PERSONA**
   Create a realistic interviewer with:
   - A common first name (Alex, Sam, Jordan, etc.)
   - A contextual title (e.g., "Staff Engineer" for senior roles)
   - A personality that's professional yet warm

   Build a System Instruction that includes:
   - Opening introduction protocol (greet by name if available from resume)
   - Natural speech patterns ("I see...", "That's interesting...", thinking pauses)
   - Active listening behaviors (ask follow-ups based on answers)
   - Hint-giving protocol (one small hint if stuck, then assess recovery)
   - Natural topic transitions ("That reminds me of...")
   - Encouraging close regardless of performance

Output JSON matching the schema.
`.trim()

      const result = await generateObject({
        model: google('gemini-3-pro-preview'),
        schema: templateSchema,
        prompt: constructedPrompt,
      })

      const generatedData = result.object

      // 3. Save to Firestore
      const templateData: Omit<InterviewTemplate, 'id'> = {
        ...generatedData,
        role: validatedData.role,
        companyName: validatedData.companyName || 'Unknown Company',
        companyLogoUrl: validatedData.companyLogoUrl || undefined,
        level: validatedData.level as InterviewTemplate['level'],
        type: validatedData.type as InterviewTemplate['type'],
        techStack: [...new Set([...userTechStack, ...generatedData.techStack])],
        jobDescription: validatedData.jdInput,
        creatorId: user.id,
        isPublic: validatedData.isPublic === 'true',
        usageCount: 0,
        avgScore: 0,
        createdAt: new Date().toISOString(),
      }

      const docRef = await db.collection('interview_templates').add(templateData)

      return NextResponse.json({ success: true, templateId: docRef.id })
    } catch (error) {
      console.error('Generation Error:', error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to generate template',
        },
        { status: 500 }
      )
    }
  },
  {
    maxRequests: 5,
    windowMs: 60 * 1000,
  }
)
