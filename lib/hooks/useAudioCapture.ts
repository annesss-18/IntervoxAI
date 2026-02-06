'use client'

import { useCallback, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface UseAudioCaptureReturn {
  isCapturing: boolean
  error: string | null
  startCapture: (
    onAudioChunk: (chunk: string) => void,
    options?: { vadSensitivity?: number }
  ) => Promise<void>
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
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const outputMonitorGainRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const callbackRef = useRef<((chunk: string) => void) | null>(null)

  const startCapture = useCallback(
    async (onAudioChunk: (chunk: string) => void, options?: { vadSensitivity?: number }) => {
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

        // Request microphone access
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error(
            'Microphone API unavailable in this browser context. Use HTTPS (or localhost) and a supported browser.'
          )
        }

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

        const vadThreshold = mapSensitivityToVadThreshold(options?.vadSensitivity ?? 60)

        let captureNode: AudioNode | null = null

        // Primary path: AudioWorklet processor
        try {
          const moduleUrl = new URL('/worklets/audio-processor.js', window.location.origin).href
          await audioContextRef.current.audioWorklet.addModule(moduleUrl)

          processorRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor')
          processorRef.current.port.postMessage({
            type: 'SET_VAD_THRESHOLD',
            value: vadThreshold,
          })

          processorRef.current.port.onmessage = (event) => {
            if (!callbackRef.current) return

            const inputData = event.data as Int16Array

            if (!inputData || inputData.length === 0) return
            if (inputData.length > 16000 || inputData.byteLength % 2 !== 0) return

            const base64 =
              typeof Buffer !== 'undefined'
                ? Buffer.from(inputData.buffer).toString('base64')
                : uint8ArrayToBase64(new Uint8Array(inputData.buffer))

            callbackRef.current(base64)
          }

          captureNode = processorRef.current
          logger.info('Audio capture initialized with AudioWorklet')
        } catch (workletError) {
          logger.warn('AudioWorklet unavailable, using ScriptProcessor fallback:', workletError)

          const createScriptProcessor = (audioContextRef.current as AudioContext)
            .createScriptProcessor
          if (!createScriptProcessor) {
            throw new Error('Audio processing is not supported in this browser.')
          }

          scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
          scriptProcessorRef.current.onaudioprocess = (event) => {
            if (!callbackRef.current || !audioContextRef.current) return

            const inputData = event.inputBuffer.getChannelData(0)
            if (!inputData || inputData.length === 0) return

            const downsampled = downsampleTo16k(inputData, audioContextRef.current.sampleRate)
            if (downsampled.length === 0) return

            let rms = 0
            for (let i = 0; i < downsampled.length; i++) {
              const sample = downsampled[i] ?? 0
              rms += sample * sample
            }
            rms = Math.sqrt(rms / downsampled.length)
            if (rms < vadThreshold) return

            const pcmData = float32ToInt16(downsampled)
            const base64 =
              typeof Buffer !== 'undefined'
                ? Buffer.from(pcmData.buffer).toString('base64')
                : uint8ArrayToBase64(new Uint8Array(pcmData.buffer))

            callbackRef.current(base64)
          }

          captureNode = scriptProcessorRef.current
        }

        if (!captureNode) {
          throw new Error('Failed to initialize audio processing pipeline.')
        }

        sourceRef.current.connect(captureNode)

        // Keep graph active without audible feedback.
        outputMonitorGainRef.current = audioContextRef.current.createGain()
        outputMonitorGainRef.current.gain.value = 0
        captureNode.connect(outputMonitorGainRef.current)
        outputMonitorGainRef.current.connect(audioContextRef.current.destination)

        setIsCapturing(true)
        logger.info(
          `Audio capture started at ${nativeSampleRate}Hz (VAD threshold: ${vadThreshold.toFixed(4)})`
        )
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone'
        setError(errorMessage)
        console.error('Audio capture error:', err)
        throw new Error(errorMessage)
      }
    },
    []
  )

  const stopCapture = useCallback(() => {
    callbackRef.current = null

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.port.onmessage = null // Clean up event listener
      processorRef.current = null
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current.onaudioprocess = null
      scriptProcessorRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (outputMonitorGainRef.current) {
      outputMonitorGainRef.current.disconnect()
      outputMonitorGainRef.current = null
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

function mapSensitivityToVadThreshold(sensitivity: number): number {
  const normalized = Math.max(1, Math.min(100, sensitivity))
  // Higher sensitivity should capture quieter audio (lower threshold).
  const minThreshold = 0.002
  const maxThreshold = 0.02
  const ratio = (100 - normalized) / 99
  return minThreshold + ratio * (maxThreshold - minThreshold)
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  const targetSampleRate = 16000
  if (inputSampleRate === targetSampleRate) {
    return input
  }

  const ratio = inputSampleRate / targetSampleRate
  const outputLength = Math.floor(input.length / ratio)
  if (outputLength <= 0) return new Float32Array(0)

  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const fraction = srcIndex - srcIndexFloor

    const sample1 = input[srcIndexFloor] ?? 0
    const sample2 = input[srcIndexFloor + 1] ?? sample1
    output[i] = sample1 + (sample2 - sample1) * fraction
  }

  return output
}

function float32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}
