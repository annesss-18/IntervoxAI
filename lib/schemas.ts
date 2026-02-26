import { z } from "zod";

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
