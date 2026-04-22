"use client";

import { useCallback, useRef } from "react";
import { logger } from "@/lib/logger";

const LIVE_INTERVIEW_OUTPUT_SAMPLE_RATE = 24_000;

interface UseAudioPlaybackReturn {
  queueAudio: (base64Data: string) => void;
  clearQueue: () => void;
  stop: () => void;
}

/**
 * Module-level resampling buffer.
 *
 * resampleAudio is called once per audio chunk (~every 120 ms during playback).
 * Allocating a new Float32Array on every call generates steady GC pressure during
 * live interviews.  We instead keep a single lazily-grown buffer at module scope
 * and return a subarray view into it.
 *
 * Safety: the caller immediately copies the view into a Web Audio AudioBuffer via
 * Float32Array.prototype.set(), which completes synchronously before the next
 * queueAudio invocation, so there is no risk of aliasing between calls.
 */
// Module-level singleton resampling buffer.
//
// INTENTIONAL DESIGN: this buffer is shared across all hook instances
// mounted in the same JS module scope.  In this application only one
// LiveInterviewAgent (and therefore one useAudioPlayback) is ever mounted
// at a time, so there is no aliasing risk.  If this hook is ever used in
// parallel (e.g. in tests or a multi-agent future feature), each caller
// must get its own buffer — move this declaration inside useAudioPlayback
// or accept it as a parameter.
//
// The caller (queueAudio) copies the view into a Web Audio AudioBuffer via
// Float32Array.set() synchronously before the next call, so the buffer
// is safe to reuse without a lock.
let _resampleBuffer: Float32Array | null = null;

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const playbackStartTimeRef = useRef<number | null>(null);
  const playbackStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const getAudioContext = useCallback(() => {
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) throw new Error("AudioContext not supported");

      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playNextInQueue = useCallback(function playNextInQueue() {
    const ctx = audioContextRef.current;
    if (!ctx || audioQueueRef.current.length === 0) return;

    const buffer = audioQueueRef.current.shift();
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Chain playback timestamps to reduce audible gaps between chunks.
    const startTime = Math.max(
      playbackStartTimeRef.current ?? ctx.currentTime,
      ctx.currentTime,
    );
    source.start(startTime);
    playbackStartTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNextInQueue();
      } else {
        playbackStartTimeRef.current = null;
      }
    };
  }, []);

  const queueAudio = useCallback(
    (base64Data: string) => {
      try {
        const ctx = getAudioContext();

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const dataView = new DataView(bytes.buffer);
        const numSamples = bytes.length / 2;
        const float32Array = new Float32Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
          const int16 = dataView.getInt16(i * 2, true);
          float32Array[i] = int16 / 32768.0;
        }

        const systemSampleRate = ctx.sampleRate;
        const finalSamples =
          LIVE_INTERVIEW_OUTPUT_SAMPLE_RATE === systemSampleRate
            ? float32Array
            : resampleAudio(
                float32Array,
                LIVE_INTERVIEW_OUTPUT_SAMPLE_RATE,
                systemSampleRate,
              );

        const audioBuffer = ctx.createBuffer(
          1,
          finalSamples.length,
          systemSampleRate,
        );
        // .set() copies data synchronously — safe to use the reusable buffer view.
        audioBuffer.getChannelData(0).set(finalSamples);

        audioQueueRef.current.push(audioBuffer);

        logger.debug(
          "Audio queued, queue size:",
          audioQueueRef.current.length,
          "isPlaying:",
          !!playbackStartTimeRef.current,
        );

        if (!playbackStartTimeRef.current) {
          // Wait for two chunks when possible to smooth initial playback.
          if (audioQueueRef.current.length >= 2) {
            if (playbackStartTimeoutRef.current) {
              clearTimeout(playbackStartTimeoutRef.current);
              playbackStartTimeoutRef.current = null;
            }
            logger.debug("Starting audio playback");
            playNextInQueue();
          } else if (!playbackStartTimeoutRef.current) {
            // Fallback for short responses that only produce a single chunk.
            playbackStartTimeoutRef.current = setTimeout(() => {
              playbackStartTimeoutRef.current = null;
              if (
                !playbackStartTimeRef.current &&
                audioQueueRef.current.length > 0
              ) {
                logger.debug("Starting delayed playback for short response");
                playNextInQueue();
              }
            }, 120);
          }
        }
      } catch (error) {
        logger.error("Error playing audio:", error);
      }
    },
    [getAudioContext, playNextInQueue],
  );

  const clearQueue = useCallback(() => {
    playbackStartTimeRef.current = null;
    audioQueueRef.current = [];
    if (playbackStartTimeoutRef.current) {
      clearTimeout(playbackStartTimeoutRef.current);
      playbackStartTimeoutRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearQueue();
  }, [clearQueue]);

  return {
    queueAudio,
    clearQueue,
    stop,
  };
}

/**
 * Linearly resample `input` from `inRate` to `outRate`.
 *
 * Instead of allocating a new Float32Array on every call, we lazily grow a
 * module-level buffer and return a subarray view.  The caller copies data into
 * a Web Audio AudioBuffer synchronously via .set() before the next call, so
 * the view is never aliased between invocations.
 */
function resampleAudio(
  input: Float32Array,
  inRate: number,
  outRate: number,
): Float32Array {
  if (inRate === outRate) return input;

  const ratio = inRate / outRate;
  const outputLength = Math.ceil(input.length / ratio);

  // Grow the module-level buffer only when the current chunk is larger than
  // anything seen before.  Over-provision by 50 % to avoid frequent reallocations
  // during the first few chunks when output sizes are still settling.
  if (!_resampleBuffer || _resampleBuffer.length < outputLength) {
    _resampleBuffer = new Float32Array(Math.ceil(outputLength * 1.5));
  }

  const output = _resampleBuffer.subarray(0, outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    const sample1 = input[srcIndexFloor] ?? 0;
    const sample2 = input[srcIndexCeil] ?? 0;
    output[i] = sample1 + (sample2 - sample1) * fraction;
  }

  return output;
}
