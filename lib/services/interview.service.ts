import { InterviewRepository } from '@/lib/repositories/interview.repository'
import { TemplateRepository } from '@/lib/repositories/template.repository'
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import {
  SessionCardData,
  Interview,
  Feedback,
  CreateFeedbackParams,
  InterviewTemplate,
  TemplateCardData,
} from '@/types'
import { logger } from '@/lib/logger'
import { feedbackSchema } from '@/constants'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'

/**
 * Retry helper with exponential backoff for transient failures
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; operationName?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, operationName = 'operation' } = options
  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        logger.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  logger.error(`${operationName} failed after ${maxRetries} attempts`)
  throw lastError
}

export const InterviewService = {
  async getUserSessions(userId: string): Promise<SessionCardData[]> {
    const rawSessions = await InterviewRepository.findByUserId(userId)

    if (rawSessions.length === 0) return []

    const templateIds = rawSessions.map((s) => s.templateId).filter(Boolean)
    const templateMap = await TemplateRepository.findManyByIds(templateIds)

    return rawSessions
      .map((session) => {
        const template = templateMap.get(session.templateId)
        if (!template) {
          logger.warn(`Template ${session.templateId} not found for session ${session.id}`)
          return null
        }

        return {
          id: session.id,
          role: template.role,
          companyName: template.companyName || 'Unknown Company',
          companyLogoUrl: template.companyLogoUrl,
          level: template.level,
          type: template.type,
          techStack: template.techStack || [],
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          finalScore: session.finalScore,
          feedbackId: session.feedbackId,
          hasResume: !!session.resumeText,
        } as SessionCardData
      })
      .filter((s): s is SessionCardData => s !== null)
  },

  async getSessionsWithFeedback(userId: string): Promise<SessionCardData[]> {
    const sessions = await this.getUserSessions(userId)
    const completedIds = sessions.filter((s) => s.status === 'completed').map((s) => s.id)

    if (completedIds.length === 0) return sessions

    const feedbackMap = await FeedbackRepository.findManyByInterviewIds(completedIds, userId)

    return sessions.map((session) => ({
      ...session,
      finalScore: feedbackMap.get(session.id) || session.finalScore,
    }))
  },

  async getSessionById(id: string, userId?: string): Promise<Interview | null> {
    const session = await InterviewRepository.findById(id)
    if (!session) return null

    if (userId && session.userId !== userId) {
      logger.warn(`Unauthorized access to session ${id} by user ${userId}`)
      return null
    }

    const template = await TemplateRepository.findById(session.templateId)
    if (!template) {
      logger.error(`Template ${session.templateId} not found for session ${id}`)
      return null
    }

    return {
      id: session.id,
      userId: session.userId,
      createdAt: session.startedAt,
      status: session.status,
      resumeText: session.resumeText,
      role: template.role,
      companyName: template.companyName || 'Unknown Company',
      companyLogoUrl: template.companyLogoUrl,
      level: template.level,
      questions: template.baseQuestions || [],
      techstack: template.techStack || [],
      jobDescription: template.jobDescription || '',
      type: template.type,
      finalized: session.status === 'completed',
      systemInstruction: template.systemInstruction,
    } as Interview
  },

  async getPublicTemplates(limit: number = 20): Promise<TemplateCardData[]> {
    const templates = await TemplateRepository.findPublic(limit)
    return templates.map((t) => ({
      id: t.id,
      role: t.role,
      companyName: t.companyName || 'Unknown Company',
      companyLogoUrl: t.companyLogoUrl,
      level: t.level,
      type: t.type,
      techStack: t.techStack || [],
      usageCount: t.usageCount || 0,
      avgScore: t.avgScore || 0,
      createdAt: t.createdAt,
      isOwnedByUser: false,
    }))
  },

  async getUserTemplates(userId: string): Promise<TemplateCardData[]> {
    const templates = await TemplateRepository.findByCreatorId(userId)
    return templates.map((t) => ({
      id: t.id,
      role: t.role,
      companyName: t.companyName || 'Unknown Company',
      companyLogoUrl: t.companyLogoUrl,
      level: t.level,
      type: t.type,
      techStack: t.techStack || [],
      usageCount: t.usageCount || 0,
      avgScore: t.avgScore || 0,
      createdAt: t.createdAt,
      isOwnedByUser: true,
    }))
  },

  async createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript } = params

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) => `-${sentence.role}: ${sentence.content}`
      )
      .join('\n')

    logger.info(`Generating feedback for interview ${interviewId}...`)

    const genResult = await withRetry(
      () =>
        generateObject({
          model: google('gemini-3-pro-preview'),
          schema: feedbackSchema,
          prompt: `
═══════════════════════════════════════════════════════════════════
DEEP INSIGHT INTERVIEW ANALYSIS
═══════════════════════════════════════════════════════════════════
You are a Senior Interview Coach and Technical Evaluator. Your task is to provide 
a comprehensive, actionable analysis that helps this candidate grow in their career.

DO NOT BE LENIENT. Provide honest, constructive feedback that genuinely helps.

═══════════════════════════════════════════════════════════════════
INTERVIEW TRANSCRIPT
═══════════════════════════════════════════════════════════════════

${formattedTranscript}

═══════════════════════════════════════════════════════════════════
ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

1. **BEHAVIORAL SIGNAL ANALYSIS**
   - Did they structure their thoughts before speaking?
   - Did they ask clarifying questions?
   - When stuck, did they think out loud?
   - Were examples specific and detailed?

2. **TECHNICAL-BEHAVIORAL CORRELATION**
   - Connect technical performance to underlying patterns.
   - Example: Known answer but poor explanation -> communication coaching.

3. **CAREER COACHING (Critical Section)**
   - Provide SPECIFIC, ACTIONABLE advice (e.g., "Practice LeetCode graph problems").

4. **ROLE READINESS ASSESSMENT**
   - Honest assessment of standing against role level.

═══════════════════════════════════════════════════════════════════
SCORING GUIDELINES
═══════════════════════════════════════════════════════════════════
0-20: Significant gaps
20-40: Below expectations
40-60: Meets some expectations
60-80: Good performance
80-100: Excellent performance

HIRING RECOMMENDATION: Strong No, No, Lean No, Lean Yes, Yes, Strong Yes
        `.trim(),
          system:
            'You are a senior interview coach providing deep, actionable feedback. Be honest but constructive. Your goal is to help candidates grow, not just evaluate them.',
        }),
      { maxRetries: 3, operationName: 'AI feedback generation' }
    )

    // Schema validation is handled by generateObject but we double check or use the result
    const validatedFeedback = genResult.object

    // Construct scores array structure if needed by frontend
    const categoryScoresArray = [
      { name: 'Communication Skills', ...validatedFeedback.categoryScores.communicationSkills },
      { name: 'Technical Knowledge', ...validatedFeedback.categoryScores.technicalKnowledge },
      { name: 'Problem Solving', ...validatedFeedback.categoryScores.problemSolving },
      { name: 'Cultural Fit', ...validatedFeedback.categoryScores.culturalFit },
      { name: 'Confidence and Clarity', ...validatedFeedback.categoryScores.confidenceAndClarity },
    ]

    const feedbackId = await FeedbackRepository.create({
      interviewId,
      userId,
      totalScore: validatedFeedback.totalScore,
      hiringRecommendation: validatedFeedback.hiringRecommendation,
      categoryScores: validatedFeedback.categoryScores,
      categoryScoresArray,
      behavioralInsights: validatedFeedback.behavioralInsights,
      strengths: validatedFeedback.strengths,
      areasForImprovement: validatedFeedback.areasForImprovement,
      careerCoaching: validatedFeedback.careerCoaching,
      finalAssessment: validatedFeedback.finalAssessment,
      createdAt: new Date().toISOString(),
    })

    // Update session score
    await InterviewRepository.update(interviewId, {
      finalScore: validatedFeedback.totalScore,
      feedbackId: feedbackId,
    })

    return { success: true, feedbackId }
  },

  async getTemplateById(id: string) {
    return await TemplateRepository.findById(id)
  },

  async getFeedbackByInterviewId(params: { interviewId: string; userId: string }) {
    return await FeedbackRepository.findByInterviewId(params.interviewId, params.userId)
  },
}
