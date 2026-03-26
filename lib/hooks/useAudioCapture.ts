"use client";

import { useCallback, useRef, useState } from "react";
import { logger } from "@/lib/logger";

interface UseAudioCaptureReturn {
  error: string | null;
  startCapture: (
    onAudioChunk: (chunk: string) => void,
    options?: { vadSensitivity?: number },
  ) => Promise<void>;
  stopCapture: () => void;
}

const AUDIO_CONTEXT_ACTIVATION_TIMEOUT_MS = 3000;

export function useAudioCapture(): UseAudioCaptureReturn {
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  // AudioWorklet replaced the deprecated ScriptProcessorNode capture path.
  const outputMonitorGainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const callbackRef = useRef<((chunk: string) => void) | null>(null);

  const startCapture = useCallback(
    async (
      onAudioChunk: (chunk: string) => void,
      options?: { vadSensitivity?: number },
    ) => {
      try {
        setError(null);
        callbackRef.current = onAudioChunk;

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const activationStart = Date.now();
        while (audioContextRef.current.state !== "running") {
          if (audioContextRef.current.state === "closed") {
            throw new Error(
              "Audio processing closed unexpectedly before capture started.",
            );
          }

          if (
            Date.now() - activationStart >
            AUDIO_CONTEXT_ACTIVATION_TIMEOUT_MS
          ) {
            throw new Error(
              "AudioContext did not become active within 3 seconds. " +
                "This may be caused by browser autoplay restrictions. " +
                "Please interact with the page and try again.",
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const nativeSampleRate = audioContextRef.current.sampleRate;
        logger.debug(`AudioContext running at ${nativeSampleRate}Hz`);

        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error(
            "Microphone API unavailable in this browser context. Use HTTPS (or localhost) and a supported browser.",
          );
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
            if (err.name === "NotAllowedError") {
              throw new Error(
                "Microphone access denied. Please check your browser permissions and try again.",
              );
            } else if (err.name === "NotFoundError") {
              throw new Error(
                "No microphone found. Please connect a microphone and try again.",
              );
            } else if (err.name === "NotReadableError") {
              throw new Error(
                "Microphone is in use by another application. Please close other apps and try again.",
              );
            }
            throw err;
          });

        mediaStreamRef.current = stream;

        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(stream);

        const vadThreshold = mapSensitivityToVadThreshold(
          options?.vadSensitivity ?? 60,
        );

        // AudioWorklet is the only supported capture path for the browsers we target.
        const moduleUrl = new URL(
          "/worklets/audio-processor.js",
          window.location.origin,
        ).href;

        try {
          await audioContextRef.current.audioWorklet.addModule(moduleUrl);
        } catch (workletError) {
          logger.error("AudioWorklet failed to load:", workletError);
          throw new Error(
            "Real-time audio processing is not supported in this browser. " +
              "Please use Chrome 66+, Firefox 76+, or Safari 14.1+ and ensure " +
              "the page is served over HTTPS.",
          );
        }

        processorRef.current = new AudioWorkletNode(
          audioContextRef.current,
          "audio-processor",
        );
        processorRef.current.port.postMessage({
          type: "SET_VAD_THRESHOLD",
          value: vadThreshold,
        });

        processorRef.current.port.onmessage = (event) => {
          if (!callbackRef.current) return;

          const inputData = event.data as Int16Array;

          if (!inputData || inputData.length === 0) return;
          if (inputData.length > 16000 || inputData.byteLength % 2 !== 0)
            return;

          const base64 = uint8ArrayToBase64(new Uint8Array(inputData.buffer));

          callbackRef.current(base64);
        };

        sourceRef.current.connect(processorRef.current);

        // Connect to destination through a muted gain so the processing graph stays active.
        outputMonitorGainRef.current = audioContextRef.current.createGain();
        outputMonitorGainRef.current.gain.value = 0;
        processorRef.current.connect(outputMonitorGainRef.current);
        outputMonitorGainRef.current.connect(
          audioContextRef.current.destination,
        );

        logger.info(
          `Audio capture started with AudioWorklet at ${nativeSampleRate}Hz (VAD threshold: ${vadThreshold.toFixed(4)})`,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to access microphone";
        setError(errorMessage);
        logger.error("Audio capture error:", err);
        throw new Error(errorMessage);
      }
    },
    [],
  );

  const stopCapture = useCallback(() => {
    callbackRef.current = null;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.port.onmessage = null;
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (outputMonitorGainRef.current) {
      outputMonitorGainRef.current.disconnect();
      outputMonitorGainRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    logger.info("Audio capture stopped");
  }, []);

  return {
    error,
    startCapture,
    stopCapture,
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function mapSensitivityToVadThreshold(sensitivity: number): number {
  const normalized = Math.max(1, Math.min(100, sensitivity));
  // Higher sensitivity maps to a lower RMS threshold.
  const minThreshold = 0.002;
  const maxThreshold = 0.02;
  const ratio = (100 - normalized) / 99;
  return minThreshold + ratio * (maxThreshold - minThreshold);
}
