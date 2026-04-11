"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Container } from "@/components/layout/Container";
import type {
  FeedbackJobStatus,
  FeedbackStatusResponse,
} from "@/types";
interface FeedbackGenerationStatusProps {
  sessionId: string;
}

const POLL_INITIAL_MS = 2000;
const POLL_BACKOFF_FACTOR = 1.5;
const POLL_MAX_MS = 10000;

export function FeedbackGenerationStatus({
  sessionId,
}: FeedbackGenerationStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<FeedbackJobStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef(POLL_INITIAL_MS);
  const inFlightRef = useRef(false);
  const completionToastShownRef = useRef(false);
  const statusRef = useRef<FeedbackJobStatus>("pending");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async (): Promise<FeedbackJobStatus | null> => {
    if (inFlightRef.current) return statusRef.current;
    inFlightRef.current = true;
    try {
      const res = await fetch(
        `/api/feedback/status?interviewId=${encodeURIComponent(sessionId)}`,
        { method: "GET", cache: "no-store" },
      );
      const data = (await res.json()) as FeedbackStatusResponse;
      if (!res.ok || !data.success || !data.status)
        throw new Error(data.error || "Failed to fetch feedback status");

      const nextStatus = data.status;

      setStatus(nextStatus);
      statusRef.current = nextStatus;
      setError(data.error || null);

      if (nextStatus === "completed") {
        clearPolling();
        if (!completionToastShownRef.current) {
          completionToastShownRef.current = true;
          toast.success("Your interview feedback is ready!");
        }
        router.refresh();
      }

      if (nextStatus === "failed") {
        clearPolling();
      }

      if (nextStatus === "pending" || nextStatus === "processing") {
        pollIntervalRef.current = Math.min(
          pollIntervalRef.current * POLL_BACKOFF_FACTOR,
          POLL_MAX_MS,
        );
      }

      return nextStatus;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to check feedback status",
      );
      return statusRef.current;
    } finally {
      inFlightRef.current = false;
    }
  }, [clearPolling, router, sessionId]);

  const triggerProcessing = useCallback(async (): Promise<FeedbackJobStatus> => {
    const res = await fetch("/api/feedback/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId: sessionId }),
    });
    const data = (await res.json()) as FeedbackStatusResponse;
    if (!res.ok || !data.success || !data.status)
      throw new Error(data.error || "Failed to start feedback processing");
    setStatus(data.status);
    statusRef.current = data.status;
    setError(data.error || null);
    return data.status;
  }, [sessionId]);

  const scheduleNextPoll = useCallback(
    (nextStatus: FeedbackJobStatus | null) => {
      if (nextStatus !== "pending" && nextStatus !== "processing") {
        clearPolling();
        return;
      }

      if (inFlightRef.current) return;

      clearPolling();
      pollTimerRef.current = setTimeout(() => {
        void checkStatus().then((latestStatus) => {
          scheduleNextPoll(latestStatus);
        });
      }, pollIntervalRef.current);
    },
    [checkStatus, clearPolling],
  );

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await triggerProcessing();
      } catch (err) {
        if (isMounted) {
          setStatus("failed");
          statusRef.current = "failed";
          setError(
            err instanceof Error ? err.message : "Failed to start processing",
          );
          return;
        }
      }
      if (!isMounted) return;
      const latestStatus = await checkStatus();
      if (!isMounted) return;
      scheduleNextPoll(latestStatus);
    };
    void init();
    return () => {
      isMounted = false;
      clearPolling();
    };
  }, [checkStatus, clearPolling, triggerProcessing, scheduleNextPoll]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    setStatus("pending");
    statusRef.current = "pending";
    completionToastShownRef.current = false;
    pollIntervalRef.current = POLL_INITIAL_MS; // Reset backoff on retry.
    clearPolling();
    try {
      await triggerProcessing();
      const latestStatus = await checkStatus();
      scheduleNextPoll(latestStatus);
    } catch (err) {
      setStatus("failed");
      statusRef.current = "failed";
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setIsRetrying(false);
    }
  }, [checkStatus, clearPolling, triggerProcessing, scheduleNextPoll]);

  const isFailed = status === "failed";

  const copy = {
    title:
      status === "processing"
        ? "Analysing your interview..."
        : status === "failed"
          ? "Feedback generation failed"
          : "Feedback queued",
    desc:
      status === "processing"
        ? "Your transcript is being evaluated across five dimensions. This usually takes under a minute."
        : status === "pending"
          ? "Your transcript is in the queue. Processing starts automatically."
          : status === "failed"
            ? "Something went wrong generating your feedback. You can retry below."
            : "Interview complete. Preparing your detailed performance report.",
  };

  return (
    <Container size="sm" className="animate-fade-up py-16">
      <div className="gradient-border rounded-2xl p-px">
        <div className="rounded-2xl bg-card px-8 py-14 text-center space-y-6">
          <div className="mx-auto flex size-24 items-center justify-center rounded-2xl">
            {isFailed ? (
              <div className="flex size-20 items-center justify-center rounded-2xl border border-error/30 bg-error/10">
                <AlertCircle className="size-10 text-error" />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl bg-brand-gradient shadow-[0_8px_32px_-8px_color-mix(in_srgb,var(--primary)_60%,var(--accent)_40%)]">
                <Loader2 className="size-10 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-3" role={isFailed ? "alert" : undefined}>
            <Badge
              variant={
                isFailed
                  ? "error"
                  : status === "processing"
                    ? "info"
                    : "secondary"
              }
              className="mx-auto"
            >
              <Sparkles className="size-3" />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            <h2 className="font-serif italic font-normal text-2xl">
              {copy.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {copy.desc}
            </p>
            {error && <p className="text-xs text-error">{error}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isFailed ? (
              <Button onClick={handleRetry} variant="gradient">
                {isRetrying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {isRetrying ? "Retrying..." : "Retry Generation"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void checkStatus()}>
                <RefreshCw className="size-4" />
                Check Now
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href={`/interview/session/${sessionId}`}>
                Back to Session
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}
