import { FieldPath } from "firebase-admin/firestore";
import { db } from "@/firebase/admin";
import { logger } from "@/lib/logger";
import { decryptResumeText, isEncryptedResumeText } from "@/lib/resume-crypto";
import {
  InterviewSession,
  SessionStatusFilter,
  SessionTemplateSnapshot,
} from "@/types";

export interface TranscriptSentence {
  role: string;
  content: string;
}

interface TranscriptChunkRecord {
  baseTurn: number;
  entries: TranscriptSentence[];
  turnCount: number;
  createdAt: string;
}

export interface InterviewSessionRecord extends InterviewSession {
  transcript?: TranscriptSentence[];
}

export interface InterviewSessionStatus {
  id: string;
  userId: string;
  status: string;
  feedbackStatus?: string;
  feedbackError?: string | null;
  feedbackProcessingAt?: string;
  feedbackId?: string;
  finalScore?: number;
  completedAt?: string;
  feedbackRequestedAt?: string;
  feedbackCompletedAt?: string;
}

export interface SessionPage {
  sessions: InterviewSessionRecord[];
  nextCursor: string | null;
}

export type TranscriptAppendResult =
  | {
      success: true;
      appendedCount: number;
      nextBase: number;
    }
  | {
      success: false;
      reason: "missing" | "stale";
      expectedBase?: number;
    };

const DEFAULT_PAGE_SIZE = 20;
const TRANSCRIPT_CHUNK_ID_WIDTH = 8;

function getLegacyTranscript(
  session: Partial<InterviewSessionRecord> | Record<string, unknown>,
): TranscriptSentence[] {
  return Array.isArray(session.transcript)
    ? (session.transcript as TranscriptSentence[])
    : [];
}

export function getStoredTranscriptTurnCount(
  session: Partial<InterviewSessionRecord> | Record<string, unknown>,
): number {
  if (typeof session.transcriptTurnCount === "number") {
    return session.transcriptTurnCount;
  }

  return getLegacyTranscript(session).length;
}

function getStoredTranscriptChunkCount(
  session: Partial<InterviewSessionRecord> | Record<string, unknown>,
): number {
  if (typeof session.transcriptChunkCount === "number") {
    return session.transcriptChunkCount;
  }

  return 0;
}

function normalizeSnapshot(
  snapshot: unknown,
): SessionTemplateSnapshot | undefined {
  if (!snapshot || typeof snapshot !== "object") return undefined;

  const data = snapshot as Record<string, unknown>;
  const role = typeof data.role === "string" ? data.role : "";
  const companyName =
    typeof data.companyName === "string" ? data.companyName : "";
  const level = typeof data.level === "string" ? data.level : "";
  const type = typeof data.type === "string" ? data.type : "";

  if (!role || !companyName || !level || !type) {
    return undefined;
  }

  return {
    role,
    companyName,
    companyLogoUrl:
      typeof data.companyLogoUrl === "string" ? data.companyLogoUrl : undefined,
    level: level as SessionTemplateSnapshot["level"],
    type: type as SessionTemplateSnapshot["type"],
    techStack: Array.isArray(data.techStack)
      ? data.techStack.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    baseQuestions: Array.isArray(data.baseQuestions)
      ? data.baseQuestions
          .filter((item): item is string => typeof item === "string")
          .slice(0, 20)
      : [],
    focusArea: Array.isArray(data.focusArea)
      ? data.focusArea
          .filter((item): item is string => typeof item === "string")
          .slice(0, 10)
      : [],
    jobDescription:
      typeof data.jobDescription === "string"
        ? data.jobDescription.slice(0, 25_000)
        : undefined,
    systemInstruction:
      typeof data.systemInstruction === "string"
        ? data.systemInstruction.slice(0, 20_000)
        : undefined,
    interviewerPersona:
      data.interviewerPersona &&
      typeof data.interviewerPersona === "object" &&
      typeof (data.interviewerPersona as Record<string, unknown>).name ===
        "string" &&
      typeof (data.interviewerPersona as Record<string, unknown>).title ===
        "string" &&
      typeof (data.interviewerPersona as Record<string, unknown>)
        .personality === "string"
        ? (() => {
            const p = data.interviewerPersona as {
              name: string;
              title: string;
              personality: string;
              voice?: string;
            };
            return {
              name: p.name.slice(0, 80),
              title: p.title.slice(0, 120),
              personality: p.personality.slice(0, 500),
              voice:
                typeof p.voice === "string" ? p.voice.slice(0, 50) : undefined,
            };
          })()
        : undefined,
  };
}

async function readTranscriptChunks(
  sessionId: string,
): Promise<TranscriptSentence[]> {
  const snapshot = await db
    .collection("interview_sessions")
    .doc(sessionId)
    .collection("transcript_chunks")
    .orderBy(FieldPath.documentId(), "asc")
    .get();

  const transcript: TranscriptSentence[] = [];

  for (const doc of snapshot.docs) {
    const chunk = doc.data() as TranscriptChunkRecord;
    if (!Array.isArray(chunk.entries)) continue;

    for (const entry of chunk.entries) {
      if (
        entry &&
        typeof entry.role === "string" &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0
      ) {
        transcript.push({
          role: entry.role,
          content: entry.content,
        });
      }
    }
  }

  return transcript;
}

async function hydrateTranscript(
  sessionId: string,
  session: Partial<InterviewSessionRecord> | Record<string, unknown>,
): Promise<TranscriptSentence[]> {
  const legacyTranscript = getLegacyTranscript(session);
  const chunkCount = getStoredTranscriptChunkCount(session);

  if (chunkCount <= 0) {
    return legacyTranscript;
  }

  const chunkTranscript = await readTranscriptChunks(sessionId);
  if (legacyTranscript.length === 0) {
    return chunkTranscript;
  }

  return [...legacyTranscript, ...chunkTranscript];
}

export const InterviewRepository = {
  async findByUserIdPaginated(
    userId: string,
    afterCursor?: string,
    limit: number = DEFAULT_PAGE_SIZE,
    statusFilter?: SessionStatusFilter,
  ): Promise<SessionPage> {
    try {
      let query = db
        .collection("interview_sessions")
        .where("userId", "==", userId);

      if (statusFilter === "completed") {
        query = query.where("status", "==", "completed");
      }

      if (statusFilter === "active") {
        query = query.where("status", "in", ["setup", "active"]);
      }

      query = query
        .orderBy("startedAt", "desc")
        .select(
          "templateId",
          "templateSnapshot",
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
        )
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

      const sessions = docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          templateSnapshot: normalizeSnapshot(data.templateSnapshot),
        } as InterviewSessionRecord;
      });

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

      const raw = doc.data() ?? {};
      const transcript = await hydrateTranscript(id, raw);

      const data = {
        id: doc.id,
        ...raw,
        transcript,
        templateSnapshot: normalizeSnapshot(raw.templateSnapshot),
      } as InterviewSessionRecord;

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

  async findTranscriptById(id: string): Promise<TranscriptSentence[]> {
    try {
      const doc = await db.collection("interview_sessions").doc(id).get();
      if (!doc.exists) return [];

      return await hydrateTranscript(id, doc.data() ?? {});
    } catch (error) {
      logger.error(
        `Error fetching transcript for interview session ${id}:`,
        error,
      );
      return [];
    }
  },

  async findStatusById(id: string): Promise<InterviewSessionStatus | null> {
    try {
      const snapshot = await db
        .collection("interview_sessions")
        .where(FieldPath.documentId(), "==", id)
        .select(
          "userId",
          "status",
          "feedbackStatus",
          "feedbackError",
          "feedbackProcessingAt",
          "feedbackId",
          "finalScore",
          "completedAt",
          "feedbackRequestedAt",
          "feedbackCompletedAt",
        )
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0]!;
      const data = doc.data();

      return {
        id: doc.id,
        userId: data.userId as string,
        status: data.status as string,
        feedbackStatus: data.feedbackStatus as string | undefined,
        feedbackError: data.feedbackError as string | null | undefined,
        feedbackProcessingAt: data.feedbackProcessingAt as string | undefined,
        feedbackId: data.feedbackId as string | undefined,
        finalScore: data.finalScore as number | undefined,
        completedAt: data.completedAt as string | undefined,
        feedbackRequestedAt: data.feedbackRequestedAt as string | undefined,
        feedbackCompletedAt: data.feedbackCompletedAt as string | undefined,
      };
    } catch (error) {
      logger.error(`Error fetching session status ${id}:`, error);
      return null;
    }
  },

  async appendTranscriptEntries(
    id: string,
    entries: TranscriptSentence[],
    checkpointBase: number,
  ): Promise<TranscriptAppendResult> {
    try {
      return await db.runTransaction(async (transaction) => {
        const sessionRef = db.collection("interview_sessions").doc(id);
        const sessionSnap = await transaction.get(sessionRef);

        if (!sessionSnap.exists) {
          return {
            success: false,
            reason: "missing",
          } as TranscriptAppendResult;
        }

        const sessionData = sessionSnap.data() ?? {};
        const currentBase = getStoredTranscriptTurnCount(sessionData);
        const currentChunkCount = getStoredTranscriptChunkCount(sessionData);

        if (currentBase !== checkpointBase) {
          return {
            success: false,
            reason: "stale",
            expectedBase: currentBase,
          } as TranscriptAppendResult;
        }

        if (entries.length === 0) {
          return {
            success: true,
            appendedCount: 0,
            nextBase: currentBase,
          } as TranscriptAppendResult;
        }

        const now = new Date().toISOString();
        const nextChunkCount = currentChunkCount + 1;
        const chunkId = String(nextChunkCount).padStart(
          TRANSCRIPT_CHUNK_ID_WIDTH,
          "0",
        );

        transaction.set(
          sessionRef.collection("transcript_chunks").doc(chunkId),
          {
            baseTurn: currentBase,
            entries,
            turnCount: entries.length,
            createdAt: now,
          } satisfies TranscriptChunkRecord,
        );

        transaction.update(sessionRef, {
          transcriptTurnCount: currentBase + entries.length,
          transcriptChunkCount: nextChunkCount,
          lastTranscriptCheckpointAt: now,
        });

        return {
          success: true,
          appendedCount: entries.length,
          nextBase: currentBase + entries.length,
        } as TranscriptAppendResult;
      });
    } catch (error) {
      logger.error(`Error appending transcript for session ${id}:`, error);
      throw new Error("Failed to append transcript");
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

  // findCompletedWithScores can't filter finalScore != null server-side
  // while still sorting primarily by startedAt: Firestore requires an
  // inequality filter's field to be the first orderBy() when one is
  // present, and finalScore isn't the field we want to sort by. Google's
  // own guidance for this exact shape (inequality filter, unrelated sort
  // field, small expected result set) is to over-fetch and filter/reorder
  // in application code — see
  // https://firebase.google.com/docs/firestore/query-data/multiple-range-fields
  //
  // The one thing worth fixing about the old fixed `limit * 3` guess: it's
  // a flat cost paid on every call regardless of how many completed
  // sessions actually lack a score, AND it can silently return fewer than
  // `limit` results for a user whose scoreless rate happens to exceed 2/3
  // (e.g. several recent sessions still mid-feedback-generation, or with
  // failed feedback jobs) even when enough older scored sessions exist.
  // Paginating adaptively fixes both: it stops as soon as it has enough,
  // and keeps fetching (up to a bounded cap) when it doesn't.
  async findCompletedWithScores(
    userId: string,
    limit: number = 50,
  ): Promise<InterviewSessionRecord[]> {
    const BATCH_SIZE = limit * 2;
    const MAX_BATCHES = 3; // bounds worst case to 6x limit documents scanned.

    const results: InterviewSessionRecord[] = [];

    try {
      let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

      for (let batch = 0; batch < MAX_BATCHES; batch++) {
        let query = db
          .collection("interview_sessions")
          .where("userId", "==", userId)
          .where("status", "==", "completed")
          .orderBy("startedAt", "desc")
          .select(
            "templateId",
            "templateSnapshot",
            "userId",
            "status",
            "startedAt",
            "finalScore",
          )
          .limit(BATCH_SIZE);

        if (cursor) {
          query = query.startAfter(cursor);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (data.finalScore != null) {
            results.push({
              id: doc.id,
              ...data,
              templateSnapshot: normalizeSnapshot(data.templateSnapshot),
            } as InterviewSessionRecord);
          }
        }

        cursor = snapshot.docs[snapshot.docs.length - 1];

        // A short page means there's nothing left to paginate into.
        if (snapshot.docs.length < BATCH_SIZE) break;
        if (results.length >= limit) break;
      }

      return results.slice(0, limit);
    } catch (error) {
      logger.error("Error fetching completed sessions with scores:", error);
      return [];
    }
  },
};
