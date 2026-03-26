import { z } from "zod";
import { ALLOWED_VOICE_NAMES } from "@/lib/schemas";

// Validate untrusted client interview context while forcing sensitive fields
// to be loaded server-side from Firestore.
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
    // resumeText and systemInstruction are intentionally omitted here.
  })
  .strict();

export type InterviewContextClient = z.infer<
  typeof interviewContextClientSchema
>;
