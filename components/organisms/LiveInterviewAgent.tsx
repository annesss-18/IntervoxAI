'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLiveInterview } from '@/lib/hooks/useLiveInterview'
import { useAudioCapture } from '@/lib/hooks/useAudioCapture'
import { useAudioPlayback } from '@/lib/hooks/useAudioPlayback'
import { logger } from '@/lib/logger'
import { AlertCircle } from 'lucide-react'
import type { Interview } from '@/types'

// Extracted organisms
import { InterviewSetupCard } from '@/components/organisms/InterviewSetupCard'
import { InterviewControls } from '@/components/organisms/InterviewControls'
import { SpeakerIndicator } from '@/components/organisms/SpeakerIndicator'
import { InterviewCaptions } from '@/components/organisms/InterviewCaptions'

interface LiveInterviewAgentProps {
  interview: Interview
  sessionId: string
  userId: string
}

type InterviewPhase = 'setup' | 'active' | 'ending' | 'completed'

/**
 * Main orchestrator component for live AI interviews.
 * Manages interview phases and coordinates between extracted organisms.
 */
export function LiveInterviewAgent({ interview, sessionId, userId }: LiveInterviewAgentProps) {
  const router = useRouter()

  const [phase, setPhase] = useState<InterviewPhase>('setup')
  const [isMuted, setIsMuted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeText, setResumeText] = useState<string | undefined>(interview.resumeText)
  const [isUpdatingSession, setIsUpdatingSession] = useState(false)

  // Interview context for the AI - includes uploaded resume
  const interviewContext = useMemo(
    () => ({
      role: interview.role,
      companyName: interview.companyName,
      level: interview.level,
      type: interview.type,
      techStack: interview.techstack,
      questions: interview.questions,
      resumeText: resumeText,
      systemInstruction: interview.systemInstruction,
    }),
    [interview, resumeText]
  )

  // Initialize hooks
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

  // Set up audio playback callback
  useEffect(() => {
    logger.debug('🎧 Registering audio playback callback')
    onAudioReceived((base64Data) => {
      logger.debug('🎵 Audio callback triggered, forwarding to playback')
      queueAudio(base64Data)
    })
  }, [onAudioReceived, queueAudio])

  // Handle audio capture -> send to API
  const handleAudioChunk = useCallback(
    (chunk: string) => {
      if (!isMuted) {
        sendAudio(chunk)
      }
    },
    [sendAudio, isMuted]
  )

  // Handle resume upload
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

  // Handle resume clear
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

  // Start interview
  const handleStartInterview = async () => {
    try {
      setPhase('active')

      logger.debug('🎧 Registering audio callback in handleStartInterview')
      onAudioReceived((base64Data) => {
        logger.debug('🎵 Audio received, length:', base64Data.length)
        queueAudio(base64Data)
      })

      await startCapture(handleAudioChunk)
      await connect()
    } catch (error) {
      setPhase('setup')
      toast.error(error instanceof Error ? error.message : 'Failed to start interview')
    }
  }

  // End interview
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate feedback')
      }

      const result = await response.json()

      if (result.success) {
        toast.success('Interview completed! Generating feedback...')
        setPhase('completed')
        router.push(`/interview/session/${sessionId}/feedback`)
      } else {
        throw new Error(result.message || 'Failed to generate feedback')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit interview')
      setPhase('active')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted)
    toast.info(isMuted ? 'Microphone unmuted' : 'Microphone muted')
  }

  // Session time warning (15 min limit)
  const sessionTimeWarning = elapsedTime >= 840

  // Common Container Structure
  return (
    <div className="bg-surface-950 border-border relative flex h-[calc(100vh-12rem)] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl">
      {/* Background Effects */}
      <div className="bg-grid-white/[0.02] absolute inset-0 -z-0" />
      <div className="via-surface-950/50 to-surface-950 absolute inset-0 -z-0 bg-gradient-to-b from-transparent" />

      {/* Error Overlay */}
      {(connectionError || captureError) && (
        <div className="bg-surface-950/90 absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="flex max-w-md flex-col items-center gap-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-500/20">
              <AlertCircle className="size-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-xl font-semibold">Connection Error</h3>
              <p className="text-muted-foreground">{connectionError || captureError}</p>
            </div>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main Visualizer Area */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center overflow-hidden">
        {phase === 'setup' ? (
          <div className="animate-fadeIn flex h-full w-full items-center justify-center p-6">
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
          <>
            {/* Center Stage: Speaker Indicator */}
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <SpeakerIndicator
                connectionStatus={connectionStatus}
                isAIResponding={isAIResponding}
                isUserSpeaking={isUserSpeaking}
                isMuted={isMuted}
              />
            </div>

            {/* Captions Overlay */}
            <div className="flex min-h-[100px] w-full items-end justify-center px-8 pb-4">
              <InterviewCaptions
                currentCaption={currentCaption}
                currentSpeaker={currentSpeaker}
                isMuted={isMuted}
              />
            </div>
          </>
        )}
      </div>

      {/* Controls Bar - Floating at bottom (Only show when active or ending) */}
      {phase !== 'setup' && (
        <div className="from-surface-950 relative z-20 flex w-full justify-center bg-gradient-to-t to-transparent pt-2 pb-6">
          <div className="w-full max-w-2xl px-4">
            <InterviewControls
              connectionStatus={connectionStatus}
              elapsedTime={elapsedTime}
              isMuted={isMuted}
              isSubmitting={isSubmitting}
              onToggleMute={handleToggleMute}
              onEndInterview={handleEndInterview}
            />
          </div>
        </div>
      )}

      {/* Session time warning - Floating Top */}
      {sessionTimeWarning && phase === 'active' && (
        <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2 animate-pulse">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 backdrop-blur-md">
            <AlertCircle className="size-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">
              Session ends in {Math.max(0, 900 - elapsedTime)}s
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveInterviewAgent
