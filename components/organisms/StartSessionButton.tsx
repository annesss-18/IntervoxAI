"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Loader2, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StartSessionButtonProps {
  templateId: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
] as const;

type Duration = (typeof DURATION_OPTIONS)[number]["value"];

const StartSessionButton = ({ templateId }: StartSessionButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<Duration>(15);
  const router = useRouter();

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/interview/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, durationMinutes: duration }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error.length > 0
            ? data.error
            : "Failed to create session",
        );
      }

      if (data.sessionId) {
        router.push(`/interview/session/${data.sessionId}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start interview";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Duration selector */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Duration
        </p>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={loading}
              onClick={() => setDuration(value)}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all duration-200",
                "disabled:pointer-events-none disabled:opacity-50",
                duration === value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <Button
        onClick={handleStart}
        disabled={loading}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Initializing…
          </>
        ) : (
          <>
            <PlayCircle className="size-5" />
            Start Interview
          </>
        )}
      </Button>
    </div>
  );
};

export default StartSessionButton;
