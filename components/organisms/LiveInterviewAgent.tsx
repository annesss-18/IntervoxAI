'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertCircle, Briefcase, User2 } from 'lucide-react'
import { useLiveInterview } from '@/lib/hooks/useLiveInterview'
import { useAudioCapture } from '@/lib/hooks/useAudioCapture'
import { useAudioPlayback } from '@/lib/hooks/useAudioPlayback'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import type { Interview } from '@/types'
import { InterviewSetupCard } from '@/components/organisms/InterviewSetupCard'
import { InterviewControls } from '@/components/organisms/InterviewControls'
import { SpeakerIndicator } from '@/components/organisms/SpeakerIndicator'
import { InterviewCaptions } from '@/components/organisms/InterviewCaptions'

interface LiveInterviewAgentProps {
  interview: Interview
  sessionId: string
}

type InterviewPhase = 'setup' | 'active' | 'ending' | 'completed' | 'submit_failed'

/**
 * Main orchestrator component for live AI interviews.
 * Manages interview phases and coordinates visual components.
 */
export function LiveInterviewAgent({ interview, sessionId }: LiveInterviewAgentProps) {
  const router = useRouter()

  const [phase, setPhase] = useState<InterviewPhase>('setup')
  const [isMuted, setIsMuted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeText, setResumeText] = useState<string | undefined>(interview.resumeText)
  const [isUpdatingSession, setIsUpdatingSession] = useState(false)

  const interviewContext = useMemo(
    () => ({
      role: interview.role,
      companyName: interview.companyName,
      level: interview.level,
      type: interview.type,
      techStack: interview.techstack,
      questions: interview.questions,
      resumeText,
      systemInstruction: interview.systemInstruction,
    }),
    [interview, resumeText]
  )

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
      clearAudioQueue()
    },
    onInterviewComplete: () => {
      logger.info('Interview naturally completed, triggering auto-end')
      toast.info('Interview completed! Generating your feedback...')
      handleEndInterview()
    },
  })

  const { error: captureError, startCapture, stopCapture } = useAudioCapture()
  const { queueAudio, clearQueue: clearAudioQueue, stop: stopPlayback } = useAudioPlayback()

  useEffect(() => {
    onAudioReceived((base64Data) => {
      queueAudio(base64Data)
    })
  }, [onAudioReceived, queueAudio])

  const handleAudioChunk = useCallback(
    (chunk: string) => {
      if (!isMuted) {
        sendAudio(chunk)
      }
    },
    [sendAudio, isMuted]
  )

  const handleResumeUploaded = useCallback(
    async (text: string) => {
      setResumeText(text)
      setIsUpdatingSession(true)

      try {
        const response = await fetch(`/api/interview/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: text }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save resume')
        }
      } catch (error) {
        console.error('Failed to update session with resume:', error)
      } finally {
        setIsUpdatingSession(false)
      }
    },
    [sessionId]
  )

  const handleResumeClear = useCallback(async () => {
    setResumeText(undefined)

    try {
      await fetch(`/api/interview/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: '' }),
      })
    } catch (error) {
      console.error('Failed to clear resume from session:', error)
    }
  }, [sessionId])

  const handleStartInterview = async () => {
    try {
      setPhase('active')

      await startCapture(handleAudioChunk, { vadSensitivity: 60 })
      await connect()

      try {
        const response = await fetch(`/api/interview/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        })

        if (!response.ok) {
          logger.warn(`Unable to persist active status for session ${sessionId}`)
        }
      } catch (persistError) {
        logger.warn('Failed to persist session active state:', persistError)
      }
    } catch (error) {
      stopCapture()
      stopPlayback()
      disconnect()
      setPhase('setup')
      toast.error(error instanceof Error ? error.message : 'Failed to start interview')
    }
  }

  const handleEndInterview = async () => {
    setPhase('ending')

    stopCapture()
    stopPlayback()
    disconnect()

    if (transcript.length === 0) {
      toast.error('No conversation recorded. Please try again.')
      setPhase('setup')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: sessionId,
          transcript: transcript.map((t) => ({
            role: t.role === 'user' ? 'Candidate' : 'Interviewer',
            content: t.content,
          })),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to queue feedback generation')
      }

      toast.success('Interview completed! Feedback is being generated.')
      setPhase('completed')
      router.push(`/interview/session/${sessionId}/feedback`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `${error.message}. Retry submission from this screen.`
          : 'Failed to submit interview. Retry submission from this screen.'
      )
      setPhase('submit_failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleMute = () => {
    setIsMuted(!isMuted)
    toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted')
  }

  const sessionTimeWarning = elapsedTime >= 840
  const remainingSeconds = Math.max(0, 900 - elapsedTime)

  const latestModelCaption = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const entry = transcript[i]
      if (entry?.role === 'model' && entry.content.trim().length > 0) {
        return entry.content
      }
    }
    return null
  }, [transcript])

  const latestUserCaption = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const entry = transcript[i]
      if (entry?.role === 'user' && entry.content.trim().length > 0) {
        return entry.content
      }
    }
    return null
  }, [transcript])

  return (
    <div className="border-border/70 bg-card relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border shadow-xl">
      {(connectionError || captureError) && (
        <div className="bg-background/85 absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="border-error/30 bg-error/10 flex size-16 items-center justify-center rounded-full border-2">
              <AlertCircle className="text-error size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-xl font-semibold">Connection Error</h3>
              <p className="text-muted-foreground">{connectionError || captureError}</p>
            </div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      )}

      {phase === 'setup' ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
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
          <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-foreground text-sm font-semibold">Live Conversation</p>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Focus on concise, structured answers.
              </p>
            </div>
          </div>

          {sessionTimeWarning && phase === 'active' && (
            <div className="border-warning/20 bg-warning/10 text-warning flex items-center gap-2 border-b px-4 py-2 text-xs sm:px-6 sm:text-sm">
              <AlertCircle className="size-4 shrink-0" />
              Session ends in {remainingSeconds}s
            </div>
          )}

          {phase === 'submit_failed' && (
            <div className="border-error/20 bg-error/10 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-error text-sm">
                Feedback submission failed. Retry now or open the feedback page.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEndInterview}>
                  Retry Submission
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/interview/session/${sessionId}/feedback`}>Open Feedback</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
              <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="from-primary/80 to-primary flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white">
                      AI
                    </div>
                    <div>
                      <p className="text-sm font-semibold">AI Interviewer</p>
                      <p className="text-muted-foreground text-xs">
                        {interview.companyName || 'IntervoxAI'}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={
                      isAIResponding
                        ? 'primary'
                        : connectionStatus === 'connected'
                          ? 'secondary'
                          : 'warning'
                    }
                  >
                    {isAIResponding ? 'Speaking' : 'Listening'}
                  </Badge>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="from-info to-info-600 flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white">
                      <User2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Your Response</p>
                      <p className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Briefcase className="size-3" />
                        Candidate
                      </p>
                    </div>
                  </div>

                  <Badge variant={isMuted ? 'error' : isUserSpeaking ? 'info' : 'secondary'}>
                    {isMuted ? 'Muted' : isUserSpeaking ? 'Speaking' : 'Ready'}
                  </Badge>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
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
              isSubmitting={isSubmitting || phase === 'ending'}
              onToggleMute={handleToggleMute}
              onEndInterview={handleEndInterview}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveInterviewAgent
