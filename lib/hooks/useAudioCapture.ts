'use client'

import { useCallback, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface UseAudioCaptureReturn {
  isCapturing: boolean
  error: string | null
  startCapture: (onAudioChunk: (chunk: string) => void) => Promise<void>
  stopCapture: () => void
}

/**
 * Hook for capturing audio from the browser microphone and converting to PCM format.
 * Outputs base64-encoded 16-bit PCM audio chunks suitable for Gemini Live API.
 * Uses MediaRecorder with PCM conversion for reliable cross-browser support.
 */
export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<AudioWorkletNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const callbackRef = useRef<((chunk: string) => void) | null>(null)

  const startCapture = useCallback(async (onAudioChunk: (chunk: string) => void) => {
    try {
      setError(null)
      callbackRef.current = onAudioChunk

      // Create AudioContext immediately to capture user gesture
      // This prevents the context from starting in 'suspended' state on some browsers
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      // Ensure context is running
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      while (audioContextRef.current.state !== 'running') {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const nativeSampleRate = audioContextRef.current.sampleRate
      logger.debug(`AudioContext running at ${nativeSampleRate}Hz`)
      // Load audio worklet module
      try {
        await audioContextRef.current.audioWorklet.addModule('/worklets/audio-processor.js')
      } catch (err) {
        throw new Error(
          'Failed to load audio worklet. Please ensure the file exists in public/worklets/'
        )
      }

      // Request microphone access
      const stream = await navigator.mediaDevices
        .getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        .catch((err) => {
          if (err.name === 'NotAllowedError') {
            throw new Error(
              'Microphone access denied. Please check your browser permissions and try again.'
            )
          } else if (err.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.')
          } else if (err.name === 'NotReadableError') {
            throw new Error(
              'Microphone is in use by another application. Please close other apps and try again.'
            )
          }
          throw err
        })

      mediaStreamRef.current = stream

      // Create source from microphone
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)

      // Create AudioWorkletNode
      processorRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor')

      processorRef.current.port.onmessage = (event) => {
        if (!callbackRef.current) return

        const inputData = event.data as Int16Array

        // Basic validation
        if (!inputData || inputData.length === 0) return

        // Convert to base64
        // We can treat Int16Array buffer directly as bytes
        const base64 =
          typeof Buffer !== 'undefined'
            ? Buffer.from(inputData.buffer).toString('base64')
            : uint8ArrayToBase64(new Uint8Array(inputData.buffer))

        // Send chunk
        callbackRef.current(base64)
      }

      // Connect the nodes
      sourceRef.current.connect(processorRef.current)

      // Ensure audio is actually flowing by monitoring the processor
      // Some browsers require the destination to be active.
      // We use a silent gain node to keep the graph active without feedback.
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.value = 0 // Silent output but keeps graph active
      processorRef.current.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)

      setIsCapturing(true)
      logger.info(
        `Audio capture started at ${nativeSampleRate}Hz using AudioWorklet (resampling to 16kHz in worklet)`
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(errorMessage)
      console.error('Audio capture error:', err)
      throw new Error(errorMessage)
    }
  }, [])

  const stopCapture = useCallback(() => {
    callbackRef.current = null

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.port.onmessage = null // Clean up event listener
      processorRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsCapturing(false)
    logger.info('Audio capture stopped')
  }, [])

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
  }
}

/**
 * Convert Uint8Array to base64 string
 * Compatible with browser environments
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}
