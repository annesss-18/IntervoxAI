"use client";

import { Loader2, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";
import type { ConnectionStatus } from "@/lib/hooks/useLiveInterview";
import { cn } from "@/lib/utils";

interface SpeakerIndicatorProps {
  connectionStatus: ConnectionStatus;
  role: "interviewer" | "candidate";
  isAIResponding: boolean;
  isUserSpeaking: boolean;
  isMuted: boolean;
}
const BAR_HEIGHTS = [14, 28, 20, 36, 26, 32, 18, 30, 22];

export function SpeakerIndicator({
  connectionStatus,
  role,
  isAIResponding,
  isUserSpeaking,
  isMuted,
}: SpeakerIndicatorProps) {
  const isInterviewer = role === "interviewer";
  const isConnecting = connectionStatus === "connecting";
  const isDisconnected =
    connectionStatus === "error" ||
    connectionStatus === "disconnected" ||
    connectionStatus === "idle";
  const isMutedCandidate = !isInterviewer && isMuted;
  const isActive =
    isConnecting || (isInterviewer ? isAIResponding : isUserSpeaking);
  const statusLabel = isConnecting
    ? "Connecting…"
    : isDisconnected
      ? "Connection unavailable"
      : isMutedCandidate
        ? "Microphone muted"
        : isActive
          ? isInterviewer
            ? "AI is speaking"
            : "You are speaking"
          : isInterviewer
            ? "Waiting to respond"
            : "Ready for your answer";
  const iconEl = isConnecting ? (
    <Loader2 className="size-5 animate-spin" />
  ) : isMutedCandidate ? (
    <MicOff className="size-5" />
  ) : isInterviewer ? (
    <Sparkles className="size-5" />
  ) : isActive ? (
    <Mic className="size-5" />
  ) : (
    <Volume2 className="size-5" />
  );
  const iconRing = isConnecting
    ? "border-warning/30 bg-warning/10 text-warning"
    : isMutedCandidate
      ? "border-error/30 bg-error/10 text-error"
      : isActive
        ? isInterviewer
          ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--primary)_60%,transparent)]"
          : "border-info/40 bg-info/15 text-info shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--info)_60%,transparent)]"
        : "border-border bg-surface-2 text-muted-foreground";
  const barGradient = isInterviewer
    ? "from-primary/50 to-primary"
    : "from-info/50 to-info";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border px-4 py-5 transition-colors duration-300",
        "min-h-[160px]",
        isActive
          ? isInterviewer
            ? "border-primary/20 bg-primary/5"
            : "border-info/20 bg-info/5"
          : isMutedCandidate
            ? "border-error/15 bg-error/5"
            : "border-border bg-surface-2/40",
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-12 items-center justify-center rounded-full border-2 transition-all duration-400",
          iconRing,
          isActive && "scale-110",
        )}
      >
        {iconEl}
      </div>

      <div
        className="mb-3.5 flex h-10 items-end justify-center gap-1"
        aria-hidden
      >
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-300",
              isActive
                ? `bg-gradient-to-t ${barGradient} animate-pulse`
                : "bg-border",
            )}
            style={{
              height: isActive
                ? `${Math.max(6, Math.round(h * 0.65))}px`
                : `${4 + (i % 3) * 3}px`,
              animationDelay: `${i * 110}ms`,
              animationDuration: `${700 + (i % 3) * 200}ms`,
            }}
          />
        ))}
      </div>

      <p
        className={cn(
          "text-center text-xs font-medium transition-colors duration-300",
          isActive
            ? isInterviewer
              ? "text-primary"
              : "text-info"
            : isMutedCandidate
              ? "text-error"
              : "text-muted-foreground",
        )}
      >
        {statusLabel}
      </p>
    </div>
  );
}
