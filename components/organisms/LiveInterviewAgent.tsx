"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { InterviewControls } from "@/components/organisms/InterviewControls";
import { SpeakerIndicator } from "@/components/organisms/SpeakerIndicator";
import { InterviewCaptions } from "@/components/organisms/InterviewCaptions";

interface LiveInterviewAgentProps {
  interview: InterviewSessionDetail;
  sessionId: string;
}

type InterviewPhase =
  | "setup"
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
  const [resumeText, setResumeText] = useState<string | undefined>(
    interview.resumeText,
  );
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);

  const interviewContext = useMemo(
    () => ({
      role: interview.role,
      companyName: interview.companyName,
      level: interview.level,
      type: interview.type,
      techStack: interview.techStack,
      questions: interview.questions,
      resumeText,
      systemInstruction: interview.systemInstruction,
      interviewerPersona: interview.interviewerPersona,
    }),
    [interview, resumeText],
  );

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
  } = useLiveInterview({
    sessionId,
    interviewContext,
    onInterruption: () => {
      clearAudioQueue();
    },
    onInterviewComplete: () => {
      logger.info("Interview naturally completed");
      toast.info("Interview completed! Generating your feedback…");
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
        logger.error("Failed to update session with resume:", error);
      } finally {
        setIsUpdatingSession(false);
      }
    },
    [sessionId],
  );

  const handleResumeClear = useCallback(async () => {
    setResumeText(undefined);
    try {
      await fetch(`/api/interview/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: "" }),
      });
    } catch (error) {
      logger.error("Failed to clear resume:", error);
    }
  }, [sessionId]);

  const handleStartInterview = async () => {
    try {
      setPhase("active");
      await startCapture(handleAudioChunk, { vadSensitivity: 60 });
      await connect();
      try {
        const res = await fetch(`/api/interview/session/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        if (!res.ok)
          logger.warn(`Unable to persist active status for ${sessionId}`);
      } catch (err) {
        logger.warn("Failed to persist active state:", err);
      }
    } catch (error) {
      stopCapture();
      stopPlayback();
      disconnect();
      setPhase("setup");
      toast.error(
        error instanceof Error ? error.message : "Failed to start interview",
      );
    }
  };

  const handleEndInterview = async () => {
    setPhase("ending");
    stopCapture();
    stopPlayback();
    disconnect();

    if (transcript.length === 0) {
      toast.error("No conversation recorded. Please try again.");
      setPhase("setup");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: sessionId,
          transcript: transcript.map((t) => ({
            role: t.role === "user" ? "Candidate" : "Interviewer",
            content: t.content,
          })),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(
          result.error || result.message || "Failed to queue feedback",
        );
      }
      toast.success("Interview completed! Feedback is being generated.");
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
      setIsSubmitting(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  const latestModelCaption = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const e = transcript[i];
      if (e?.role === "model" && e.content.trim()) return e.content;
    }
    return null;
  }, [transcript]);

  const latestUserCaption = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const e = transcript[i];
      if (e?.role === "user" && e.content.trim()) return e.content;
    }
    return null;
  }, [transcript]);

  const sessionTimeWarning = elapsedTime >= 840;
  const remainingSeconds = Math.max(0, 900 - elapsedTime);

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
            onStart={handleStartInterview}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/40 px-5 py-3">
            <p className="text-sm font-semibold">Live Conversation</p>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Focus on concise, structured answers.
            </p>
          </div>

          {sessionTimeWarning && phase === "active" && (
            <div className="flex items-center gap-2 border-b border-warning/20 bg-warning/8 px-5 py-2 text-xs text-warning sm:text-sm">
              <AlertCircle className="size-4 shrink-0" />
              Session ends in {remainingSeconds}s — wrap up your answer
            </div>
          )}

          {phase === "submit_failed" && (
            <div className="flex flex-col gap-3 border-b border-error/20 bg-error/8 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-error">
                Feedback submission failed. Retry now or open the feedback page.
              </p>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={handleEndInterview}
                >
                  Retry
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/interview/session/${sessionId}/feedback`}>
                    Open Feedback
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
              <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-[0_4px_16px_-4px_color-mix(in_srgb,var(--primary)_60%,var(--accent)_40%)]">
                      AI
                    </div>
                    <div>
                      <p className="text-sm font-semibold">AI Interviewer</p>
                      <p className="text-xs text-muted-foreground">
                        {interview.companyName || "IntervoxAI"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      isAIResponding
                        ? "primary"
                        : connectionStatus === "connected"
                          ? "secondary"
                          : "warning"
                    }
                    dot
                  >
                    {isAIResponding ? "Speaking" : "Listening"}
                  </Badge>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
                  <SpeakerIndicator
                    connectionStatus={connectionStatus}
                    role="interviewer"
                    isAIResponding={isAIResponding}
                    isUserSpeaking={isUserSpeaking}
                    isMuted={isMuted}
                  />
                  <InterviewCaptions
                    currentCaption={currentCaption || null}
                    currentSpeaker={currentSpeaker}
                    isMuted={isMuted}
                    focus="model"
                    fallbackCaption={latestModelCaption}
                  />
                </div>
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground">
                      <User2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Your Response</p>
                      <p className="text-xs text-muted-foreground">Candidate</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      isMuted ? "error" : isUserSpeaking ? "info" : "secondary"
                    }
                    dot
                  >
                    {isMuted ? "Muted" : isUserSpeaking ? "Speaking" : "Ready"}
                  </Badge>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
                  <SpeakerIndicator
                    connectionStatus={connectionStatus}
                    role="candidate"
                    isAIResponding={isAIResponding}
                    isUserSpeaking={isUserSpeaking}
                    isMuted={isMuted}
                  />
                  <InterviewCaptions
                    currentCaption={currentCaption || null}
                    currentSpeaker={currentSpeaker}
                    isMuted={isMuted}
                    focus="user"
                    fallbackCaption={latestUserCaption}
                  />
                </div>
              </section>
            </div>

            <InterviewControls
              connectionStatus={connectionStatus}
              elapsedTime={elapsedTime}
              isMuted={isMuted}
              isSubmitting={isSubmitting || phase === "ending"}
              onToggleMute={handleToggleMute}
              onEndInterview={handleEndInterview}
            />
          </div>
        </div>
      )}
    </div>
  );
}
