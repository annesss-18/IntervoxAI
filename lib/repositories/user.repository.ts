import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "@/firebase/admin";
import { logger } from "@/lib/logger";
import { UserAlreadyExistsError } from "@/lib/errors";
import { evictTemplateFromCache } from "@/lib/repositories/template.repository";
import { revalidateTag } from "next/cache";
import type { User } from "@/types";

export interface UserStatsDelta {
  activeDelta?: number;
  completedDelta?: number;
  scoreDelta?: number;
  scoreCount?: number;
}

export interface UserStatsSnapshot {
  activeCount: number;
  completedCount: number;
  scoreSum: number;
  scoreCount: number;
}

export const UserRepository = {
  async findById(uid: string): Promise<User | null> {
    try {
      const doc = await db.collection("users").doc(uid).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      logger.error(`UserRepository.findById failed for uid ${uid}:`, error);
      return null;
    }
  },

  async createTransactionally(
    uid: string,
    data: { name: string; email: string; photoURL?: string },
  ): Promise<void> {
    const ref = db.collection("users").doc(uid);
    await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (doc.exists) {
        throw new UserAlreadyExistsError();
      }
      t.set(ref, {
        name: data.name,
        email: data.email,
        ...(data.photoURL ? { photoURL: data.photoURL } : {}),
        stats: {
          activeCount: 0,
          completedCount: 0,
          scoreSum: 0,
          scoreCount: 0,
        },
        createdAt: new Date().toISOString(),
      });
    });
  },

  async updateStats(uid: string, delta: UserStatsDelta): Promise<void> {
    const update: Record<string, FirebaseFirestore.FieldValue> = {};

    if (delta.activeDelta !== undefined && delta.activeDelta !== 0) {
      update["stats.activeCount"] = FieldValue.increment(delta.activeDelta);
    }
    if (delta.completedDelta !== undefined && delta.completedDelta !== 0) {
      update["stats.completedCount"] = FieldValue.increment(
        delta.completedDelta,
      );
    }
    if (delta.scoreDelta !== undefined && delta.scoreDelta !== 0) {
      update["stats.scoreSum"] = FieldValue.increment(delta.scoreDelta);
    }
    if (delta.scoreCount !== undefined && delta.scoreCount !== 0) {
      update["stats.scoreCount"] = FieldValue.increment(delta.scoreCount);
    }

    if (Object.keys(update).length === 0) return;

    try {
      await db.collection("users").doc(uid).update(update);
    } catch (error) {
      logger.error(`UserRepository.updateStats failed for uid ${uid}:`, error);
      throw error;
    }
  },

  async reconcileStats(uid: string): Promise<UserStatsSnapshot> {
    // Snapshot-query the current session counts and write them atomically.
    // Note: the collection queries use snapshot reads, not transactional reads,
    // so a session completing between the queries and the write could introduce
    // minor drift — this is acceptable for a reconciliation that is re-runnable.
    const stats = await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error(`User ${uid} not found during stats reconciliation`);
      }

      const [activeCountSnap, completedSnap] = await Promise.all([
        db
          .collection("interview_sessions")
          .where("userId", "==", uid)
          .where("status", "in", ["setup", "active"])
          .count()
          .get(),
        db
          .collection("interview_sessions")
          .where("userId", "==", uid)
          .where("status", "==", "completed")
          .select("finalScore")
          .get(),
      ]);

      const result: UserStatsSnapshot = {
        activeCount: activeCountSnap.data().count,
        completedCount: 0,
        scoreSum: 0,
        scoreCount: 0,
      };

      completedSnap.docs.forEach((doc) => {
        result.completedCount += 1;
        const data = doc.data();
        if (typeof data.finalScore === "number") {
          result.scoreSum += data.finalScore;
          result.scoreCount += 1;
        }
      });

      transaction.update(userRef, {
        "stats.activeCount": result.activeCount,
        "stats.completedCount": result.completedCount,
        "stats.scoreSum": result.scoreSum,
        "stats.scoreCount": result.scoreCount,
      });

      return result;
    });

    logger.info(
      `Reconciled stats for user ${uid}: active=${stats.activeCount}, completed=${stats.completedCount}, scoreSum=${stats.scoreSum}, scoreCount=${stats.scoreCount}`,
    );

    return stats;
  },

  async updatePhotoURL(uid: string, photoURL: string): Promise<void> {
    try {
      await db.collection("users").doc(uid).update({ photoURL });
    } catch (error) {
      logger.error(
        `UserRepository.updatePhotoURL failed for uid ${uid}:`,
        error,
      );
      throw error;
    }
  },

  async updateProfile(uid: string, data: { name: string }): Promise<void> {
    try {
      await db
        .collection("users")
        .doc(uid)
        .update({
          name: data.name.trim().slice(0, 100),
        });
    } catch (error) {
      logger.error(
        `UserRepository.updateProfile failed for uid ${uid}:`,
        error,
      );
      throw error;
    }
  },

  async deleteAccount(uid: string): Promise<void> {
    const [sessionsSnap, feedbackSnap, templatesSnap] = await Promise.all([
      db
        .collection("interview_sessions")
        .where("userId", "==", uid)
        .select()
        .get(),
      db.collection("feedback").where("userId", "==", uid).select().get(),
      db
        .collection("interview_templates")
        .where("creatorId", "==", uid)
        .select()
        .get(),
    ]);

    const transcriptChunkRefs: FirebaseFirestore.DocumentReference[] = [];
    const MAX_PARALLEL_CHUNKS = 10;

    for (let i = 0; i < sessionsSnap.docs.length; i += MAX_PARALLEL_CHUNKS) {
      const batchDocs = sessionsSnap.docs.slice(i, i + MAX_PARALLEL_CHUNKS);
      const chunkSnapshots = await Promise.all(
        batchDocs.map((doc) =>
          doc.ref.collection("transcript_chunks").select().get(),
        ),
      );

      for (const snap of chunkSnapshots) {
        for (const chunkDoc of snap.docs) {
          transcriptChunkRefs.push(chunkDoc.ref);
        }
      }
    }

    const BATCH_LIMIT = 500;
    const allRefs = [
      db.collection("users").doc(uid),
      ...sessionsSnap.docs.map((d) => d.ref),
      ...feedbackSnap.docs.map((d) => d.ref),
      ...templatesSnap.docs.map((d) => d.ref),
      ...transcriptChunkRefs,
    ];

    for (let i = 0; i < allRefs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      allRefs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // Revoke refresh tokens before deleting the Auth user.
    await auth.revokeRefreshTokens(uid);
    await auth.deleteUser(uid);

    if (templatesSnap.docs.length > 0) {
      revalidateTag("templates-public", "max");
      for (const doc of templatesSnap.docs) {
        revalidateTag(`template:${doc.id}`, "max");
        evictTemplateFromCache(doc.id);
      }
    }

    logger.info(
      `Account ${uid} fully deleted (${allRefs.length} docs removed)`,
    );
  },
};
