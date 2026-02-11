"use client";

import { Loader2, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";
import type { ConnectionStatus } from "@/lib/hooks/useLiveInterview";
import { cn } from "@/lib/utils";

interface SpeakerIndicatorProps {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Indicator role */
  role: "interviewer" | "candidate";
  /** Whether the AI is currently responding */
  isAIResponding: boolean;
  /** Whether the user is currently speaking */
  isUserSpeaking: boolean;
  /** Whether the microphone is muted */
  isMuted: boolean;
}

/**
 * Compact waveform-style voice activity indicator.
 */
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

  const statusText = isConnecting
    ? "Connecting..."
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

  return (
    <div className="flex min-h-[168px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/30 px-4 py-4">
      <div
        className={cn(
          "mb-3 flex size-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
          isConnecting
            ? "border-warning/30 bg-warning/10 text-warning"
            : isMutedCandidate
              ? "border-error/30 bg-error/10 text-error"
              : isActive
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground",
        )}
      >
        {isConnecting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : isMutedCandidate ? (
          <MicOff className="size-5" />
        ) : isInterviewer ? (
          <Sparkles className="size-5" />
        ) : isActive ? (
          <Mic className="size-5" />
        ) : (
          <Volume2 className="size-5" />
        )}
      </div>

      <div
        className="mb-3 flex h-12 items-end justify-center gap-1.5"
        aria-hidden
      >
        {[18, 34, 24, 40, 30, 36, 22].map((height, index) => (
          <span
            key={index}
            className={cn(
              "w-1.5 rounded-full transition-all duration-300",
              isActive
                ? isInterviewer
                  ? "from-primary-400/80 to-primary animate-pulse bg-gradient-to-t"
                  : "from-info/80 to-info-400 animate-pulse bg-gradient-to-t"
                : "bg-border/70",
            )}
            style={{
              height: `${isActive ? Math.max(10, Math.round(height * 0.55)) : 8 + (index % 2) * 4}px`,
              animationDelay: `${index * 120}ms`,
            }}
          />
        ))}
      </div>

      <p className="text-foreground text-center text-xs font-medium sm:text-sm">
        {statusText}
      </p>
    </div>
  );
}

export default SpeakerIndicator;
