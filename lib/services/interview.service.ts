import { InterviewRepository } from "@/lib/repositories/interview.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import {
  SessionCardData,
  Interview,
  CreateFeedbackParams,
  TemplateCardData,
} from "@/types";
import { logger } from "@/lib/logger";
import { feedbackSchema } from "@/constants";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

/**
 * Retry helper with exponential backoff for transient failures
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    operationName?: string;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    operationName = "operation",
  } = options;
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`${operationName} failed after ${maxRetries} attempts`);
  throw lastError;
}

const MAX_TRANSCRIPT_TURNS_FOR_FEEDBACK = 120;
const MAX_TRANSCRIPT_CHARS_FOR_FEEDBACK = 18000;

function compactTranscriptForFeedback(
  transcript: { role: string; content: string }[],
): { formattedTranscript: string; wasCompacted: boolean } {
  const normalized = transcript
    .map((sentence) => ({
      role: sentence.role.trim().slice(0, 30) || "Unknown",
      content: sentence.content.replace(/\s+/g, " ").trim(),
    }))
    .filter((sentence) => sentence.content.length > 0);

  const slicedByTurns =
    normalized.length > MAX_TRANSCRIPT_TURNS_FOR_FEEDBACK
      ? normalized.slice(-MAX_TRANSCRIPT_TURNS_FOR_FEEDBACK)
      : normalized;

  const baseTranscript = slicedByTurns
    .map((sentence) => `-${sentence.role}: ${sentence.content}`)
    .join("\n");

  if (baseTranscript.length <= MAX_TRANSCRIPT_CHARS_FOR_FEEDBACK) {
    const wasCompacted =
      normalized.length !== transcript.length ||
      slicedByTurns.length !== normalized.length;
    return { formattedTranscript: baseTranscript, wasCompacted };
  }

  const headSize = Math.floor(MAX_TRANSCRIPT_CHARS_FOR_FEEDBACK * 0.45);
  const tailSize = Math.floor(MAX_TRANSCRIPT_CHARS_FOR_FEEDBACK * 0.45);
  const head = baseTranscript.slice(0, headSize);
  const tail = baseTranscript.slice(-tailSize);
  const omitted = baseTranscript.length - head.length - tail.length;

  const compacted = `${head}\n...[transcript compacted: ${omitted} characters omitted for token budget]...\n${tail}`;

  return { formattedTranscript: compacted, wasCompacted: true };
}

export const InterviewService = {
  async getUserSessions(userId: string): Promise<SessionCardData[]> {
    const rawSessions = await InterviewRepository.findByUserId(userId);

    if (rawSessions.length === 0) return [];

    const templateIds = rawSessions.map((s) => s.templateId).filter(Boolean);
    const templateMap = await TemplateRepository.findManyByIds(templateIds);

    return rawSessions
      .map((session) => {
        const template = templateMap.get(session.templateId);
        if (!template) {
          logger.warn(
            `Template ${session.templateId} not found for session ${session.id}`,
          );
          return null;
        }

        return {
          id: session.id,
          role: template.role,
          companyName: template.companyName || "Unknown Company",
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
        } as SessionCardData;
      })
      .filter((s): s is SessionCardData => s !== null);
  },

  async getSessionsWithFeedback(userId: string): Promise<SessionCardData[]> {
    const sessions = await this.getUserSessions(userId);
    const completedIds = sessions
      .filter((s) => s.status === "completed")
      .map((s) => s.id);

    if (completedIds.length === 0) return sessions;

    const feedbackMap = await FeedbackRepository.findManyByInterviewIds(
      completedIds,
      userId,
    );

    return sessions.map((session) => ({
      ...session,
      finalScore: feedbackMap.get(session.id) || session.finalScore,
    }));
  },

  async getSessionById(id: string, userId?: string): Promise<Interview | null> {
    const session = await InterviewRepository.findById(id);
    if (!session) return null;

    if (userId && session.userId !== userId) {
      logger.warn(`Unauthorized access to session ${id} by user ${userId}`);
      return null;
    }

    const template = await TemplateRepository.findById(session.templateId);
    if (!template) {
      logger.error(
        `Template ${session.templateId} not found for session ${id}`,
      );
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      createdAt: session.startedAt,
      status: session.status,
      resumeText: session.resumeText,
      role: template.role,
      companyName: template.companyName || "Unknown Company",
      companyLogoUrl: template.companyLogoUrl,
      level: template.level,
      questions: template.baseQuestions || [],
      techstack: template.techStack || [],
      jobDescription: template.jobDescription || "",
      type: template.type,
      finalized: session.status === "completed",
      systemInstruction: template.systemInstruction,
    } as Interview;
  },

  async getPublicTemplates(limit: number = 20): Promise<TemplateCardData[]> {
    const templates = await TemplateRepository.findPublic(limit);
    return templates.map((t) => ({
      id: t.id,
      role: t.role,
      companyName: t.companyName || "Unknown Company",
      companyLogoUrl: t.companyLogoUrl,
      level: t.level,
      type: t.type,
      techStack: t.techStack || [],
      usageCount: t.usageCount || 0,
      avgScore: t.avgScore || 0,
      createdAt: t.createdAt,
      isOwnedByUser: false,
    }));
  },

  async getUserTemplates(userId: string): Promise<TemplateCardData[]> {
    const templates = await TemplateRepository.findByCreatorId(userId);
    return templates.map((t) => ({
      id: t.id,
      role: t.role,
      companyName: t.companyName || "Unknown Company",
      companyLogoUrl: t.companyLogoUrl,
      level: t.level,
      type: t.type,
      techStack: t.techStack || [],
      usageCount: t.usageCount || 0,
      avgScore: t.avgScore || 0,
      createdAt: t.createdAt,
      isOwnedByUser: true,
    }));
  },

  async createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript } = params;

    const session = await InterviewRepository.findById(interviewId);
    if (!session) {
      throw new Error("Interview session not found");
    }
    if (session.userId !== userId) {
      logger.warn(
        `Unauthorized feedback generation attempt for session ${interviewId} by ${userId}`,
      );
      throw new Error("Unauthorized to access this interview session");
    }

    const existingFeedback = await FeedbackRepository.findByInterviewId(
      interviewId,
      userId,
    );
    if (existingFeedback) {
      const now = new Date().toISOString();

      if (
        session.status !== "completed" ||
        session.feedbackId !== existingFeedback.id ||
        session.finalScore !== existingFeedback.totalScore ||
        session.feedbackStatus !== "completed" ||
        !!session.feedbackError
      ) {
        await InterviewRepository.update(interviewId, {
          status: "completed",
          completedAt: session.completedAt || now,
          feedbackId: existingFeedback.id,
          finalScore: existingFeedback.totalScore,
          feedbackStatus: "completed",
          feedbackError: null,
          feedbackCompletedAt: session.feedbackCompletedAt || now,
          feedbackRequestedAt: session.feedbackRequestedAt || now,
          transcript,
        });
      }

      return { success: true, feedbackId: existingFeedback.id, reused: true };
    }

    const { formattedTranscript, wasCompacted } =
      compactTranscriptForFeedback(transcript);

    if (wasCompacted) {
      logger.info(
        `Transcript compacted for feedback generation (session ${interviewId}) to reduce token usage`,
      );
    }

    logger.info(`Generating feedback for interview ${interviewId}...`);

    const genResult = await withRetry(
      () =>
        generateObject({
          model: google("gemini-3-pro-preview"),
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
            "You are a senior interview coach providing deep, actionable feedback. Be honest but constructive. Your goal is to help candidates grow, not just evaluate them.",
        }),
      { maxRetries: 3, operationName: "AI feedback generation" },
    );

    // Schema validation is handled by generateObject but we double check or use the result
    const validatedFeedback = genResult.object;

    // Construct scores array structure if needed by frontend
    const categoryScoresArray = [
      {
        name: "Communication Skills",
        ...validatedFeedback.categoryScores.communicationSkills,
      },
      {
        name: "Technical Knowledge",
        ...validatedFeedback.categoryScores.technicalKnowledge,
      },
      {
        name: "Problem Solving",
        ...validatedFeedback.categoryScores.problemSolving,
      },
      { name: "Cultural Fit", ...validatedFeedback.categoryScores.culturalFit },
      {
        name: "Confidence and Clarity",
        ...validatedFeedback.categoryScores.confidenceAndClarity,
      },
    ];

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
    });

    const completionTimestamp = new Date().toISOString();

    // Update session score and feedback processing metadata
    await InterviewRepository.update(interviewId, {
      finalScore: validatedFeedback.totalScore,
      feedbackId: feedbackId,
      status: "completed",
      completedAt: completionTimestamp,
      feedbackStatus: "completed",
      feedbackError: null,
      feedbackCompletedAt: completionTimestamp,
      feedbackRequestedAt: session.feedbackRequestedAt || completionTimestamp,
      transcript,
    });

    return { success: true, feedbackId };
  },

  async getTemplateById(id: string, userId?: string) {
    const template = await TemplateRepository.findById(id);
    if (!template) return null;

    if (!template.isPublic && template.creatorId !== userId) {
      logger.warn(
        `Unauthorized access to private template ${id} by user ${userId || "anonymous"}`,
      );
      return null;
    }

    return template;
  },

  async getFeedbackByInterviewId(params: {
    interviewId: string;
    userId: string;
  }) {
    return await FeedbackRepository.findByInterviewId(
      params.interviewId,
      params.userId,
    );
  },
};
