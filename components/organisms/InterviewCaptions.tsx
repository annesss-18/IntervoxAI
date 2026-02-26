"use client";

import { MicOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewCaptionsProps {
  currentCaption: string | null;
  currentSpeaker: "user" | "model" | null;
  isMuted: boolean;
  focus: "user" | "model";
  fallbackCaption?: string | null;
  className?: string;
}

// Truncate long captions at a sentence boundary.
function getDisplayCaption(text: string, maxChars = 280): string {
  const norm = text.replace(/\s+/g, " ").trim();
  if (norm.length <= maxChars) return norm;
  const tail = norm.slice(-maxChars);
  const breakIdx = tail.search(/[.!?]\s/);
  return breakIdx > 0 && breakIdx < tail.length - 32
    ? `…${tail.slice(breakIdx + 2)}`
    : `…${tail}`;
}

export function InterviewCaptions({
  currentCaption,
  currentSpeaker,
  isMuted,
  focus,
  fallbackCaption,
  className,
}: InterviewCaptionsProps) {
  const isUserPanel = focus === "user";
  const isLive = currentSpeaker === focus && !!currentCaption;
  const activeText = isLive ? currentCaption : fallbackCaption;
  const displayText = activeText ? getDisplayCaption(activeText) : "";

  const placeholder =
    isUserPanel && isMuted
      ? "Microphone is muted — unmute to respond."
      : isUserPanel
        ? "Your answer will appear here as you speak."
        : "The interviewer's prompt will appear here.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-3 transition-all duration-300",
        isLive
          ? isUserPanel
            ? "border-info/30 bg-info/5"
            : "border-primary/30 bg-primary/5"
          : "border-border bg-surface-2/40",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {isLive ? (
          <span
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider",
              isUserPanel ? "text-info" : "text-primary",
            )}
          >
            <Radio className="size-2.5 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Recent
          </span>
        )}
      </div>

      {displayText ? (
        <p className="custom-scrollbar max-h-[88px] overflow-y-auto pr-1 text-sm leading-relaxed text-foreground/90">
          {displayText}
        </p>
      ) : (
        <div className="flex min-h-[52px] items-center gap-2.5">
          {isUserPanel && isMuted && (
            <MicOff className="size-4 shrink-0 text-error" />
          )}
          <p className="text-sm text-muted-foreground">{placeholder}</p>
        </div>
      )}
    </div>
  );
}
