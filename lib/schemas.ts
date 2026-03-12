import { z } from "zod";

// Shared Firestore document ID format validation.
// Firestore auto-generated IDs are 20 alphanumeric characters, but
// deterministic IDs (e.g. feedback `userId_interviewId`) use underscores and
// can be longer. This schema accepts both patterns safely.
export const firestoreIdSchema = z
  .string()
  .min(1, "Document ID is required")
  .max(128, "Document ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid document ID format");

export const signInSchema = z.object({
  idToken: z.string().min(1, "ID Token is required"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  idToken: z.string().min(1, "ID Token is required"),
});

export const googleAuthSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  idToken: z.string().min(1, "ID Token is required"),
});

// Allowed Gemini voice names for live interviews.
export const ALLOWED_VOICE_NAMES = [
  "Kore",
  "Puck",
  "Charon",
  "Aoede",
  "Fenrir",
  "Leda",
  "Orus",
  "Zephyr",
  // Backward compatibility for older templates created before the voice list
  // was aligned with the current template generator.
  "Orbit",
] as const;

// F-008: Validates the interviewContext object sent from the client to
// /api/live/token. .strict() causes safeParse to FAIL if any extra field is
// present — this specifically blocks `resumeText` and `systemInstruction`
// from ever arriving via the client body, preventing prompt injection and PII
// leakage. Both values are read server-side from Firestore instead.
export const interviewContextClientSchema = z
  .object({
    role: z.string().min(1).max(100),
    companyName: z.string().max(100).optional(),
    level: z.string().max(50).optional(),
    type: z.string().max(50).optional(),
    techStack: z.array(z.string().max(50)).max(20).optional(),
    questions: z.array(z.string().max(500)).max(20).optional(),
    interviewerPersona: z
      .object({
        name: z.string().max(100),
        title: z.string().max(100),
        personality: z.string().max(300),
        voice: z.enum(ALLOWED_VOICE_NAMES).optional(),
      })
      .optional(),
    // resumeText    → intentionally absent: server reads from Firestore
    // systemInstruction → intentionally absent: server reads from Firestore
  })
  .strict(); // reject any undeclared field, including resumeText / systemInstruction

export type InterviewContextClient = z.infer<
  typeof interviewContextClientSchema
>;
