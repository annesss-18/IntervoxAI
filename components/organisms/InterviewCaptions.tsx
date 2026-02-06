'use client'

import { MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InterviewCaptionsProps {
  /** Current caption text */
  currentCaption: string | null
  /** Who is currently speaking */
  currentSpeaker: 'user' | 'model' | null
  /** Whether the microphone is muted */
  isMuted: boolean
  /** Panel this caption belongs to */
  focus: 'user' | 'model'
  /** Last known caption fallback for this panel */
  fallbackCaption?: string | null
  /** Extra className */
  className?: string
}

function getDisplayCaption(text: string, maxChars: number = 280): string {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxChars) {
    return normalized
  }

  const tail = normalized.slice(-maxChars)
  const sentenceBreakIndex = tail.search(/[.!?]\s/)

  if (sentenceBreakIndex > 0 && sentenceBreakIndex < tail.length - 32) {
    return `...${tail.slice(sentenceBreakIndex + 2)}`
  }

  return `...${tail}`
}

/**
 * Caption panel for one interview participant.
 */
export function InterviewCaptions({
  currentCaption,
  currentSpeaker,
  isMuted,
  focus,
  fallbackCaption,
  className,
}: InterviewCaptionsProps) {
  const isUserPanel = focus === 'user'
  const isLiveSpeaker = currentSpeaker === focus && !!currentCaption
  const activeText = isLiveSpeaker ? currentCaption : fallbackCaption
  const displayCaption = activeText ? getDisplayCaption(activeText) : ''

  let placeholder = isUserPanel
    ? 'Your response will appear here as you speak.'
    : 'The interviewer prompt will appear here.'

  if (isUserPanel && isMuted) {
    placeholder = 'Microphone is muted. Unmute to respond.'
  }

  return (
    <div
      className={cn(
        'border-border/70 bg-surface-2/40 rounded-xl border px-4 py-3 transition-colors',
        isLiveSpeaker && 'border-primary/35 bg-primary/5',
        className
      )}
    >
      <div className="mb-2 flex justify-end">
        <span
          className={cn(
            'text-muted-foreground text-[11px] font-medium',
            isLiveSpeaker && 'text-primary'
          )}
        >
          {isLiveSpeaker ? 'Live' : 'Recent'}
        </span>
      </div>

      {displayCaption ? (
        <p className="custom-scrollbar text-foreground/90 max-h-[92px] overflow-y-auto pr-1 text-sm leading-relaxed">
          {displayCaption}
        </p>
      ) : (
        <div className="flex min-h-[56px] items-center gap-2.5">
          {isUserPanel && isMuted && <MicOff className="text-error-500 size-4 shrink-0" />}
          <p className="text-muted-foreground text-sm">{placeholder}</p>
        </div>
      )}
    </div>
  )
}

export default InterviewCaptions
