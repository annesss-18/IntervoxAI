// app/api/interview/draft/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { withAuth } from '@/lib/api-middleware'
import { extractTextFromUrl, extractTextFromFile } from '@/lib/server-utils'

export const runtime = 'nodejs'

// Enhanced Schema with Focus Areas
const draftSchema = z.object({
  role: z
    .string()
    .describe("The specific job title, inferred or explicit (e.g. 'Senior Backend Engineer')."),
  companyName: z.string().optional(),
  techStack: z.array(z.string()).describe('List of core technologies extracted from the JD.'),
  baseQuestions: z
    .array(z.string())
    .min(3)
    .describe('5-10 challenging, role-specific questions testing the focus areas.'),
  jobDescription: z.string(),
  level: z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Executive']),
  type: z.enum(['Technical', 'Behavioral', 'System Design', 'HR', 'Mixed']),
  // NEW: Analytical Fields
  focusArea: z
    .array(z.string())
    .describe(
      "3-5 key competencies/topics to evaluate (e.g. 'Memory Management', 'System Scalability', 'Event Loops')."
    ),
  systemInstruction: z
    .string()
    .describe('A highly detailed persona and instruction set for the AI Interviewer agent.'),
})

export const POST = withAuth(async (req: NextRequest) => {
  // Parse formData ONCE before try block so fallback can access values
  const formData = await req.formData()
  const jdType = formData.get('jdType') as string
  const jdInput = formData.get('jdInput')
  const roleInput = formData.get('role') as string
  const levelInput = (formData.get('level') as string) || 'Mid'
  const typeInput = (formData.get('type') as string) || 'Technical'

  try {
    // 1. Robust Extraction
    let jdText = ''
    try {
      if (jdType === 'url' && typeof jdInput === 'string') {
        jdText = await extractTextFromUrl(jdInput)
      } else if (
        jdType === 'file' &&
        jdInput &&
        typeof (jdInput as unknown as { arrayBuffer?: unknown }).arrayBuffer === 'function'
      ) {
        jdText = await extractTextFromFile(jdInput as unknown as File)
      } else if (typeof jdInput === 'string') {
        jdText = jdInput
      }
    } catch (err) {
      console.error('JD processing error', err)
      // Don't fail, just continue with what we have
    }

    // 2. Safe Fallback Context construction
    // If Role is missing, mark it as UNKNOWN for the AI to fix.
    const safeRoleContext =
      roleInput && roleInput.trim().length > 0
        ? `Target Role: ${roleInput}`
        : `Target Role: UNKNOWN (You MUST extract the role from the JD)`

    const safeJdText = jdText
      ? jdText.substring(0, 20000)
      : 'No Job Description provided. Infer standard requirements for the role.'

    // 3. Deep Research Prompt
    const constructedPrompt = `
        You are an Expert Technical Recruiter and Engineering Manager. 
        Perform a deep research analysis on the following Job Description (JD) to build a rigorous interview template.

        INPUT CONTEXT:
        ${safeRoleContext}
        Level: ${levelInput}
        Type: ${typeInput}

        [JOB DESCRIPTION START]
        ${safeJdText}
        [JOB DESCRIPTION END]

        Your Goal: Create the most efficient and rigorous interview template possible.
        
        CRITICAL INSTRUCTIONS:
        1. **Role Extraction:** If the "Target Role" is UNKNOWN, you MUST extract the exact job title from the JD. If the JD is vague, infer the most likely technical role (e.g. "Full Stack Developer").
        2. **Tech Stack Extraction:** Identify critical tools. Extract specific frameworks (e.g., "Next.js" instead of just "JS").
        3. **Competency Mapping (Focus Areas):** Identify 3-5 "Focus Areas". For a Senior role, focus on Architecture/Scalability. For a Junior, focus on Syntax/Logic.
        4. **Question Generation:** Generate 5-10 questions that probe these Focus Areas. *Do not make them generic.*
        5. **Agent Persona:** Write a "System Instruction" for the AI Agent that will conduct the interview. Include specific behaviors (e.g., "Ask about their experience with X").

        Output the result as a structured JSON object matching the schema.
        `.trim()

    const result = await generateObject({
      model: google('gemini-3-pro-preview'),
      schema: draftSchema,
      prompt: constructedPrompt,
    })

    // Ensure we return the object directly
    return NextResponse.json(result.object)
  } catch (error) {
    console.error('Draft Generation Error:', error)

    // Fallback response using pre-parsed form values (no double formData consumption)
    return NextResponse.json({
      role: roleInput || 'Software Engineer',
      techStack: ['General'],
      baseQuestions: [
        'Tell me about your most challenging technical project.',
        'How do you handle difficult debugging scenarios?',
        'What is your preferred tech stack and why?',
      ],
      jobDescription: 'Auto-generated fallback due to error.',
      level: levelInput as 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Executive',
      type: typeInput as 'Technical' | 'Behavioral' | 'System Design' | 'HR' | 'Mixed',
      focusArea: ['General Competence', 'Problem Solving'],
      systemInstruction: 'You are a helpful and professional technical interviewer.',
    })
  }
}, {
  maxRequests: 8,
  windowMs: 60 * 1000,
})
