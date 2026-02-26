import { db } from "@/firebase/admin";
import { Feedback } from "@/types";
import { logger } from "@/lib/logger";

export const FeedbackRepository = {
  async create(
    data: Omit<Feedback, "id" | "createdAt"> & { createdAt: string },
  ): Promise<string> {
    try {
      const docId = `${data.userId}_${data.interviewId}`;
      await db.collection("feedback").doc(docId).set(data, { merge: true });
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

      const snapshot = await db
        .collection("feedback")
        .where("interviewId", "==", interviewId)
        .where("userId", "==", userId)
        .limit(5)
        .get();

      if (snapshot.empty) return null;

      const latest = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Feedback)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];

      return latest || null;
    } catch (error) {
      logger.error(
        `Error fetching feedback for interview ${interviewId}:`,
        error,
      );
      return null;
    }
  },
};
