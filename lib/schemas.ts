import { z } from "zod";
import { isTrustedCompanyLogoUrl } from "@/lib/icon-utils";

// Firestore document IDs are user-controlled in routes, so validate them once
// here and reuse the schema everywhere.
export const firestoreIdSchema = z
  .string()
  .min(1, "ID cannot be empty")
  .max(128, "ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "ID contains invalid characters");

export const trustedCompanyLogoUrlSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .url("Invalid logo URL")
      .refine(
        isTrustedCompanyLogoUrl,
        "Logo URL must use a supported logo provider",
      ),
  ])
  .optional();

// Keep this list aligned with the Gemini Live voices we support.
export const ALLOWED_VOICE_NAMES = [
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Aoede",
  "Leda",
  "Orus",
  "Zephyr",
] as const;

export const transcriptEntrySchema = z.object({
  role: z.string().min(1, "role must be non-empty").max(20, "role too long"),
  content: z
    .string()
    .min(1, "content must be non-empty")
    .max(4000, "content too long"),
});

export const transcriptArraySchema = z
  .array(transcriptEntrySchema)
  .max(1000, "transcript too long - maximum 1,000 turns");

export const transcriptAppendSchema = z
  .array(transcriptEntrySchema)
  .max(100, "transcript append too long - maximum 100 turns")
  .superRefine((entries, ctx) => {
    const totalChars = entries.reduce(
      (sum, entry) => sum + entry.content.length,
      0,
    );

    if (totalChars > 20000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "transcript append too large - maximum 20,000 total characters",
      });
    }
  });

export const checkpointBaseSchema = z
  .number()
  .int("checkpointBase must be an integer")
  .min(0, "checkpointBase must be non-negative");

export const signUpSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  idToken: z.string().min(1),
});

export const signInSchema = z.object({
  idToken: z.string().min(1),
});

export const googleAuthSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  idToken: z.string().min(1),
});
