import { z } from "zod";

/**
 * Shared Zod schema for the /api/feedback/status response.
 *
 * Used by both the API route (to construct responses) and the client
 * component (to type-check parsed JSON). This prevents field drift
 * like the `feedbackError` vs `error` mismatch.
 */

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
