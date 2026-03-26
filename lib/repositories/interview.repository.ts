import { db } from "@/firebase/admin";
import { logger } from "@/lib/logger";
import { decryptResumeText, isEncryptedResumeText } from "@/lib/resume-crypto";
import { InterviewSession, SessionStatusFilter } from "@/types";

export interface TranscriptSentence {
  role: string;
  content: string;
}

export interface InterviewSessionRecord extends InterviewSession {
  transcript?: TranscriptSentence[];
}

export interface SessionPage {
  sessions: InterviewSessionRecord[];
  // Pass nextCursor into the next call; null means this is the last page.
  nextCursor: string | null;
}

const DEFAULT_PAGE_SIZE = 20;

export const InterviewRepository = {
  async findByUserIdPaginated(
    userId: string,
    afterCursor?: string,
    limit: number = DEFAULT_PAGE_SIZE,
    statusFilter?: SessionStatusFilter,
  ): Promise<SessionPage> {
    try {
      let query = db.collection("interview_sessions").where("userId", "==", userId);

      if (statusFilter === "completed") {
        query = query.where("status", "==", "completed");
      }

      if (statusFilter === "active") {
        query = query.where("status", "in", ["setup", "active"]);
      }

      query = query
        .orderBy("startedAt", "desc")
        // Exclude large transcript and resume fields from dashboard session queries.
        .select(
          "templateId",
          "userId",
          "hasResume",
          "status",
          "startedAt",
          "completedAt",
          "activatedAt",
          "feedbackId",
          "finalScore",
          "feedbackStatus",
          "feedbackError",
          "feedbackCompletedAt",
          // Transcript intentionally excluded because it can be large.
        )
        // Fetch one extra doc so we know whether a next page exists without a second round-trip.
        .limit(limit + 1);

      if (afterCursor) {
        const cursorDoc = await db
          .collection("interview_sessions")
          .doc(afterCursor)
          .get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();

      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

      const sessions = docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as InterviewSessionRecord,
      );

      return {
        sessions,
        nextCursor: hasMore ? (docs[docs.length - 1]?.id ?? null) : null,
      };
    } catch (error) {
      logger.error("Error fetching paginated interview sessions:", {
        userId,
        afterCursor,
        limit,
        statusFilter,
        error,
      });
      throw new Error("Failed to fetch interview sessions");
    }
  },

  async findById(id: string): Promise<InterviewSessionRecord | null> {
    try {
      const doc = await db.collection("interview_sessions").doc(id).get();
      if (!doc.exists) return null;

      const data = { id: doc.id, ...doc.data() } as InterviewSessionRecord;

      // Log decryption failures separately from missing resume data.
      const encryptedResume = data.resumeText;
      const decryptedResume = decryptResumeText(encryptedResume);
      if (
        encryptedResume &&
        isEncryptedResumeText(encryptedResume) &&
        decryptedResume === undefined
      ) {
        logger.error(
          `Failed to decrypt resumeText for session ${id}. ` +
            `This may indicate a key rotation issue or data corruption. ` +
            `The resume will be unavailable for this session.`,
        );
      }

      return {
        ...data,
        resumeText: decryptedResume,
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
