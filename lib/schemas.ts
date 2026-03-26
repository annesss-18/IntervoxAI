import { z } from "zod";

// Validate both auto-generated Firestore IDs and longer deterministic document IDs.
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
  // Keep older templates valid after the voice list refresh.
  "Orbit",
] as const;

export const transcriptEntrySchema = z.object({
  role: z.string().trim().min(1).max(40),
  content: z.string().trim().min(1).max(2000),
});

export const transcriptArraySchema = z
  .array(transcriptEntrySchema)
  .min(1, "Transcript cannot be empty")
  .max(300);
