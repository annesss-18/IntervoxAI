"use client";

import { useCallback, useRef } from "react";
import { LIVE_INTERVIEW_OUTPUT_SAMPLE_RATE } from "@/lib/live-audio";
import { logger } from "@/lib/logger";

interface UseAudioPlaybackReturn {
  queueAudio: (base64Data: string) => void;
  clearQueue: () => void;
  stop: () => void;
}
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

  const playNextInQueue = useCallback(() => {
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

function resampleAudio(
  input: Float32Array,
  inRate: number,
  outRate: number,
): Float32Array {
  if (inRate === outRate) return input;

  const ratio = inRate / outRate;
  const outputLength = Math.ceil(input.length / ratio);
  const output = new Float32Array(outputLength);

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
