'use client'

import { Mic, MicOff, Loader2, Zap, Waves } from 'lucide-react'
import type { ConnectionStatus } from '@/lib/hooks/useLiveInterview'
import { cn } from '@/lib/utils'

interface SpeakerIndicatorProps {
  /** Current connection status */
  connectionStatus: ConnectionStatus
  /** Whether the AI is currently responding */
  isAIResponding: boolean
  /** Whether the user is currently speaking */
  isUserSpeaking: boolean
  /** Whether the microphone is muted */
  isMuted: boolean
}

/**
 * Premium visual indicator showing who is currently speaking.
 * Features sophisticated orb animations and glassmorphism.
 */
export function SpeakerIndicator({
  connectionStatus,
  isAIResponding,
  isUserSpeaking,
  isMuted,
}: SpeakerIndicatorProps) {
  // 1. Connecting State
  if (connectionStatus === 'connecting') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8">
        <div className="group relative">
          {/* Outer glow */}
          <div className="from-primary/20 via-accent/20 to-primary/20 animate-spin-slow absolute inset-0 rounded-full bg-gradient-to-r blur-2xl" />

          <div className="bg-card/50 relative flex size-40 items-center justify-center rounded-full border border-white/10 shadow-xl backdrop-blur-md">
            <div className="border-primary/50 absolute inset-0 animate-spin rounded-full border-t-2" />
            <Loader2 className="text-primary size-12 animate-spin" />
          </div>
        </div>
        <div className="animate-pulse space-y-2 text-center">
          <p className="from-foreground to-muted-foreground bg-gradient-to-r bg-clip-text text-xl font-medium tracking-tight text-transparent">
            Establishing Connection
          </p>
          <p className="text-muted-foreground text-sm">Secure line initializing...</p>
        </div>
      </div>
    )
  }

  // 2. Active Session States
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 py-12">
      <div className="relative flex items-center justify-center">
        {/* --- STATE: AI SPEAKING (Dominant) --- */}
        {isAIResponding && (
          <>
            <div className="animate-pulse-slow absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/30 via-purple-500/30 to-pink-500/30 blur-3xl" />
            <div className="absolute -inset-10 opacity-40">
              <div className="animate-ping-slow h-full w-full rounded-full border border-indigo-500/20" />
            </div>
            <div className="absolute -inset-20 opacity-20">
              <div className="animate-ping-slower h-full w-full rounded-full border border-purple-500/10" />
            </div>
          </>
        )}

        {/* --- STATE: USER SPEAKING (Receptive) --- */}
        {!isAIResponding && isUserSpeaking && (
          <>
            <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="animate-ripple absolute -inset-4 rounded-full border-2 border-emerald-500/30" />
          </>
        )}

        {/* --- ORB CORE --- */}
        <div
          className={cn(
            'relative flex size-56 items-center justify-center rounded-full transition-all duration-700',
            isAIResponding
              ? 'scale-110 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-[0_0_60px_-10px_rgba(99,102,241,0.5)]'
              : isUserSpeaking
                ? 'scale-105 bg-gradient-to-br from-emerald-500/80 to-teal-600/80 shadow-[0_0_40px_-10px_rgba(52,211,153,0.4)]'
                : 'bg-surface-800/80 border border-white/5 shadow-2xl backdrop-blur-xl'
          )}
        >
          {/* Inner Texture/Animation */}
          <div className="absolute inset-2 overflow-hidden rounded-full">
            {isAIResponding ? (
              <div className="animate-grain h-full w-full bg-[url('/noise.png')] opacity-20" />
            ) : (
              <div className="h-full w-full bg-gradient-to-b from-white/5 to-transparent opacity-50" />
            )}
          </div>

          {/* Icon / Centerpiece */}
          <div className="relative z-10 transition-all duration-500">
            {isAIResponding ? (
              <Waves className="animate-wave-flow size-20 text-white/90" />
            ) : isUserSpeaking ? (
              <Mic className="size-16 animate-pulse text-white" />
            ) : isMuted ? (
              <MicOff className="size-14 text-red-400" />
            ) : (
              <Zap className="size-14 text-white/20" />
            )}
          </div>
        </div>
      </div>

      {/* --- STATUS TEXT --- */}
      <div className="flex h-16 flex-col items-center justify-center text-center transition-opacity duration-300">
        {isAIResponding ? (
          <div className="flex flex-col items-center gap-3">
            <span className="flex gap-1.5">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-indigo-400"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-lg font-medium text-transparent">
              AI is speaking...
            </span>
          </div>
        ) : isUserSpeaking ? (
          <div className="flex flex-col items-center gap-2">
            <span className="u-text-glow-green font-medium tracking-wide text-emerald-400">
              LISTENING
            </span>
            <span className="text-muted-foreground text-sm">Go ahead, I'm listening...</span>
          </div>
        ) : isMuted ? (
          <span className="flex items-center gap-2 font-medium text-red-400">
            <MicOff className="size-4" /> Microphone Muted
          </span>
        ) : (
          <div className="space-y-1">
            <p className="text-foreground/80 font-medium">Ready</p>
            <p className="text-muted-foreground text-sm">Waiting for your input</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SpeakerIndicator
