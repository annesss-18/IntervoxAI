export interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  hiringRecommendation?:
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
  behavioralInsights?: {
    confidenceLevel: "High" | "Moderate" | "Low" | "Variable";
    clarityOfThought: "Excellent" | "Good" | "Developing" | "Needs Improvement";
    technicalDepth: "Expert" | "Proficient" | "Intermediate" | "Foundational";
    problemApproach: "Systematic" | "Intuitive" | "Exploratory" | "Uncertain";
    stressResponse: "Composed" | "Adaptive" | "Hesitant" | "Struggled";
    observations: string[];
  };
  strengths: string[];
  areasForImprovement: string[];
  careerCoaching?: {
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
  createdAt: string;
  updatedAt?: string;
}

export interface InterviewSession {
  id: string;
  templateId: string;
  userId: string;
  hasResume?: boolean;
  resumeText?: string;
  transcript?: Array<{ role: string; content: string }>;
  status: "setup" | "active" | "completed";
  startedAt: string;
  completedAt?: string;
  feedbackId?: string;
  finalScore?: number;
  feedbackStatus?: "idle" | "pending" | "processing" | "completed" | "failed";
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
  status: "setup" | "active" | "completed";
  startedAt: string;
  completedAt?: string;
  finalScore?: number;
  feedbackId?: string;
  hasResume: boolean;
}

export interface InterviewSessionDetail {
  id: string;
  userId: string;
  createdAt: string;
  status: "setup" | "active" | "completed";
  resumeText?: string;
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
