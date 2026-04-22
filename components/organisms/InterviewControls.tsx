"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ConnectionStatus } from "@/lib/hooks/useLiveInterview";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog";
import { cn } from "@/lib/utils";

interface InterviewControlsProps {
  connectionStatus: ConnectionStatus;
  elapsedTime: number;
  isMuted: boolean;
  isSubmitting: boolean;
  onToggleMute: () => void;
  onEndInterview: () => void;
  /**
   * Total session duration in seconds.
   * Defaults to 900 (15 min) for backward compatibility.
   */
  totalSeconds?: number;
}

export function InterviewControls({
  connectionStatus,
  elapsedTime,
  isMuted,
  isSubmitting,
  onToggleMute,
  onEndInterview,
  totalSeconds = 900,
}: InterviewControlsProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const remainingSeconds = Math.max(0, totalSeconds - elapsedTime);
  const isTimeUp = elapsedTime >= totalSeconds;
  // Show the warning section for the last 60 seconds of the session.
  const isWarning = elapsedTime >= totalSeconds - 60;
  // Switch to a live per-second countdown in the last 60 seconds.
  // Before that, show elapsed time.
  const isCountdownMode = isWarning && !isTimeUp;

  /** Format seconds as MM:SS */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (
        e.key === "m" &&
        !e.ctrlKey &&
        !e.metaKey &&
        connectionStatus === "connected"
      ) {
        e.preventDefault();
        onToggleMute();
      }
    },
    [connectionStatus, onToggleMute],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  const statusVariant = isConnected
    ? "success"
    : isConnecting
      ? "warning"
      : "error";

  const statusLabel = isConnected
    ? "Connected"
    : isConnecting
      ? "Connecting…"
      : "Disconnected";

  const handleConfirmEnd = () => {
    setShowEndConfirm(false);
    onEndInterview();
  };

  // ── Time display logic ─────────────────────────────────────────────────
  //
  // Before the warning threshold (last 60 s): show elapsed time as MM:SS.
  // In the warning window (last 60 s to 0): show remaining time as MM:SS
  //   with an escalating color and a "left" label.
  // At time-up: show "0:00 left" in error color.
  //
  // This gives candidates clear, actionable time awareness in the final
  // minute rather than just a static "1m remaining" badge.
  const timeDisplay =
    isCountdownMode || isTimeUp
      ? `${formatTime(remainingSeconds)} left`
      : formatTime(elapsedTime);

  const timeColor = isTimeUp
    ? "text-error"
    : isWarning
      ? "text-warning"
      : undefined;

  const timeBorderClass = isTimeUp
    ? "border-error/40 bg-error/8"
    : isWarning
      ? "border-warning/40 bg-warning/8"
      : "border-border bg-surface-2";

  return (
    <>
      <div className="w-full px-4 pb-4">
        <div
          className={cn(
            "mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3",
            "rounded-2xl border bg-card/95 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-xl",
            isWarning ? "border-warning/30" : "border-border/70",
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Badge variant={statusVariant} dot className="gap-1.5 capitalize">
              {isConnected ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {statusLabel}
            </Badge>

            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors duration-300",
                timeBorderClass,
              )}
            >
              <Clock className={cn("size-3.5 opacity-70", timeColor)} />
              <span
                className={cn(
                  "font-mono text-sm tabular-nums font-medium",
                  timeColor,
                )}
              >
                {timeDisplay}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              disabled={!isConnected}
              title={isMuted ? "Unmute (M)" : "Mute (M)"}
              aria-label={
                isMuted ? "Unmute microphone (M)" : "Mute microphone (M)"
              }
              className={cn(
                "flex size-10 items-center justify-center rounded-full border transition-all duration-200",
                "disabled:pointer-events-none disabled:opacity-40",
                isMuted
                  ? "border-error/40 bg-error/10 text-error hover:bg-error/15"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-primary/30 hover:bg-primary/8 hover:text-primary",
              )}
            >
              {isMuted ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              disabled={isSubmitting}
              className={cn(
                "flex items-center gap-2 rounded-full border border-error/40 bg-error/10 px-4 py-2 text-sm font-semibold text-error",
                "transition-all duration-200 hover:bg-error hover:text-white hover:border-error",
                "disabled:pointer-events-none disabled:opacity-50",
                "min-w-[140px] justify-center",
              )}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PhoneOff className="size-4" />
              )}
              {isSubmitting ? "Submitting…" : "End Interview"}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End this interview?</DialogTitle>
            <DialogDescription>
              Your session will be submitted for feedback generation. You
              won&apos;t be able to resume — make sure you&apos;ve answered all
              questions before ending.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
              Keep Going
            </Button>
            <Button
              onClick={handleConfirmEnd}
              className="gap-2 border border-error/40 bg-error/10 text-error hover:bg-error hover:text-white hover:border-error"
            >
              <PhoneOff className="size-4" />
              End &amp; Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
