"use client";

import { memo } from "react";
import { Bot, MicOff, Radio, Sparkles, UserRound, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewCaptionsProps {
  caption: string | null;
  isLive: boolean;
  isMuted: boolean;
  focus: "user" | "model";
  speakerName?: string;
  speakerRole?: string;
  className?: string;
}

function getDisplayCaption(text: string, maxChars = 310): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;

  const tail = normalized.slice(-maxChars);
  const sentenceStart = tail.search(/[.!?]\s/);
  return sentenceStart > 0 && sentenceStart < tail.length - 44
    ? `…${tail.slice(sentenceStart + 2)}`
    : `…${tail}`;
}

export const InterviewCaptions = memo(function InterviewCaptions({
  caption,
  isLive,
  isMuted,
  focus,
  speakerName,
  speakerRole,
  className,
}: InterviewCaptionsProps) {
  const isUserTile = focus === "user";
  const displayText = caption ? getDisplayCaption(caption) : "";
  const name = speakerName ?? (isUserTile ? "You" : "AI Interviewer");
  const role = speakerRole ?? (isUserTile ? "Candidate" : "Your interviewer");
  const state = isLive
    ? isUserTile
      ? "Listening to your answer"
      : "Speaking now"
    : isUserTile && isMuted
      ? "Microphone muted"
      : isUserTile
        ? "Ready for your answer"
        : "Waiting for the next prompt";
  const placeholder =
    isUserTile && isMuted
      ? "Unmute your microphone when you are ready to answer."
      : isUserTile
        ? "Your words will appear here as a live subtitle."
        : "The interviewer’s next question will appear here.";
  const AvatarIcon = isUserTile ? UserRound : Bot;

  return (
    <section
      className={cn(
        "relative isolate flex min-h-[280px] overflow-hidden rounded-2xl border p-4 sm:min-h-[340px] sm:p-5",
        "bg-surface-2/35 transition-[border-color,box-shadow,background] duration-300",
        isLive
          ? isUserTile
            ? "border-info/45 bg-info/6 shadow-[0_16px_40px_-24px_color-mix(in_srgb,var(--info)_85%,transparent)]"
            : "border-primary/45 bg-primary/6 shadow-[0_16px_40px_-24px_color-mix(in_srgb,var(--primary)_85%,transparent)]"
          : "border-border",
        className,
      )}
      aria-label={`${name} interview tile`}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 opacity-70",
          isUserTile
            ? "bg-[radial-gradient(circle_at_50%_32%,color-mix(in_srgb,var(--info)_18%,transparent),transparent_43%)]"
            : "bg-[radial-gradient(circle_at_50%_32%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_43%)]",
        )}
      />

      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border",
              isUserTile
                ? "border-info/30 bg-info/10 text-info"
                : "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            <AvatarIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {name}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{role}</p>
          </div>
        </div>

        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            isLive
              ? isUserTile
                ? "bg-info/12 text-info"
                : "bg-primary/12 text-primary"
              : isUserTile && isMuted
                ? "bg-error/10 text-error"
                : "bg-background/50 text-muted-foreground",
          )}
        >
          {isLive ? (
            <Radio className="size-3 animate-pulse" />
          ) : isUserTile && isMuted ? (
            <MicOff className="size-3" />
          ) : (
            <Volume2 className="size-3" />
          )}
          {isLive ? "Live" : state}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center pb-20 pt-4 sm:pb-24">
        <div className="relative">
          <div
            className={cn(
              "absolute -inset-4 rounded-full border opacity-50 transition-transform duration-500",
              isUserTile ? "border-info/20" : "border-primary/20",
              isLive && "scale-110",
            )}
          />
          <div
            className={cn(
              "relative flex size-20 items-center justify-center rounded-full border-2 shadow-[var(--shadow-md)] sm:size-24",
              isUserTile
                ? "border-info/35 bg-info/12 text-info"
                : "border-primary/35 bg-primary/12 text-primary",
              isLive && "animate-pulse",
            )}
          >
            {isUserTile ? (
              <UserRound className="size-9 sm:size-10" />
            ) : (
              <Sparkles className="size-9 sm:size-10" />
            )}
          </div>
        </div>
        <p className="mt-5 text-center text-xs font-medium text-muted-foreground">
          {state}
        </p>
      </div>

      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/5 bg-background/82 p-3 shadow-[var(--shadow-sm)] backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-4">
        <div className="mb-1.5 flex items-center gap-1.5">
          {isLive && <Radio className="size-2.5 animate-pulse text-primary" />}
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {isLive
              ? "Live subtitle"
              : displayText
                ? "Last response"
                : "Subtitle"}
          </span>
        </div>
        {displayText ? (
          <p
            className="overflow-hidden text-sm leading-6 text-foreground sm:text-[15px]"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
            }}
            aria-live={isLive ? "polite" : undefined}
          >
            {displayText}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {placeholder}
          </p>
        )}
      </div>
    </section>
  );
});
