import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "@/firebase/admin";
import { logger } from "@/lib/logger";
import { UserAlreadyExistsError } from "@/lib/errors/auth.errors";
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
  /**
   * Fetch a user document by UID.
   * Used by the auth service, feedback-runner email step, and status routes.
   * Returns null when the document does not exist.
   */
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

  /**
   * Transactionally create a user document.
   * Throws an error whose message contains "already-exists" when the document
   * already exists, so callers can distinguish first-time sign-up from
   * Google re-authentication.
   */
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

  /**
   * Atomically update the pre-aggregated stat counters on the user document.
   * All deltas are applied with FieldValue.increment so concurrent updates
   * from different workers do not clobber each other.
   */
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

  /**
   * Recompute aggregate stats from source-of-truth interview session data.
   * This is used by the maintenance API and as a dashboard self-heal path
   * whenever the stored counters look suspicious.
   */
  async reconcileStats(uid: string): Promise<UserStatsSnapshot> {
    const sessionsSnapshot = await db
      .collection("interview_sessions")
      .where("userId", "==", uid)
      .select("status", "finalScore")
      .get();

    const stats: UserStatsSnapshot = {
      activeCount: 0,
      completedCount: 0,
      scoreSum: 0,
      scoreCount: 0,
    };

    sessionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      if (data.status === "completed") {
        stats.completedCount += 1;

        if (typeof data.finalScore === "number") {
          stats.scoreSum += data.finalScore;
          stats.scoreCount += 1;
        }

        return;
      }

      if (data.status === "setup" || data.status === "active") {
        stats.activeCount += 1;
      }
    });

    await db.collection("users").doc(uid).update({
      "stats.activeCount": stats.activeCount,
      "stats.completedCount": stats.completedCount,
      "stats.scoreSum": stats.scoreSum,
      "stats.scoreCount": stats.scoreCount,
    });

    logger.info(
      `Reconciled stats for user ${uid}: active=${stats.activeCount}, completed=${stats.completedCount}, scoreSum=${stats.scoreSum}, scoreCount=${stats.scoreCount}`,
    );

    return stats;
  },

  /**
   * Update the user's avatar URL.
   * Called on every sign-in so the stored photoURL stays current if the user
   * updates their Google profile picture.
   */
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

  /**
   * Update the user's display name.
   * Trims whitespace and caps at 100 characters.
   */
  async updateProfile(
    uid: string,
    data: { name: string },
  ): Promise<void> {
    try {
      await db.collection("users").doc(uid).update({
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

  /**
   * Permanently delete a user account and all associated data.
   *
   * 1. Batch-deletes the user document, all interview sessions, and all feedback.
   * 2. Removes the Firebase Auth user last so Firestore cleanup always runs first.
   */
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

    // Collect transcript_chunks subcollection refs for each session.
    // Firestore does not cascade deletes to subcollections.
    const transcriptChunkRefs: FirebaseFirestore.DocumentReference[] = [];

    for (const sessionDoc of sessionsSnap.docs) {
      const chunksSnap = await sessionDoc.ref
        .collection("transcript_chunks")
        .select()
        .get();
      for (const chunkDoc of chunksSnap.docs) {
        transcriptChunkRefs.push(chunkDoc.ref);
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

    // Delete the Firebase Auth user last
    await auth.deleteUser(uid);

    // Invalidate caches for all deleted templates so stale pages are not
    // served after the author has removed their account.
    if (templatesSnap.docs.length > 0) {
      revalidateTag("templates-public", "max");
      for (const doc of templatesSnap.docs) {
        revalidateTag(`template:${doc.id}`, "max");
        evictTemplateFromCache(doc.id);
      }
    }

    logger.info(`Account ${uid} fully deleted (${allRefs.length} docs removed)`);
  },
};
