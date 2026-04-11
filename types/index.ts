export interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  hiringRecommendation:
  | "Strong Yes"
  | "Yes"
  | "Lean Yes"
  | "Lean No"
  | "No"
  | "Strong No";
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  behavioralInsights: {
    confidenceLevel: "High" | "Moderate" | "Low" | "Variable";
    clarityOfThought: "Excellent" | "Good" | "Developing" | "Needs Improvement";
    technicalDepth: "Expert" | "Proficient" | "Intermediate" | "Foundational";
    problemApproach: "Systematic" | "Intuitive" | "Exploratory" | "Uncertain";
    stressResponse: "Composed" | "Adaptive" | "Hesitant" | "Struggled";
    observations: string[];
  };
  strengths: string[];
  areasForImprovement: string[];
  careerCoaching: {
    immediateActions: string[];
    learningPath: string[];
    interviewTips: string[];
    roleReadiness: string;
  };
  finalAssessment: string;
  createdAt: string;
}

export interface InterviewTemplate {
  id: string;
  creatorId: string;
  isPublic: boolean;
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: "Junior" | "Mid" | "Senior" | "Staff" | "Executive";
  type: "Technical" | "System Design" | "Behavioral" | "HR" | "Mixed";
  techStack: string[];
  focusArea: string[];
  jobDescription: string;
  baseQuestions: string[];
  systemInstruction?: string;
  companyCultureInsights?: {
    values: string[];
    workStyle: string;
    teamStructure: string;
  };
  interviewerPersona?: {
    name: string;
    title: string;
    personality: string;
    voice?: string;
  };
  usageCount: number;
  avgScore: number;
  // R-11: Running totals for incremental average calculation.
  scoreSum?: number;
  scoreCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SessionTemplateSnapshot {
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: InterviewTemplate["level"];
  type: InterviewTemplate["type"];
  techStack: string[];
}

export type FeedbackJobStatus =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface FeedbackStatusResponse {
  success: boolean;
  status?: FeedbackJobStatus;
  feedbackId?: string | null;
  error?: string | null;
}

export interface InterviewSession {
  id: string;
  templateId: string;
  userId: string;
  hasResume?: boolean;
  resumeText?: string;
  transcript?: Array<{ role: string; content: string }>;
  templateSnapshot?: SessionTemplateSnapshot;
  transcriptTurnCount?: number;
  transcriptChunkCount?: number;
  lastTranscriptCheckpointAt?: string | null;
  /**
   * "expired" is a terminal state set by the nightly session-cleanup worker
   * for setup sessions older than 48 hours that were never started.
   * It is otherwise identical to a soft-deleted state — expired sessions are
   * excluded from all active/completed dashboard queries.
   */
  status: "setup" | "active" | "completed" | "expired";
  /** Desired interview length in minutes (defaults to 15 for legacy sessions). */
  durationMinutes?: number;
  startedAt: string;
  // R-9: Set when session transitions to "active" (session PATCH route).
  activatedAt?: string;
  completedAt?: string;
  expiredAt?: string;
  feedbackId?: string;
  finalScore?: number;
  feedbackStatus?: FeedbackJobStatus;
  feedbackError?: string | null;
  feedbackRequestedAt?: string;
  feedbackProcessingAt?: string;
  feedbackCompletedAt?: string;
}

export interface TemplateCardData {
  id: string;
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: string;
  type: string;
  techStack: string[];
  usageCount: number;
  avgScore: number;
  createdAt: string;
  isOwnedByUser: boolean;
}

export interface SessionCardData {
  id: string;
  role: string;
  companyName: string;
  companyLogoUrl?: string;
  level: string;
  type: string;
  techStack: string[];
  status: "setup" | "active" | "completed" | "expired";
  startedAt: string;
  completedAt?: string;
  finalScore?: number;
  feedbackId?: string;
  hasResume: boolean;
}

export type SessionStatusFilter = "active" | "completed";

export interface InterviewSessionDetail {
  id: string;
  userId: string;
  /**
   * Exposed so LiveInterviewAgent can send it as a hint in the
   * /api/live/token request to parallelise Firestore reads.
   */
  templateId: string;
  createdAt: string;
  status: "setup" | "active" | "completed" | "expired";
  resumeText?: string;
  /**
   * Full conversation transcript. Populated by getSessionById so the
   * feedback page can render TranscriptViewer without an extra API call.
   * Empty array for sessions without a stored transcript.
   */
  transcript?: Array<{ role: string; content: string }>;
  /**
   * Desired session length in minutes.
   * Defaults to 15 for sessions created before this field existed.
   */
  durationMinutes: number;
  role: string;
  level: string;
  type: string;
  companyName?: string;
  companyLogoUrl?: string;
  questions: string[];
  techStack: string[];
  jobDescription?: string;
  focusArea?: string[];
  systemInstruction?: string;
  interviewerPersona?: {
    name: string;
    title: string;
    personality: string;
    voice?: string;
  };
  finalScore?: number;
  feedbackId?: string;
}

export interface ScoreHistoryEntry {
  sessionId: string;
  finalScore: number;
  startedAt: string;
  type: string;
  role: string;
  companyName: string;
}

export interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

export interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

export interface User {
  name: string;
  email: string;
  id: string;
  // R-12: Google avatar URL, stored on first sign-in / updated on re-login.
  photoURL?: string;
  stats?: {
    activeCount?: number;
    completedCount?: number;
    scoreSum?: number;
    scoreCount?: number;
  };
}

export interface AuthClaims {
  id: string;
  email?: string;
}

export interface SignInParams {
  idToken: string;
}

export interface SignUpParams {
  name?: string;
  idToken: string;
}

export interface GoogleAuthParams {
  name?: string;
  idToken: string;
}

export interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

export interface TechIconProps {
  techStack: string[];
}
