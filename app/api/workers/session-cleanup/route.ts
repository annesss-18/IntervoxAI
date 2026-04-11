/**
 * POST /api/workers/session-cleanup
 *
 * QStash-signed worker invoked on a daily cron schedule.
 * Marks "setup" sessions older than 48 hours as "expired" so they stop
 * appearing on users' active dashboards.
 *
 * Schedule this with:
 *   curl -X POST https://qstash.upstash.io/v2/schedules \
 *     -H "Authorization: Bearer $QSTASH_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"destination":"https://your-domain.com/api/workers/session-cleanup","cron":"0 3 * * *"}'
 */

import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { logger } from "@/lib/logger";
import { UserRepository } from "@/lib/repositories/user.repository";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── QStash signature verification (same lazy-init pattern as feedback worker) ──

let receiver: Receiver | null = null;

function getReceiver(): Receiver | null {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentKey || !nextKey) return null;
    if (!receiver) {
        receiver = new Receiver({
            currentSigningKey: currentKey,
            nextSigningKey: nextKey,
        });
    }
    return receiver;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Sessions in "setup" older than this are eligible for expiry. */
const STALE_THRESHOLD_HOURS = 48;
/**
 * Maximum sessions to expire per invocation.
 * Firestore batches cap at 500 writes; 200 keeps us well within limits and
 * gives the worker a comfortable safety margin against the 60-second timeout.
 */
const BATCH_LIMIT = 200;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    // ── 1. Verify QStash signature ─────────────────────────────────────────────
    const qstashReceiver = getReceiver();
    if (!qstashReceiver) {
        logger.error(
            "Worker /api/workers/session-cleanup called but QStash signing keys are not configured",
        );
        return NextResponse.json(
            { error: "Worker not configured" },
            { status: 500 },
        );
    }

    const body = await req.text();
    const signature = req.headers.get("upstash-signature");

    if (!signature) {
        logger.warn(
            "Worker /api/workers/session-cleanup: missing upstash-signature header",
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isValid = await qstashReceiver
        .verify({ body, signature })
        .catch(() => false);

    if (!isValid) {
        logger.warn(
            "Worker /api/workers/session-cleanup: invalid QStash signature",
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Find stale setup sessions ───────────────────────────────────────────
    const cutoff = new Date(
        Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000,
    ).toISOString();

    logger.info(
        `Session cleanup: expiring setup sessions created before ${cutoff}`,
    );

    let snapshot: FirebaseFirestore.QuerySnapshot;
    try {
        // Uses the (status ASC, startedAt ASC) composite index added in
        // firestore.indexes.json for this query.
        snapshot = await db
            .collection("interview_sessions")
            .where("status", "==", "setup")
            .where("startedAt", "<", cutoff)
            .limit(BATCH_LIMIT)
            .select("userId", "startedAt")
            .get();
    } catch (error) {
        logger.error("Session cleanup: Firestore query failed:", error);
        // Return 500 so QStash retries the job.
        return NextResponse.json(
            { error: "Query failed" },
            { status: 500 },
        );
    }

    if (snapshot.empty) {
        logger.info("Session cleanup: no stale sessions found");
        return NextResponse.json({ cleaned: 0 });
    }

    const now = new Date().toISOString();

    // ── 3. Batch-expire sessions ───────────────────────────────────────────────
    // Firestore Admin SDK batches support up to 500 operations.
    // Our BATCH_LIMIT of 200 fits comfortably in a single batch.
    const batch = db.batch();
    const userActiveDelta = new Map<string, number>();

    for (const doc of snapshot.docs) {
        batch.update(doc.ref, {
            status: "expired",
            expiredAt: now,
        });

        // Accumulate stat decrements keyed by userId.
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

    logger.info(`Session cleanup: expired ${snapshot.docs.length} sessions`);

    // ── 4. Decrement activeCount per user (best-effort) ───────────────────────
    // Failures here do not roll back the expiry — the stat can be reconciled
    // later via POST /api/user/reconcile-stats.
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

    return NextResponse.json({ cleaned: snapshot.docs.length });
}