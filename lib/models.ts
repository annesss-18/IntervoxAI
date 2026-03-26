// Centralize Gemini model IDs so routes do not drift on hardcoded fallbacks.

export const MODEL_CONFIG = {
  // Used by the template generation endpoints.
  templateGeneration:
    process.env.TEMPLATE_GENERATION_MODEL || "gemini-2.5-pro",

  // Used by the live interview token endpoint.
  liveInterview:
    process.env.LIVE_INTERVIEW_MODEL ||
    "models/gemini-2.5-flash-native-audio-preview-12-2025",

  // Used by the feedback generation pipeline.
  feedback: process.env.FEEDBACK_MODEL || "gemini-2.5-pro",
} as const;
