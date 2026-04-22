"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Temporary maintenance banner shown during the env-variable rotation period.
 *
 * REMOVE THIS COMPONENT (and its import in the landing page) once all
 * environment variables have been rotated and full functionality is restored.
 */
export function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="relative border-b border-warning/30 bg-warning/10 px-4 py-3 text-center text-sm text-foreground backdrop-blur-sm"
    >
      <div className="container-app flex items-center justify-center gap-2.5">
        <AlertTriangle className="size-4 shrink-0 text-warning" />
        <p>
          <strong className="font-semibold">Scheduled maintenance</strong>
          <span className="mx-1.5 hidden text-foreground/40 sm:inline">
            —
          </span>
          <span className="hidden sm:inline">
            We&apos;re performing a security update. Some features may be
            temporarily unavailable. Thank you for your patience.
          </span>
          <span className="sm:hidden">
            Some features may be temporarily unavailable.
          </span>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/50 transition-colors hover:bg-warning/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40"
          aria-label="Dismiss maintenance notice"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
