import { db } from "@/firebase/admin";
import { InterviewSession } from "@/types";
import { logger } from "@/lib/logger";
import { decryptResumeText } from "@/lib/resume-crypto";

export interface TranscriptSentence {
  role: string;
  content: string;
}

export interface InterviewSessionRecord extends InterviewSession {
  transcript?: TranscriptSentence[];
}

export const InterviewRepository = {
  async findByUserId(userId: string): Promise<InterviewSessionRecord[]> {
    // returning raw data, mapped in service
    try {
      const snapshot = await db
        .collection("interview_sessions")
        .where("userId", "==", userId)
        .orderBy("startedAt", "desc")
        .get();

      return snapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as InterviewSessionRecord;
        return {
          ...data,
          resumeText: decryptResumeText(data.resumeText),
        };
      });
    } catch (error) {
      logger.error("Error fetching interview sessions:", error);
      return [];
    }
  },

  async findById(id: string): Promise<InterviewSessionRecord | null> {
    try {
      const doc = await db.collection("interview_sessions").doc(id).get();
      if (!doc.exists) return null;
      const data = { id: doc.id, ...doc.data() } as InterviewSessionRecord;
      return {
        ...data,
        resumeText: decryptResumeText(data.resumeText),
      };
    } catch (error) {
      logger.error(`Error fetching interview session ${id}:`, error);
      return null;
    }
  },

  async update(
    id: string,
    data: Partial<InterviewSessionRecord>,
  ): Promise<void> {
    try {
      await db.collection("interview_sessions").doc(id).update(data);
    } catch (error) {
      logger.error(`Error updating session ${id}:`, error);
      throw new Error("Failed to update session");
    }
  },
};
