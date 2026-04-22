/**
 * Maintenance bypass mode.
 *
 * When MAINTENANCE_BYPASS_MODE=true, authentication checks are replaced with
 * a hardcoded demo user. This allows the site to remain navigable while
 * Firebase and other env variables are being rotated.
 *
 * !! REMOVE THIS FILE after env rotation is complete !!
 *
 * How to enable:
 *   1. Set MAINTENANCE_BYPASS_MODE=true in Vercel env vars (or .env.local).
 *   2. Deploy.
 *
 * How to disable:
 *   1. Remove (or set to "false") MAINTENANCE_BYPASS_MODE.
 *   2. Delete this file and revert all call-sites that import from it.
 */

import type { AuthClaims, User } from "@/types";

export const MAINTENANCE_BYPASS =
  process.env.MAINTENANCE_BYPASS_MODE === "true";

if (MAINTENANCE_BYPASS) {
  console.warn(
    "⚠️  MAINTENANCE_BYPASS_MODE is ACTIVE. All authentication is disabled. " +
      "Remove this flag immediately after env rotation is complete.",
  );
}

/** Hardcoded demo user returned by all auth layers when bypass is active. */
export const DEMO_USER: User = {
  id: "demo-user-maintenance",
  name: "Maintenance User",
  email: "maintenance@intervoxai.com",
  stats: {
    activeCount: 0,
    completedCount: 0,
    scoreSum: 0,
    scoreCount: 0,
  },
};

/** Lightweight claims object matching the demo user. */
export const DEMO_CLAIMS: AuthClaims = {
  id: DEMO_USER.id,
  email: DEMO_USER.email,
};
