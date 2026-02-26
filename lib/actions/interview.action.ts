"use server";

import { GetFeedbackByInterviewIdParams } from "@/types";
import { logger } from "../logger";
import { InterviewService } from "@/lib/services/interview.service";

export async function getInterviewById(id: string, userId?: string) {
  try {
    return await InterviewService.getSessionById(id, userId);
  } catch (error) {
    logger.error("Error fetching session by ID:", error);
    return null;
  }
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams,
) {
  return await InterviewService.getFeedbackByInterviewId(params);
}

export async function getPublicTemplates(limit: number = 20) {
  return await InterviewService.getPublicTemplates(limit);
}

export async function getUserTemplates(userId: string) {
  return await InterviewService.getUserTemplates(userId);
}

export async function getUserSessions(userId: string) {
  return await InterviewService.getUserSessions(userId);
}

export async function getTemplateById(templateId: string, userId?: string) {
  return await InterviewService.getTemplateById(templateId, userId);
}
