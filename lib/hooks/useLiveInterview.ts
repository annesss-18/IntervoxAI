"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  GoogleGenAI,
  Modality,
  LiveServerMessage,
  Session,
} from "@google/genai";
import { logger } from "@/lib/logger";

export interface TranscriptEntry {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

interface InterviewContext {
  role: string;
  companyName?: string;
  level?: string;
  type?: string;
  techStack?: string[];
  questions?: string[];
  resumeText?: string;
  systemInstruction?: string;
  interviewerPersona?: {
    name: string;
    title: string;
    personality: string;
    voice?: string;
  };
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseLiveInterviewReturn {
  status: ConnectionStatus;
  error: string | null;
  transcript: TranscriptEntry[];
  isAIResponding: boolean;
  isUserSpeaking: boolean;
  currentCaption: string;
  currentSpeaker: "user" | "model" | null;
  elapsedTime: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (base64Data: string) => void;
  onAudioReceived: (callback: (base64Data: string) => void) => void;
  releaseHold: () => void;
  flushPendingTranscript: () => void;
}

interface UseLiveInterviewOptions {
  sessionId: string;
  interviewContext: InterviewContext;
  onInterruption?: () => void;
  onInterviewComplete?: () => void;
  holdInitialPrompt?: boolean;
}

const MAX_AUDIO_CHUNK_BYTES = 32768;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function estimateBase64Bytes(base64Data: string): number {
  const padding = base64Data.endsWith("==")
    ? 2
    : base64Data.endsWith("=")
      ? 1
      : 0;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

function isValidPcmChunk(base64Data: string): boolean {
  if (!base64Data || base64Data.length < 16) return false;
  if (base64Data.length % 4 !== 0) return false;
  if (!BASE64_PATTERN.test(base64Data)) return false;

  const estimatedBytes = estimateBase64Bytes(base64Data);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_AUDIO_CHUNK_BYTES)
    return false;
  if (estimatedBytes % 2 !== 0) return false;

  return true;
}

export function useLiveInterview(
  options: UseLiveInterviewOptions,
): UseLiveInterviewReturn {
  const {
    sessionId,
    interviewContext,
    onInterruption,
    onInterviewComplete,
    holdInitialPrompt = false,
  } = options;

  const [isHeld, setIsHeld] = useState(holdInitialPrompt);

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState<string>("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"user" | "model" | null>(
    null,
  );
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  // Keep mutable refs so `connect` doesn't depend on object-identity of props.
  const interviewContextRef = useRef(interviewContext);
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    interviewContextRef.current = interviewContext;
  }, [interviewContext]);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const sessionRef = useRef<Session | null>(null);
  const audioCallbackRef = useRef<((base64Data: string) => void) | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>("");
  const userTranscriptRef = useRef<string>("");
  const userTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionAttemptsRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);
  const isConnectedRef = useRef(false);
  const lastSpeakerRef = useRef<"user" | "model" | null>(null);
  const modelCaptionRef = useRef<string>("");
  const closingDetectedRef = useRef(false);
  const fullTranscriptRef = useRef<string>("");
  const connectingPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (status === "connected") {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [status]);

  const hasInitialPromptSentRef = useRef(false);
  useEffect(() => {
    if (
      status === "connected" &&
      sessionRef.current &&
      !hasInitialPromptSentRef.current &&
      !isHeld
    ) {
      hasInitialPromptSentRef.current = true;
      logger.debug("Sending initial prompt to start interview");
      try {
        sessionRef.current.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: "The interview is starting now. Please introduce yourself and begin.",
                },
              ],
            },
          ],
          turnComplete: true,
        });
        logger.debug("Initial prompt sent successfully");
      } catch (err) {
        logger.error("Failed to send initial prompt:", err);
      }
    }

    if (status === "disconnected" || status === "idle") {
      // Reset so reconnect attempts can re-prime the first model turn.
      hasInitialPromptSentRef.current = false;
    }
  }, [status, isHeld]);

  const releaseHold = useCallback(() => {
    setIsHeld(false);
  }, []);

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.serverContent?.interrupted) {
        setIsAIResponding(false);
        setCurrentSpeaker(null);
        currentTranscriptRef.current = "";
        onInterruption?.();
        return;
      }

      if (message.serverContent?.modelTurn?.parts) {
        setIsAIResponding(true);
        setCurrentSpeaker("model");
        setIsUserSpeaking(false);

        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            logger.debug(
              "Received audio chunk from Gemini, length:",
              part.inlineData.data.length,
            );
            if (audioCallbackRef.current) {
              audioCallbackRef.current(part.inlineData.data);
            } else {
              logger.warn("No audio callback registered");
            }
          }

          if (part.text) {
            currentTranscriptRef.current += part.text;
          }
        }
      }

      if (message.serverContent?.turnComplete) {
        setIsAIResponding(false);

        currentTranscriptRef.current = "";

        const fullModelText = fullTranscriptRef.current.toLowerCase();
        const closingPhrases = [
          "thank you for your time",
          "thanks for your time",
          "thank you for taking the time",
          "good luck with your",
          "best of luck",
          "wish you all the best",
          "that concludes our interview",
          "that wraps up our interview",
          "it was great talking to you",
          "it was great speaking with you",
          "i enjoyed our conversation",
          "we will be in touch",
          "we'll be in touch",
        ];

        const hasClosingPhrase = closingPhrases.some((phrase) =>
          fullModelText.includes(phrase),
        );

        if (hasClosingPhrase && !closingDetectedRef.current) {
          closingDetectedRef.current = true;

          // Allow final synthesized audio to finish before ending the session.
          setTimeout(() => {
            onInterviewComplete?.();
          }, 5000);
        }

        setTimeout(() => {
          setCurrentCaption("");
          setCurrentSpeaker(null);
        }, 2000);
      }

      if (message.serverContent?.inputTranscription) {
        const userText = message.serverContent.inputTranscription.text;
        if (userText) {
          if (lastSpeakerRef.current !== "user") {
            userTranscriptRef.current = "";
            lastSpeakerRef.current = "user";
          }

          setCurrentSpeaker("user");
          setIsUserSpeaking(true);

          userTranscriptRef.current += userText;

          setCurrentCaption(userTranscriptRef.current.trim());

          if (userTranscriptTimeoutRef.current) {
            clearTimeout(userTranscriptTimeoutRef.current);
          }

          userTranscriptTimeoutRef.current = setTimeout(() => {
            const accumulatedText = userTranscriptRef.current.trim();
            if (accumulatedText) {
              setTranscript((prev) => [
                ...prev,
                {
                  role: "user",
                  content: accumulatedText,
                  timestamp: Date.now(),
                },
              ]);
              userTranscriptRef.current = "";
            }
            setIsUserSpeaking(false);
            setCurrentSpeaker(null);
          }, 1500);
        }
      }

      if (message.serverContent?.outputTranscription) {
        const modelText = message.serverContent.outputTranscription.text;
        if (modelText) {
          if (lastSpeakerRef.current !== "model") {
            modelCaptionRef.current = "";
            lastSpeakerRef.current = "model";
          }

          modelCaptionRef.current += modelText;

          fullTranscriptRef.current += modelText;

          // Cap to last 2000 chars — only the tail is needed for closing-phrase detection.
          if (fullTranscriptRef.current.length > 2000) {
            fullTranscriptRef.current = fullTranscriptRef.current.slice(-2000);
          }

          setCurrentCaption(modelCaptionRef.current);
          setCurrentSpeaker("model");

          setTranscript((prev) => {
            const lastEntry = prev[prev.length - 1];
            if (lastEntry?.role === "model") {
              return [
                ...prev.slice(0, -1),
                { ...lastEntry, content: lastEntry.content + modelText },
              ];
            }
            return [
              ...prev,
              {
                role: "model",
                content: modelText,
                timestamp: Date.now(),
              },
            ];
          });
        }
      }
    },
    [onInterruption, onInterviewComplete],
  );

  const connect = useCallback(async () => {
    // Already connected — nothing to do.
    if (isConnectedRef.current) return;

    // Connection already in-flight — return the shared promise (singleflight).
    if (connectingPromiseRef.current) return connectingPromiseRef.current;

    const connectionPromise = (async () => {
      try {
        setStatus("connecting");
        setError(null);
        isIntentionalDisconnectRef.current = false;

        const tokenResponse = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            interviewContext: interviewContextRef.current,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(
            errorData.error || "Failed to get authentication token",
          );
        }

        const { token, model } = await tokenResponse.json();

        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: "v1alpha" },
        });

        const session = await ai.live.connect({
          model: model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              languageCode: "en-US",
            },
          },
          callbacks: {
            onopen: () => {
              logger.info("Live API connection established");
              isConnectedRef.current = true;
              setStatus("connected");
              reconnectionAttemptsRef.current = 0;
            },
            onmessage: (message: LiveServerMessage) => {
              handleMessage(message);
            },
            onerror: (e: ErrorEvent) => {
              logger.error("Live API error:", e);
              isConnectedRef.current = false;
              setError(e.message || "Unknown WebSocket error");
              setStatus("error");
            },
            onclose: (e: CloseEvent) => {
              logger.info("Live API connection closed:", e.reason);
              isConnectedRef.current = false;
              setStatus("disconnected");
            },
          },
        });

        sessionRef.current = session;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
        setStatus("error");
        throw err;
      } finally {
        connectingPromiseRef.current = null;
      }
    })();

    connectingPromiseRef.current = connectionPromise;
    return connectionPromise;
  }, [handleMessage]);

  useEffect(() => {
    if (status !== "disconnected" || isIntentionalDisconnectRef.current) {
      return;
    }

    const maxReconnectionAttempts = 5;
    const baseDelay = 1000;

    if (reconnectionAttemptsRef.current >= maxReconnectionAttempts) {
      setError("Failed to reconnect after multiple attempts");
      setStatus("error");
      return;
    }

    const delay = baseDelay * Math.pow(2, reconnectionAttemptsRef.current);
    reconnectionAttemptsRef.current += 1;

    logger.info(
      `Attempting to reconnect in ${delay}ms (attempt ${reconnectionAttemptsRef.current}/${maxReconnectionAttempts})`,
    );

    const timeoutId = setTimeout(() => {
      connect().catch((error) => {
        logger.error("Reconnection failed:", error);
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [status, connect]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    isConnectedRef.current = false;
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const sendAudio = useCallback((base64Data: string) => {
    if (!sessionRef.current) {
      return;
    }

    if (!isConnectedRef.current) {
      return;
    }

    if (!isValidPcmChunk(base64Data)) {
      logger.warn("Dropping invalid audio chunk before realtime send");
      return;
    }

    try {
      sessionRef.current.sendRealtimeInput({
        audio: {
          data: base64Data,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (error) {
      logger.error("Failed to send audio chunk:", error);
    }
  }, []);

  const onAudioReceived = useCallback(
    (callback: (base64Data: string) => void) => {
      audioCallbackRef.current = callback;
    },
    [],
  );

  // Flush any trailing user transcript partial into the transcript array.
  // Call this before ending the interview to capture in-progress speech.
  const flushPendingTranscript = useCallback(() => {
    if (userTranscriptTimeoutRef.current) {
      clearTimeout(userTranscriptTimeoutRef.current);
      userTranscriptTimeoutRef.current = null;
    }
    const pending = userTranscriptRef.current.trim();
    if (pending) {
      setTranscript((prev) => [
        ...prev,
        { role: "user", content: pending, timestamp: Date.now() },
      ]);
      userTranscriptRef.current = "";
    }
    setIsUserSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    transcript,
    isAIResponding,
    isUserSpeaking,
    currentCaption,
    currentSpeaker,
    elapsedTime,
    connect,
    disconnect,
    sendAudio,
    onAudioReceived,
    releaseHold,
    flushPendingTranscript,
  };
}
