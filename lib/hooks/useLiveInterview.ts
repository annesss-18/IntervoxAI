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
  sendInitialPrompt: () => void;
  onAudioReceived: (callback: (base64Data: string) => void) => void;
}

interface UseLiveInterviewOptions {
  sessionId: string;
  interviewContext: InterviewContext;
  onInterruption?: () => void;
  onInterviewComplete?: () => void; // Called when AI naturally concludes the interview
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
  if (estimatedBytes % 2 !== 0) return false; // Int16 PCM

  return true;
}

/**
 * Hook for managing Gemini Live API WebSocket connection for live interviews.
 */
export function useLiveInterview(
  options: UseLiveInterviewOptions,
): UseLiveInterviewReturn {
  const { sessionId, interviewContext, onInterruption, onInterviewComplete } =
    options;

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  // Current caption for subtitle display (last spoken text)
  const [currentCaption, setCurrentCaption] = useState<string>("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"user" | "model" | null>(
    null,
  );
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const audioCallbackRef = useRef<((base64Data: string) => void) | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>(""); // Accumulates AI model text
  const userTranscriptRef = useRef<string>(""); // Accumulates user speech text
  const userTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce for user transcript
  const reconnectionAttemptsRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);
  const isConnectedRef = useRef(false); // Synchronous connection status tracking
  const lastSpeakerRef = useRef<"user" | "model" | null>(null); // Track last speaker to clear caption on change
  const modelCaptionRef = useRef<string>(""); // Accumulate model caption separately
  const closingDetectedRef = useRef(false); // Prevent duplicate closing triggers
  const fullTranscriptRef = useRef<string>(""); // Track full model output for closing detection

  // Timer effect
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

  // Send initial prompt when connection is established
  // This is in a useEffect because we need sessionRef.current to be set first
  const hasInitialPromptSentRef = useRef(false);
  useEffect(() => {
    if (
      status === "connected" &&
      sessionRef.current &&
      !hasInitialPromptSentRef.current
    ) {
      hasInitialPromptSentRef.current = true;
      logger.debug("📤 Sending initial prompt to start interview...");
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
        logger.debug("✅ Initial prompt sent successfully");
      } catch (err) {
        logger.error("Failed to send initial prompt:", err);
      }
    }

    // Reset the flag when disconnected so prompt can be sent again on reconnect
    if (status === "disconnected" || status === "idle") {
      hasInitialPromptSentRef.current = false;
    }
  }, [status]);

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      // Handle interruption
      if (message.serverContent?.interrupted) {
        setIsAIResponding(false);
        setCurrentSpeaker(null);
        currentTranscriptRef.current = "";
        onInterruption?.();
        return;
      }

      // Handle model turn (audio response)
      if (message.serverContent?.modelTurn?.parts) {
        setIsAIResponding(true);
        setCurrentSpeaker("model");
        setIsUserSpeaking(false);

        for (const part of message.serverContent.modelTurn.parts) {
          // Audio data
          if (part.inlineData?.data) {
            logger.debug(
              "📢 Received audio chunk from Gemini, length:",
              part.inlineData.data.length,
            );
            if (audioCallbackRef.current) {
              audioCallbackRef.current(part.inlineData.data);
            } else {
              logger.warn("⚠️ No audio callback registered!");
            }
          }

          // Text from modelTurn is internal thinking - store for transcript but don't display
          // The actual spoken text comes via outputTranscription
          if (part.text) {
            currentTranscriptRef.current += part.text;
          }
        }
      }

      // Handle turn complete
      if (message.serverContent?.turnComplete) {
        setIsAIResponding(false);

        // Clear internal thinking buffer (not used for display)
        currentTranscriptRef.current = "";

        // Check for interview closing phrases
        // Only trigger on DEFINITIVE closing statements, not when AI asks if user has questions
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

          // Wait a bit for the AI's final message to finish playing
          setTimeout(() => {
            onInterviewComplete?.();
          }, 5000); // 5 second delay after closing detected
        }

        // Clear caption after a brief delay if not interrupted by user
        setTimeout(() => {
          setCurrentCaption("");
          setCurrentSpeaker(null);
        }, 2000);
      }

      // Handle input transcription (user speech)
      // Accumulate words and debounce to create complete sentences
      if (message.serverContent?.inputTranscription) {
        const userText = message.serverContent.inputTranscription.text;
        if (userText) {
          // Clear caption if switching from model to user
          if (lastSpeakerRef.current !== "user") {
            userTranscriptRef.current = "";
            lastSpeakerRef.current = "user";
          }

          // Set user as current speaker
          setCurrentSpeaker("user");
          setIsUserSpeaking(true);

          // Accumulate the text
          userTranscriptRef.current += userText;

          // Update caption with current user speech only
          setCurrentCaption(userTranscriptRef.current.trim());

          // Clear any existing timeout
          if (userTranscriptTimeoutRef.current) {
            clearTimeout(userTranscriptTimeoutRef.current);
          }

          // Set a debounce timeout - add to transcript after 1.5 seconds of silence
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
            // Clear user speaking state after debounce
            setIsUserSpeaking(false);
            setCurrentSpeaker(null);
          }, 1500);
        }
      }

      // Handle output transcription (actual spoken text from the model)
      // This is what was actually spoken, not internal thinking
      if (message.serverContent?.outputTranscription) {
        const modelText = message.serverContent.outputTranscription.text;
        if (modelText) {
          // Clear caption if switching from user to model
          if (lastSpeakerRef.current !== "model") {
            modelCaptionRef.current = "";
            lastSpeakerRef.current = "model";
          }

          // Accumulate model caption for display
          modelCaptionRef.current += modelText;

          // Also accumulate for closing detection (keeps full history)
          fullTranscriptRef.current += modelText;

          // Update caption with model spoken text only
          setCurrentCaption(modelCaptionRef.current);
          setCurrentSpeaker("model");

          // Also update transcript
          setTranscript((prev) => {
            // Update last model entry if exists
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
    try {
      setStatus("connecting");
      setError(null);
      isIntentionalDisconnectRef.current = false;

      // 1. Get ephemeral token from our API
      const tokenResponse = await fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          interviewContext,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(
          errorData.error || "Failed to get authentication token",
        );
      }

      const { token, model } = await tokenResponse.json();

      // 2. Create GenAI client with ephemeral token
      // Ephemeral tokens require v1alpha API version
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      // 3. Connect to Live API
      const session = await ai.live.connect({
        model: model,
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
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
            // Reconnection is handled externally to avoid circular dependency
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
    }
  }, [sessionId, interviewContext, handleMessage]);

  // Effect to handle automatic reconnection when disconnected unexpectedly
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
      // Session not available, this is normal during initial connection
      return;
    }

    // Use ref for synchronous status check (state updates are async)
    if (!isConnectedRef.current) {
      // Not connected yet, silently skip
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

  // Send an initial text prompt to trigger the AI to start speaking
  // Note: This is now called automatically in the onopen callback
  const sendInitialPrompt = useCallback(() => {
    if (!sessionRef.current || !isConnectedRef.current) {
      logger.warn("⚠️ Cannot send prompt: not connected");
      return;
    }

    try {
      logger.debug("📤 Sending prompt...");
      sessionRef.current.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: "Hello, I am ready to begin the interview. Please introduce yourself and start the interview.",
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch (error) {
      logger.error("Failed to send prompt:", error);
    }
  }, []);

  const onAudioReceived = useCallback(
    (callback: (base64Data: string) => void) => {
      audioCallbackRef.current = callback;
    },
    [],
  );

  // Cleanup on unmount
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
    sendInitialPrompt,
    onAudioReceived,
  };
}
