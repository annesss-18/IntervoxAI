"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, User2 } from "lucide-react";
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
  | "setup"
  | "audio_test"
  | "active"
  | "ending"
  | "completed"
  | "submit_failed";

export function LiveInterviewAgent({
  interview,
  sessionId,
}: LiveInterviewAgentProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [resumeText, setResumeText] = useState<string | undefined>(
    interview.resumeText,
  );
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);

  // ---------------------------------------------------------------------------
  // Duration — derive the total session seconds once from the interview prop.
  // Falls back to 15 minutes for sessions created before this field existed.
  // ---------------------------------------------------------------------------
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
    // Pass templateId so /api/live/token can fire session + template reads in
    // parallel (see the previous performance fixes).
    templateId: interview.templateId,
    initialTranscript: interview.transcript,
    holdInitialPrompt: true,
    onInterruption: () => {
      clearAudioQueue();
    },
    onInterviewComplete: () => {
      logger.info("Interview naturally completed");
      toast.info("Interview completed! Generating your feedback...");
      handleEndInterview();
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

  // Enter audio test phase and begin AI connection in the background.
  const handleEnterAudioTest = async () => {
    setPhase("audio_test");
    try {
      await connect();
    } catch (error) {
      logger.warn("Background connection failed during audio test:", error);
    }
  };

  // Called when user finishes audio test and clicks Continue.
  const handleStartInterview = async () => {
    try {
      setPhase("active");
      await startCapture(handleAudioChunk, { vadSensitivity: 60 });

      // Singleflight connect deduplicates audio-test and interview-start reconnects.
      await connect();
      releaseHold();

      fetch(`/api/interview/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      }).catch((err) => {
        logger.warn("Failed to persist active session status:", err);
      });
    } catch (error) {
      logger.error("Failed to start interview:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start interview",
      );
      setPhase("audio_test");
    }
  };

  const handleEndInterview = useCallback(async () => {
    if (isSubmittingRef.current || phase === "completed") return;
    isSubmittingRef.current = true;
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

      setPhase("completed");
      router.push(`/interview/session/${sessionId}/feedback`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `${error.message}. Retry from this screen.`
          : "Failed to submit. Retry from this screen.",
      );
      setPhase("submit_failed");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    phase,
    stopCapture,
    stopPlayback,
    flushPendingTranscript,
    disconnect,
    sessionId,
    router,
  ]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  // ---------------------------------------------------------------------------
  // Latest captions — single backward scan that stops as soon as both roles
  // are found (O(1) in practice since both entries are typically the last 2–3).
  // ---------------------------------------------------------------------------
  const transcriptLength = transcript.length;
  let latestModelCaption: string | null = null;
  let latestUserCaption: string | null = null;

  if (transcriptLength > 0) {
    for (let i = transcriptLength - 1; i >= 0; i--) {
      const e = transcript[i];
      if (!e) continue;
      if (latestModelCaption === null && e.role === "model" && e.content.trim()) {
        latestModelCaption = e.content;
      }
      if (latestUserCaption === null && e.role === "user" && e.content.trim()) {
        latestUserCaption = e.content;
      }
      if (latestModelCaption !== null && latestUserCaption !== null) break;
    }
  }

  // ---------------------------------------------------------------------------
  // Progress indicator — soft heuristic based on model turn count vs expected
  // question count.  Each question typically spans 2–3 model turns (greeting,
  // follow-up, transition), so we scale against questions.length × 2.5.
  // Capped at 95 % so we never show 100 % until the session explicitly ends.
  // ---------------------------------------------------------------------------
  const modelTurnCount = transcript.filter((e) => e.role === "model").length;
  const estimatedProgress = Math.min(
    Math.round(
      (modelTurnCount / Math.max(1, interview.questions.length * 2.5)) * 100,
    ),
    95,
  );

  // Warning threshold — 60 seconds before session end.
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Soft progress bar — 2 px tall, no label, subtle primary fill */}
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

          {/* Header bar */}
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
                  {Math.floor(remainingSeconds / 60)}m remaining
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
              />
              <SpeakerIndicator
                connectionStatus={connectionStatus}
                role="candidate"
                isAIResponding={isAIResponding}
                isUserSpeaking={isUserSpeaking}
                isMuted={isMuted}
              />
              <Link href="/dashboard">
                <User2 className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Captions */}
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

          {/* Controls — pass totalSeconds so warning threshold uses configured duration */}
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
