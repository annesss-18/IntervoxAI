import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/firebase/admin";
import { UserAlreadyExistsError } from "@/lib/errors/auth.errors";
import { logger } from "@/lib/logger";
import { User } from "@/types";

export interface UserStatsDelta {
  activeDelta?: number;
  completedDelta?: number;
  scoreDelta?: number;
  scoreCount?: number;
}

export const UserRepository = {
  findById: async (uid: string): Promise<User | null> => {
    try {
      const doc = await db.collection("users").doc(uid).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      logger.error(`Error finding user by id ${uid}:`, error);
      throw new Error("Failed to fetch user");
    }
  },

  createTransactionally: async (
    uid: string,
    data: Omit<User, "id">,
  ): Promise<void> => {
    try {
      await db.runTransaction(async (t) => {
        const ref = db.collection("users").doc(uid);
        const doc = await t.get(ref);
        if (doc.exists) {
          throw new UserAlreadyExistsError();
        }
        t.set(ref, data);
      });
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw error;
      }
      logger.error(`Error creating user transactionally ${uid}:`, error);
      throw new Error("Failed to create user");
    }
  },

  // Update pre-aggregated session stats atomically without blocking the primary write path.
  updateStats: async (uid: string, delta: UserStatsDelta): Promise<void> => {
    const update: Record<string, unknown> = {};
    if (delta.activeDelta !== undefined) {
      update["stats.activeCount"] = FieldValue.increment(delta.activeDelta);
    }
    if (delta.completedDelta !== undefined) {
      update["stats.completedCount"] = FieldValue.increment(
        delta.completedDelta,
      );
    }
    if (delta.scoreDelta !== undefined) {
      update["stats.scoreSum"] = FieldValue.increment(delta.scoreDelta);
    }
    if (delta.scoreCount !== undefined) {
      update["stats.scoreCount"] = FieldValue.increment(delta.scoreCount);
    }

    if (Object.keys(update).length === 0) return;

    try {
      await db.collection("users").doc(uid).update(update);
    } catch (error) {
      logger.error(`Error updating stats for user ${uid}:`, error);
      throw error;
    }
  },

  // Sync the stored Google avatar when it changes at sign-in time.
  updatePhotoURL: async (uid: string, photoURL: string): Promise<void> => {
    try {
      await db.collection("users").doc(uid).update({ photoURL });
    } catch (error) {
      logger.error(`Error updating photoURL for user ${uid}:`, error);
      throw error;
    }
  },
};
