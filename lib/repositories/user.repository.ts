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

  /**
   * Permanently delete a user account and all associated data.
   *
   * 1. Collects all document refs to delete (user, sessions, feedback,
   *    templates, and transcript_chunks subcollections).
   * 2. Transcript chunk subcollections are fetched in parallel (not
   *    sequentially) to avoid O(N) serial round-trips for active users.
   * 3. Deletes everything in Firestore batches (≤500 ops each).
   * 4. Removes the Firebase Auth user last so Firestore cleanup always
   *    runs first.
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

    // FIX: Fetch transcript_chunks subcollections in parallel instead of
    // sequentially. The previous implementation awaited each read inside a
    // for-loop, producing O(N) serial Firestore round-trips (~40ms each).
    // A user with 50 sessions would stall for ~2 seconds before deletion began.
    const chunkSnapshots = await Promise.all(
      sessionsSnap.docs.map((doc) =>
        doc.ref.collection("transcript_chunks").select().get(),
      ),
    );
    const transcriptChunkRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const snap of chunkSnapshots) {
      for (const chunkDoc of snap.docs) {
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

    // Revoke all refresh tokens first so any in-flight Firebase ID tokens
    // (valid for up to 1 hour) are invalidated immediately. Revoking before
    // deleteUser means that if deleteUser fails transiently the account is
    // still locked out and cannot be used to obtain new tokens in the interim.
    await auth.revokeRefreshTokens(uid);
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

    logger.info(
      `Account ${uid} fully deleted (${allRefs.length} docs removed)`,
    );
  },
};
