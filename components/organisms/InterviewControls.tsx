'use client'

import { Mic, MicOff, PhoneOff, Loader2, Clock } from 'lucide-react'
import type { ConnectionStatus } from '@/lib/hooks/useLiveInterview'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { cn } from '@/lib/utils'

interface InterviewControlsProps {
  /** Current connection status */
  connectionStatus: ConnectionStatus
  /** Elapsed time in seconds */
  elapsedTime: number
  /** Whether the microphone is muted */
  isMuted: boolean
  /** Whether the interview is being submitted */
  isSubmitting: boolean
  /** Callback to toggle mute */
  onToggleMute: () => void
  /** Callback to end interview */
  onEndInterview: () => void
}

/**
 * Primary controls for an active interview session.
 */
export function InterviewControls({
  connectionStatus,
  elapsedTime,
  isMuted,
  isSubmitting,
  onToggleMute,
  onEndInterview,
}: InterviewControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const sessionTimeWarning = elapsedTime >= 840 // 14 minutes
  const statusVariant =
    connectionStatus === 'connected'
      ? 'success'
      : connectionStatus === 'connecting'
        ? 'warning'
        : 'error'

  return (
    <div className="mt-4 w-full">
      <div className="border-border/70 bg-card/90 mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant={statusVariant} dot className="capitalize">
            {connectionStatus}
          </Badge>

          <div
            className={cn(
              'border-border/70 bg-surface-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm',
              sessionTimeWarning && 'text-warning-500'
            )}
          >
            <Clock className="size-4 opacity-75" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={onToggleMute}
            disabled={connectionStatus !== 'connected'}
            variant={isMuted ? 'destructive' : 'secondary'}
            size="icon"
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>

          <Button
            onClick={onEndInterview}
            disabled={isSubmitting}
            variant="destructive"
            className="min-w-[138px]"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PhoneOff className="size-4" />
            )}
            <span>End Interview</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default InterviewControls
