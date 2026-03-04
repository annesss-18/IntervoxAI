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
