"use server";

import {
  CreateFeedbackParams,
  GetFeedbackByInterviewIdParams,
  GetLatestInterviewsParams,
} from "@/types";
import { logger } from "../logger";
import { InterviewService } from "@/lib/services/interview.service";
import { revalidateTag } from "next/cache";

export async function getInterviewsByUserId(userId: string) {
  try {
    return await InterviewService.getUserSessions(userId);
  } catch (error) {
    logger.error("Error fetching user sessions:", error);
    return null;
  }
}

export async function getLatestInterviews(params: GetLatestInterviewsParams) {
  try {
    const templates = await InterviewService.getPublicTemplates(params.limit);
    // Map to expected return type if needed
    return templates.map((t) => ({
      ...t,
      techstack: t.techStack,
    }));
  } catch (error) {
    logger.error("Error fetching public templates:", error);
    return null;
  }
}

export async function getInterviewsById(id: string, userId?: string) {
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

export async function getSessionById(sessionId: string, userId?: string) {
  return await InterviewService.getSessionById(sessionId, userId);
}

export async function getSessionsWithFeedback(userId: string) {
  return await InterviewService.getSessionsWithFeedback(userId);
}

export async function getTemplateById(templateId: string, userId?: string) {
  return await InterviewService.getTemplateById(templateId, userId);
}

export async function clearTemplateCache(templateId?: string) {
  try {
    if (templateId) {
      revalidateTag(`template:${templateId}`, "page");
      logger.info(`Cache invalidated for template ${templateId}`);
    } else {
      revalidateTag("template", "page");
      logger.info("All template caches invalidated");
    }
  } catch (error) {
    logger.error("Error clearing template cache:", error);
  }
}

export async function createFeedback(params: CreateFeedbackParams) {
  try {
    return await InterviewService.createFeedback(params);
  } catch (error) {
    logger.error("Error creating feedback:", error);
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "Failed to generate feedback. Please try again.",
    };
  }
}
