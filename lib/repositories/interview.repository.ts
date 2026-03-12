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

// F-014 FIX: Replaced the hard-coded limit(50) with cursor-based pagination.
// The old findByUserId is kept as a convenience wrapper that returns the first
// page only (used by places in the codebase that don't yet need pagination).
// New callers should use findByUserIdPaginated directly.
export interface SessionPage {
  sessions: InterviewSessionRecord[];
  // Pass nextCursor into the next call; null means this is the last page.
  nextCursor: string | null;
}

const DEFAULT_PAGE_SIZE = 20;

export const InterviewRepository = {
  // Return the first page of sessions for a user.
  /** @deprecated For paginated dashboard loads, prefer findByUserIdPaginated. */
  async findByUserId(userId: string): Promise<InterviewSessionRecord[]> {
    const page = await this.findByUserIdPaginated(userId);
    return page.sessions;
  },

  // Return sessions using cursor-based pagination.
  // Pass nextCursor back as afterCursor to fetch the following page.
  async findByUserIdPaginated(
    userId: string,
    afterCursor?: string,
    limit: number = DEFAULT_PAGE_SIZE,
  ): Promise<SessionPage> {
    try {
      let query = db
        .collection("interview_sessions")
        .where("userId", "==", userId)
        .orderBy("startedAt", "desc")
        // F-004/F-005 FIX: Field mask — exclude large fields not needed for
        // session cards: transcript (up to 600KB) and resumeText (encrypted blob).
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
          // transcript intentionally excluded — up to 600KB per session
        )
        // Fetch one extra doc so we know whether a next page exists
        // without a second round-trip.
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
      logger.error("Error fetching paginated interview sessions:", error);
      throw new Error("Failed to fetch interview sessions");
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
