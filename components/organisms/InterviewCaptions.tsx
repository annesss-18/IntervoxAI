'use client'

import { MicOff, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InterviewCaptionsProps {
  /** Current caption text */
  currentCaption: string | null
  /** Who is currently speaking */
  currentSpeaker: 'user' | 'model' | null
  /** Whether the microphone is muted */
  isMuted: boolean
}

/**
 * Cinematic subtitles for the interview.
 * Minimalist design with good readability.
 */
export function InterviewCaptions({
  currentCaption,
  currentSpeaker,
  isMuted,
}: InterviewCaptionsProps) {
  // Show muted warning if muted and no caption
  if (isMuted && !currentCaption) {
    return (
      <div className="animate-fadeIn pb-4">
        <div className="bg-surface-800/80 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 shadow-lg backdrop-blur-md">
          <MicOff className="size-4 text-red-400" />
          <span className="text-sm font-medium text-white/80">Microphone is muted</span>
        </div>
      </div>
    )
  }

  // No caption to show
  if (!currentCaption) {
    return <div className="min-h-[80px]" /> // Spacer to prevent layout jumps
  }

  const isAI = currentSpeaker === 'model'

  return (
    <div className="animate-slideInUp mx-auto w-full max-w-4xl pb-4">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300',
          isAI
            ? 'bg-surface-900/90 border-indigo-500/30'
            : 'bg-surface-900/90 border-emerald-500/30'
        )}
      >
        <div className="p-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1">
            {isAI ? (
              <Sparkles className="size-3 text-indigo-400" />
            ) : (
              <User className="size-3 text-emerald-400" />
            )}
            <span
              className={cn(
                'text-xs font-bold tracking-wider uppercase',
                isAI ? 'text-indigo-400' : 'text-emerald-400'
              )}
            >
              {isAI ? 'Interviewer' : 'You'}
            </span>
          </div>

          <p className="text-xl leading-relaxed font-medium tracking-wide text-balance text-white/95 md:text-2xl">
            &quot;{currentCaption}&quot;
          </p>
        </div>
      </div>
    </div>
  )
}

export default InterviewCaptions
