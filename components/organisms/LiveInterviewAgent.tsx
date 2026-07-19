"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, User2 } from "lucide-react";
import { useLiveInterview } from "@/lib/hooks/useLiveInterview";
import { useAudioCapture } from "@/lib/hooks/useAudioCapture";
import { useAudioPlayback } from "@/lib/hooks/useAudioPlayback";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import type { InterviewSessionDetail } from "@/types";
import { InterviewSetupCard } from "@/components/organisms/InterviewSetupCard";
import { AudioTestCard } from "@/components/organisms/AudioTestCard";
import { InterviewControls } from "@/components/organisms/InterviewControls";
import { SpeakerIndicator } from "@/components/organisms/SpeakerIndicator";
import { InterviewCaptions } from "@/components/organisms/InterviewCaptions";

interface LiveInterviewAgentProps {
  interview: InterviewSessionDetail;
  sessionId: string;
}

type InterviewPhase =
  "setup" | "audio_test" | "active" | "ending" | "completed" | "submit_failed";

export function LiveInterviewAgent({
  interview,
  sessionId,
}: LiveInterviewAgentProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  // Keep callbacks aligned with the latest phase.
  const phaseRef = useRef<InterviewPhase>("setup");
  const sessionActivatedRef = useRef(interview.status !== "setup");
  const handleEndInterviewRef = useRef<(() => void) | null>(null);
  const [resumeText, setResumeText] = useState<string | undefined>(
    interview.resumeText,
  );
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const timeUpTriggeredRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const totalSeconds = (interview.durationMinutes ?? 15) * 60;

  const {
    status: connectionStatus,
    error: connectionError,
    transcript,
    isAIResponding,
    isUserSpeaking,
    currentCaption,
    currentSpeaker,
    elapsedTime,
    connect,
    disconnect,
    sendAudio,
    onAudioReceived,
    releaseHold,
    flushPendingTranscript,
  } = useLiveInterview({
    sessionId,
    templateId: interview.templateId,
    initialTranscript: interview.transcript,
    holdInitialPrompt: true,
    onInterruption: () => {
      clearAudioQueue();
    },
    onInterviewComplete: () => {
      logger.info("Interview naturally completed via closing phrase detection");
      toast.info("Interview completed — generating your feedback…");
      handleEndInterviewRef.current?.();
    },
  });

  const { error: captureError, startCapture, stopCapture } = useAudioCapture();
  const {
    queueAudio,
    clearQueue: clearAudioQueue,
    stop: stopPlayback,
  } = useAudioPlayback();

  useEffect(() => {
    onAudioReceived((base64Data) => {
      queueAudio(base64Data);
    });
  }, [onAudioReceived, queueAudio]);

  const handleAudioChunk = useCallback(
    (chunk: string) => {
      if (!isMuted) sendAudio(chunk);
    },
    [sendAudio, isMuted],
  );

  useEffect(() => {
    if (
      phase !== "active" ||
      timeUpTriggeredRef.current ||
      elapsedTime < totalSeconds
    ) {
      return;
    }
    timeUpTriggeredRef.current = true;
    logger.info(
      `Session ${sessionId} reached ${totalSeconds}s limit — auto-ending interview.`,
    );
    toast.info("Time is up — wrapping up your interview…");
    handleEndInterviewRef.current?.();
  }, [elapsedTime, totalSeconds, phase, sessionId]);

  const handleResumeUploaded = useCallback(
    async (text: string) => {
      const previousResumeText = resumeText;
      setResumeText(text);
      setIsUpdatingSession(true);
      try {
        const res = await fetch(`/api/interview/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: text }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to save resume");
        }
      } catch (error) {
        setResumeText(previousResumeText);
        logger.error("Failed to update session with resume:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save resume to the session",
        );
      } finally {
        setIsUpdatingSession(false);
      }
    },
    [resumeText, sessionId],
  );

  const handleResumeClear = useCallback(async () => {
    const previousResumeText = resumeText;
    setResumeText(undefined);
    setIsUpdatingSession(true);
    try {
      const res = await fetch(`/api/interview/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: "" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to clear resume");
      }
    } catch (error) {
      setResumeText(previousResumeText);
      logger.error("Failed to clear resume:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to clear resume",
      );
    } finally {
      setIsUpdatingSession(false);
    }
  }, [resumeText, sessionId]);

  const handleEnterAudioTest = async () => {
    setPhase("audio_test");
    try {
      await connect();
    } catch (error) {
      logger.warn("Background connection failed during audio test:", error);
    }
  };

  const activateSession = useCallback(async () => {
    if (sessionActivatedRef.current || interview.status !== "setup") {
      sessionActivatedRef.current = true;
      return;
    }

    const res = await fetch(`/api/interview/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : "Failed to start interview session";
      throw new Error(message);
    }

    sessionActivatedRef.current = true;
  }, [interview.status, sessionId]);

  const handleStartInterview = async () => {
    try {
      await activateSession();
      phaseRef.current = "active";
      setPhase("active");
      await startCapture(handleAudioChunk, { vadSensitivity: 60 });
      await connect();
      releaseHold();
    } catch (error) {
      stopCapture();
      disconnect();
      logger.error("Failed to start interview:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start interview",
      );
      phaseRef.current = "audio_test";
      setPhase("audio_test");
    }
  };

  const handleEndInterview = useCallback(async () => {
    if (isSubmittingRef.current || phaseRef.current === "completed") return;
    isSubmittingRef.current = true;
    phaseRef.current = "ending";
    setPhase("ending");
    setIsSubmitting(true);

    try {
      stopCapture();
      stopPlayback();
      const finalTranscript = flushPendingTranscript();
      disconnect();

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: sessionId,
          transcript: finalTranscript,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to queue feedback");
      }

      phaseRef.current = "completed";
      setPhase("completed");
      router.push(`/interview/session/${sessionId}/feedback`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `${error.message}. You can retry below.`
          : "Submission failed. You can retry below.",
      );
      phaseRef.current = "submit_failed";
      setPhase("submit_failed");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    stopCapture,
    stopPlayback,
    flushPendingTranscript,
    disconnect,
    sessionId,
    router,
  ]);

  useEffect(() => {
    handleEndInterviewRef.current = () => {
      void handleEndInterview();
    };

    return () => {
      handleEndInterviewRef.current = null;
    };
  }, [handleEndInterview]);

  const handleRetrySubmit = useCallback(() => {
    phaseRef.current = "active";
    setPhase("active");
    setTimeout(() => void handleEndInterview(), 0);
  }, [handleEndInterview]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  const transcriptLength = transcript.length;
  let latestModelCaption: string | null = null;
  let latestUserCaption: string | null = null;

  if (transcriptLength > 0) {
    for (let i = transcriptLength - 1; i >= 0; i--) {
      const e = transcript[i];
      if (!e) continue;
      if (
        latestModelCaption === null &&
        e.role === "model" &&
        e.content.trim()
      ) {
        latestModelCaption = e.content;
      }
      if (latestUserCaption === null && e.role === "user" && e.content.trim()) {
        latestUserCaption = e.content;
      }
      if (latestModelCaption !== null && latestUserCaption !== null) break;
    }
  }

  const modelTurnCount = transcript.filter((e) => e.role === "model").length;
  const estimatedProgress = Math.min(
    Math.round(
      (modelTurnCount / Math.max(1, interview.questions.length * 2.5)) * 100,
    ),
    95,
  );

  const sessionTimeWarning = elapsedTime >= totalSeconds - 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedTime);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-xl)]">
      {(connectionError || captureError) && (
        <div
          role="alert"
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 p-6 backdrop-blur-md"
        >
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-error/30 bg-error/10">
              <AlertCircle className="size-8 text-error" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connection Error</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {connectionError || captureError}
              </p>
            </div>
            <Button variant="gradient" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {phase === "setup" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 sm:p-10">
          <InterviewSetupCard
            isUpdating={isUpdatingSession}
            hasResume={!!resumeText}
            initialResumeText={interview.resumeText}
            onResumeUploaded={handleResumeUploaded}
            onResumeClear={handleResumeClear}
            onStart={handleEnterAudioTest}
            interviewerPersona={interview.interviewerPersona}
          />
        </div>
      ) : phase === "audio_test" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 sm:p-10">
          <AudioTestCard
            connectionStatus={connectionStatus}
            onContinue={handleStartInterview}
            onBack={() => setPhase("setup")}
          />
        </div>
      ) : phase === "submit_failed" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-lg animate-fade-up space-y-5 text-center">
            <div className="flex size-16 mx-auto items-center justify-center rounded-2xl border border-error/30 bg-error/10">
              <AlertCircle className="size-8 text-error" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Submission failed</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your interview session is complete but we could not submit it
                for feedback. Your answers have been saved. Tap retry to try
                again, or return to your dashboard and reopen this session
                later.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="gradient"
                onClick={handleRetrySubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {isSubmitting ? "Retrying…" : "Retry Submission"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className="h-0.5 w-full bg-surface-3"
            role="progressbar"
            aria-valuenow={estimatedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Interview progress"
          >
            <div
              className="h-full bg-primary/60 transition-all duration-1000 ease-out"
              style={{ width: `${estimatedProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  connectionStatus === "connected" ? "success" : "secondary"
                }
              >
                {connectionStatus === "connected" ? "Live" : connectionStatus}
              </Badge>
              {sessionTimeWarning && (
                <Badge variant="warning">
                  {remainingSeconds > 0
                    ? `${Math.ceil(remainingSeconds / 60)}m left`
                    : "Time up"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SpeakerIndicator
                connectionStatus={connectionStatus}
                role="interviewer"
                isAIResponding={isAIResponding}
                isUserSpeaking={isUserSpeaking}
                isMuted={false}
                variant="compact"
              />
              <SpeakerIndicator
                connectionStatus={connectionStatus}
                role="candidate"
                isAIResponding={isAIResponding}
                isUserSpeaking={isUserSpeaking}
                isMuted={isMuted}
                variant="compact"
              />
              <Link href="/dashboard" aria-label="Return to dashboard">
                <User2 className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <InterviewCaptions
              currentCaption={currentCaption}
              currentSpeaker={currentSpeaker}
              isMuted={false}
              focus="model"
              fallbackCaption={latestModelCaption}
            />
            <InterviewCaptions
              currentCaption={currentCaption}
              currentSpeaker={currentSpeaker}
              isMuted={isMuted}
              focus="user"
              fallbackCaption={latestUserCaption}
            />
          </div>

          <InterviewControls
            connectionStatus={connectionStatus}
            isMuted={isMuted}
            isSubmitting={isSubmitting}
            elapsedTime={elapsedTime}
            totalSeconds={totalSeconds}
            onToggleMute={handleToggleMute}
            onEndInterview={handleEndInterview}
          />
        </div>
      )}
    </div>
  );
}
