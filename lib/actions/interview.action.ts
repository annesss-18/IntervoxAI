"use server";

import { GetFeedbackByInterviewIdParams } from "@/types";
import { logger } from "../logger";
import { InterviewService } from "@/lib/services/interview.service";
import type { SessionPageResult } from "@/lib/services/interview.service";
import type { SessionStatusFilter } from "@/types";
import type { PublicTemplateSort } from "@/lib/repositories/template.repository";

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

export async function getPublicTemplates(
  limit: number = 20,
  sort?: PublicTemplateSort,
) {
  return await InterviewService.getPublicTemplates(limit, sort);
}

export async function getUserTemplates(userId: string) {
  return await InterviewService.getUserTemplates(userId);
}

export async function getUserSessionsPage(
  userId: string,
  afterCursor?: string,
  limit: number = 20,
  statusFilter?: SessionStatusFilter,
): Promise<SessionPageResult> {
  return await InterviewService.getUserSessionsPage(
    userId,
    afterCursor,
    limit,
    statusFilter,
  );
}

export async function getTemplateById(templateId: string, userId?: string) {
  return await InterviewService.getTemplateById(templateId, userId);
}
