'use client'

import { Mic, MicOff, PhoneOff, Loader2, Clock, Signal } from 'lucide-react'
import type { ConnectionStatus } from '@/lib/hooks/useLiveInterview'
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
 * Premium floating dock for active interview controls.
 * Centered at the bottom of the screen with glass effect.
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

  return (
    <div className="animate-slideInUp flex w-full items-center justify-center p-6">
      <div className="bg-surface-900/60 hover:bg-surface-900/70 hover:shadow-primary/5 flex items-center gap-4 rounded-full border border-white/10 px-6 py-4 shadow-2xl backdrop-blur-xl transition-all hover:scale-[1.01]">
        {/* Connection Status Indicator */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            connectionStatus === 'connected'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
          )}
          title={`Connection: ${connectionStatus}`}
        >
          <div
            className={cn(
              'size-1.5 rounded-full',
              connectionStatus === 'connected'
                ? 'animate-pulse bg-emerald-500'
                : 'animate-pulse bg-amber-500'
            )}
          />
          <span className="hidden capitalize sm:inline">{connectionStatus}</span>
          <Signal className="size-3 sm:hidden" />
        </div>

        {/* Vertical Divider */}
        <div className="mx-1 h-8 w-px bg-white/10" />

        {/* Timer */}
        <div
          className={cn(
            'flex items-center gap-2 px-2 font-mono text-sm transition-colors',
            sessionTimeWarning ? 'animate-pulse text-amber-400' : 'text-white/80'
          )}
        >
          <Clock className="size-4 opacity-70" />
          <span>{formatTime(elapsedTime)}</span>
        </div>

        {/* Vertical Divider */}
        <div className="mx-1 h-8 w-px bg-white/10" />

        <div className="flex items-center gap-3">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            disabled={connectionStatus !== 'connected'}
            className={cn(
              'relative flex size-12 transform items-center justify-center rounded-full transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
              isMuted
                ? 'border border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
            )}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndInterview}
            disabled={isSubmitting}
            className="group flex transform items-center gap-2 rounded-full bg-red-600 px-5 py-3 font-medium text-white shadow-lg shadow-red-900/20 transition-all duration-300 hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <PhoneOff className="size-5 transition-transform duration-300 group-hover:rotate-90" />
            )}
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default InterviewControls
