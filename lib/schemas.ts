import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

export const signInSchema = z.object({
  email: z.string().email(),
  idToken: z.string().min(1, "ID Token is required"),
});

export const signUpSchema = userSchema.extend({
  uid: z.string().min(1, "UID is required"),
  idToken: z.string().min(1, "ID Token is required").optional(),
});

export const createFeedbackSchema = z.object({
  interviewId: z.string().min(1),
  userId: z.string().min(1),
  transcript: z.array(
    z.object({
      role: z.string(),
      content: z.string(),
    }),
  ),
});
