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

    // Fetch template context for role-aware evaluation
    let interviewContext = {
      role: "Software Engineer",
      level: "Mid",
      type: "Technical",
      techStack: [] as string[],
      companyName: "the company",
    };
    try {
      const template = await TemplateRepository.findById(session.templateId);
      if (template) {
        interviewContext = {
          role: template.role || interviewContext.role,
          level: template.level || interviewContext.level,
          type: template.type || interviewContext.type,
          techStack: template.techStack || [],
          companyName: template.companyName || interviewContext.companyName,
        };
      }
    } catch (e) {
      logger.warn(
        `Could not fetch template for feedback context (session ${interviewId}), proceeding with defaults`,
        e,
      );
    }

    const genResult = await withRetry(
      () =>
        generateObject({
          model: google("gemini-3-pro-preview"),
          schema: feedbackSchema,
          prompt: `
═══════════════════════════════════════════════════════════════════
INTERVIEW EVALUATION
═══════════════════════════════════════════════════════════════════

You are a Senior Interview Coach and Technical Evaluator. Provide a comprehensive,
honest, and actionable analysis that helps this candidate grow in their career.

Calibrate your scores as a real hiring committee would — recognize genuine strengths
and identify real gaps with equal rigor. Avoid grade inflation and avoid unnecessary
harshness. Ground every observation in specific moments from the transcript.

═══════════════════════════════════════════════════════════════════
INTERVIEW CONTEXT
═══════════════════════════════════════════════════════════════════

Position: ${interviewContext.role}
Level: ${interviewContext.level}
Type: ${interviewContext.type}
Tech Stack: ${interviewContext.techStack.join(", ") || "General"}
Company: ${interviewContext.companyName}

Use this context to calibrate expectations. For a ${interviewContext.level}-level
${interviewContext.role}, evaluate against what a real hiring panel at this level
would expect — not entry-level standards and not unreachable ideals.

═══════════════════════════════════════════════════════════════════
INTERVIEW TRANSCRIPT
═══════════════════════════════════════════════════════════════════

${formattedTranscript}

═══════════════════════════════════════════════════════════════════
ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

1. **BEHAVIORAL SIGNAL ANALYSIS**
   Watch for these signals in the transcript:
   - Did they structure their thoughts before answering (STAR method, problem decomposition)?
   - Did they ask clarifying questions before diving in?
   - When stuck, did they think out loud and show their reasoning process?
   - Were their examples specific, detailed, and from real experience (not textbook)?
   - Did they acknowledge trade-offs and limitations of their approach?

2. **TECHNICAL-BEHAVIORAL CORRELATION**
   Connect technical performance to underlying patterns:
   - Correct answer but poor explanation → communication coaching needed
   - Good intuition but no depth → needs deeper study of fundamentals
   - Strong depth but poor structure → needs practice articulating under pressure
   - Inconsistent quality → may signal nervousness vs. knowledge gaps

3. **CAREER COACHING** (tie to the specific role and level)
   - Immediate actions: specific, concrete steps for the next 2 weeks
     (e.g., "Practice system design problems focusing on database scaling patterns")
   - Learning path: skills to develop over 3-6 months for this role level
   - Interview tips: specific advice based on patterns observed in this transcript

4. **ROLE READINESS**
   Honest assessment calibrated to ${interviewContext.level}-level ${interviewContext.role}:
   - Where they meet expectations for this level
   - Where they exceed expectations
   - Where they fall short and what would close the gap

═══════════════════════════════════════════════════════════════════
SCORING CALIBRATION
═══════════════════════════════════════════════════════════════════

Score each category on 0-100 using these anchors:

**Communication Skills:**
  80-100: Articulates complex ideas clearly, uses analogies, structures answers well
  60-79: Gets the point across clearly, mostly organized
  40-59: Understandable but lacks structure or clarity in places
  20-39: Frequently unclear, rambling, or overly brief
  0-19: Cannot communicate technical ideas effectively

**Technical Knowledge:**
  80-100: Deep understanding with edge-case awareness, discusses trade-offs proactively
  60-79: Solid working knowledge, handles standard scenarios well
  40-59: Knows the basics but misses nuances or edge cases
  20-39: Significant gaps in fundamental understanding
  0-19: Cannot demonstrate basic competency

**Problem Solving:**
  80-100: Systematic decomposition, considers multiple approaches, optimizes
  60-79: Reasonable approach, gets to a working solution
  40-59: Can solve with guidance but misses optimal approaches
  20-39: Struggles to break down problems, needs heavy hints
  0-19: Cannot formulate an approach

**Cultural Fit:**
  80-100: Strong alignment with collaborative engineering culture, growth mindset
  60-79: Good team player, open to feedback
  40-59: Adequate but shows some rigidity or isolation tendency
  20-39: Concerning signals about teamwork or adaptability
  0-19: Significant misalignment with collaborative work culture

**Confidence and Clarity:**
  80-100: Composed under pressure, thinks clearly, owns uncertainty gracefully
  60-79: Generally confident, occasional hesitation on tough questions
  40-59: Inconsistent — confident on some topics, uncertain on others
  20-39: Frequently hesitant, lacks conviction even on known territory
  0-19: Unable to express confidence in any area

Total Score: weighted average reflecting overall interview performance.

HIRING RECOMMENDATION: Strong No, No, Lean No, Lean Yes, Yes, Strong Yes
        `.trim(),
          system:
            "You are a senior interview evaluator on a hiring committee. Your feedback will be read by the candidate to help them improve. Be honest and specific — reference exact moments from the transcript to support your assessments. Every strength you cite should include what made it strong. Every area for improvement should include a concrete suggestion for how to improve. Your career coaching should be specific to the role and level, not generic advice.",
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
      categoryScores: categoryScoresArray,
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
