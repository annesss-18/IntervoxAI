'use client'

import { useCallback, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface UseAudioPlaybackReturn {
  isPlaying: boolean
  queueAudio: (base64Data: string) => void
  clearQueue: () => void
  stop: () => void
}

/**
 * Hook for playing audio received from Gemini Live API.
 * Handles 24kHz 16-bit PCM audio in base64 format with seamless playback.
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<{ buffer: AudioBuffer; timestamp: number }[]>([])
  const playbackStartTimeRef = useRef<number | null>(null)
  const isActiveRef = useRef(false)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      // Get/create audio context (with webkit fallback for Safari)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) throw new Error('AudioContext not supported')
      const tempCtx = new AudioContextClass()
      tempCtx.close()

      // Create context at system rate - we'll resample on decode
      audioContextRef.current = new AudioContextClass()
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const playNextInQueue = useCallback(() => {
    const ctx = audioContextRef.current
    if (!ctx || audioQueueRef.current.length === 0) return

    const { buffer } = audioQueueRef.current.shift()!
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)

    // Schedule based on previous end time to ensure gapless where possible
    // If we fell behind (underrun), play immediately
    const startTime = Math.max(playbackStartTimeRef.current ?? ctx.currentTime, ctx.currentTime)
    source.start(startTime)
    playbackStartTimeRef.current = startTime + buffer.duration

    setIsPlaying(true)

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNextInQueue()
      } else {
        playbackStartTimeRef.current = null
        setIsPlaying(false)
      }
    }
  }, [])

  const queueAudio = useCallback(
    (base64Data: string) => {
      try {
        const ctx = getAudioContext()
        isActiveRef.current = true

        // Decode base64 to bytes
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Interpret as 16-bit signed integers (little-endian)
        const dataView = new DataView(bytes.buffer)
        const numSamples = bytes.length / 2
        const float32Array = new Float32Array(numSamples)

        for (let i = 0; i < numSamples; i++) {
          // Read as little-endian 16-bit signed integer
          const int16 = dataView.getInt16(i * 2, true)
          // Convert to float [-1, 1]
          float32Array[i] = int16 / 32768.0
        }

        // Resample from 24kHz to system sample rate if needed
        const incomingSampleRate = 24000
        const systemSampleRate = ctx.sampleRate
        let finalSamples: Float32Array = float32Array

        if (incomingSampleRate !== systemSampleRate) {
          finalSamples = resampleAudio(float32Array, incomingSampleRate, systemSampleRate)
        }

        // Create AudioBuffer at system sample rate
        const audioBuffer = ctx.createBuffer(1, finalSamples.length, systemSampleRate)
        audioBuffer.getChannelData(0).set(finalSamples)

        // Queue the buffer instead of playing immediately
        audioQueueRef.current.push({
          buffer: audioBuffer,
          timestamp: Date.now(),
        })

        logger.debug(
          '🔊 Audio queued, queue size:',
          audioQueueRef.current.length,
          'isPlaying:',
          !!playbackStartTimeRef.current
        )

        // Start playback when we have 2 chunks buffered for smoother audio
        // Single chunk can cause choppy playback
        if (!playbackStartTimeRef.current && audioQueueRef.current.length >= 2) {
          logger.debug('▶️ Starting audio playback...')
          playNextInQueue()
        }
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    },
    [getAudioContext, playNextInQueue]
  )

  const clearQueue = useCallback(() => {
    isActiveRef.current = false
    playbackStartTimeRef.current = null
    audioQueueRef.current = []
    setIsPlaying(false)

    // Close and recreate context to stop all scheduled audio
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearQueue()
  }, [clearQueue])

  return {
    isPlaying,
    queueAudio,
    clearQueue,
    stop,
  }
}

// Helper function for resampling
function resampleAudio(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate) return input

  const ratio = inRate / outRate
  const outputLength = Math.ceil(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1)
    const fraction = srcIndex - srcIndexFloor

    const sample1 = input[srcIndexFloor] ?? 0
    const sample2 = input[srcIndexCeil] ?? 0
    output[i] = sample1 + (sample2 - sample1) * fraction
  }

  return output
}
