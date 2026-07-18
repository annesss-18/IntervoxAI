import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { logger } from "@/lib/logger";
import { UserRepository } from "@/lib/repositories/user.repository";
import { verifyQstashRequest } from "@/lib/server/qstash";

export const runtime = "nodejs";
export const maxDuration = 60;

const SETUP_STALE_THRESHOLD_HOURS = 48;
const ACTIVE_STALE_THRESHOLD_HOURS = 12;
const BATCH_LIMIT = 200;

export async function POST(req: NextRequest) {
  const verified = await verifyQstashRequest(
    req,
    "/api/workers/session-cleanup",
  );
  if (!verified.ok) return verified.response;

  const setupCutoff = new Date(
    Date.now() - SETUP_STALE_THRESHOLD_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const activeCutoff = new Date(
    Date.now() - ACTIVE_STALE_THRESHOLD_HOURS * 60 * 60 * 1000,
  ).toISOString();

  logger.info(
    `Session cleanup: expiring setup sessions before ${setupCutoff} and active sessions before ${activeCutoff}`,
  );

  let setupSnapshot: FirebaseFirestore.QuerySnapshot;
  let activeSnapshot: FirebaseFirestore.QuerySnapshot;
  try {
    [setupSnapshot, activeSnapshot] = await Promise.all([
      db
        .collection("interview_sessions")
        .where("status", "==", "setup")
        .where("startedAt", "<", setupCutoff)
        .limit(BATCH_LIMIT)
        .select("userId", "startedAt")
        .get(),
      db
        .collection("interview_sessions")
        .where("status", "==", "active")
        .where("activatedAt", "<", activeCutoff)
        .limit(BATCH_LIMIT)
        .select("userId", "activatedAt")
        .get(),
    ]);
  } catch (error) {
    logger.error("Session cleanup: Firestore query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const staleDocs = [...setupSnapshot.docs, ...activeSnapshot.docs];
  if (staleDocs.length === 0) {
    logger.info("Session cleanup: no stale sessions found");
    return NextResponse.json({ success: true, cleaned: 0 });
  }

  const now = new Date().toISOString();

  const batch = db.batch();
  const userActiveDelta = new Map<string, number>();

  for (const doc of staleDocs) {
    batch.update(doc.ref, {
      status: "expired",
      expiredAt: now,
    });

    const uid = doc.data().userId as string;
    if (uid) {
      userActiveDelta.set(uid, (userActiveDelta.get(uid) ?? 0) - 1);
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    logger.error("Session cleanup: batch write failed:", error);
    return NextResponse.json({ error: "Batch write failed" }, { status: 500 });
  }

  logger.audit("sessions.expired", {
    cleaned: staleDocs.length,
    setupCleaned: setupSnapshot.docs.length,
    activeCleaned: activeSnapshot.docs.length,
    setupCutoff,
    activeCutoff,
  });

  // Stats are best-effort after the session expiry batch commits.
  await Promise.allSettled(
    Array.from(userActiveDelta.entries()).map(([uid, delta]) =>
      UserRepository.updateStats(uid, { activeDelta: delta }).catch((err) =>
        logger.warn(
          `Session cleanup: stats update failed for user ${uid}:`,
          err,
        ),
      ),
    ),
  );

  return NextResponse.json({
    success: true,
    cleaned: staleDocs.length,
    setupCleaned: setupSnapshot.docs.length,
    activeCleaned: activeSnapshot.docs.length,
  });
}
