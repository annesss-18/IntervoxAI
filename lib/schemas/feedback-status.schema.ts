import { z } from "zod";

// Share the /api/feedback/status schema between the route and client parsing.
export const feedbackJobStatusSchema = z.enum([
  "idle",
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type FeedbackJobStatus = z.infer<typeof feedbackJobStatusSchema>;

export const feedbackStatusResponseSchema = z.object({
  success: z.boolean(),
  status: feedbackJobStatusSchema,
  feedbackId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export type FeedbackStatusResponse = z.infer<
  typeof feedbackStatusResponseSchema
>;
