import { db } from "@/firebase/admin";
import { Feedback } from "@/types";
import { logger } from "@/lib/logger";

export const FeedbackRepository = {
  async create(
    data: Omit<Feedback, "id" | "createdAt"> & { createdAt: string },
  ): Promise<string> {
    try {
      const docId = `${data.userId}_${data.interviewId}`;
      const ref = db.collection("feedback").doc(docId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
          // Idempotent: feedback already exists, do not overwrite
          logger.info(`Feedback ${docId} already exists, skipping create`);
          return;
        }
        tx.set(ref, data); // Full replacement — no merge
      });
      return docId;
    } catch (error) {
      logger.error("Error creating feedback:", error);
      throw new Error("Failed to create feedback");
    }
  },

  async findByInterviewId(
    interviewId: string,
    userId: string,
  ): Promise<Feedback | null> {
    try {
      const deterministicId = `${userId}_${interviewId}`;
      const deterministicDoc = await db
        .collection("feedback")
        .doc(deterministicId)
        .get();
      if (deterministicDoc.exists) {
        return {
          id: deterministicDoc.id,
          ...deterministicDoc.data(),
        } as Feedback;
      }

      // Fallback: query by compound fields with server-side ordering.
      // Requires index: (userId ASC, interviewId ASC, createdAt DESC)
      const snapshot = await db
        .collection("feedback")
        .where("interviewId", "==", interviewId)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0]!;
      return { id: doc.id, ...doc.data() } as Feedback;
    } catch (error) {
      logger.error(
        `Error fetching feedback for interview ${interviewId}:`,
        error,
      );
      return null;
    }
  },
};
