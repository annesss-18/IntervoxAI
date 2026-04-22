"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from "@google/genai";
import { logger } from "@/lib/logger";

export interface TranscriptEntry {
  role: "user" | "model";
  content: string;
  timestamp: number;
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
  flushPendingTranscript: () => TranscriptEntry[];
}

interface UseLiveInterviewOptions {
  sessionId: string;
  templateId?: string;
  initialTranscript?: Array<{ role: string; content: string }>;
  onInterruption?: () => void;
  onInterviewComplete?: () => void;
  holdInitialPrompt?: boolean;
}

const MAX_AUDIO_CHUNK_BYTES = 32768;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const CHECKPOINT_INTERVAL_MS = 30_000;
const CHECKPOINT_TURN_THRESHOLD = 10;
const RECENT_MODEL_TEXT_LIMIT = 2000;

// Minimum number of completed model turns before closing-phrase detection
// activates. Guards against false positives from opening pleasantries:
// e.g., "It was great connecting with you" during introductions would otherwise
// trigger an auto-end 8 seconds into the first exchange.
const MIN_MODEL_TURNS_FOR_CLOSE_DETECTION = 4;

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
  if (estimatedBytes <= 0 || estimatedBytes > MAX_AUDIO_CHUNK_BYTES) {
    return false;
  }

  return estimatedBytes % 2 === 0;
}

function normalizeInitialTranscript(
  initialTranscript: UseLiveInterviewOptions["initialTranscript"],
): TranscriptEntry[] {
  if (!Array.isArray(initialTranscript)) return [];

  const now = Date.now();
  return initialTranscript
    .filter(
      (entry): entry is { role: "user" | "model"; content: string } =>
        (entry?.role === "user" || entry?.role === "model") &&
        typeof entry.content === "string" &&
        entry.content.trim().length > 0,
    )
    .map((entry, index) => ({
      role: entry.role,
      content: entry.content.trim(),
      timestamp: now + index,
    }));
}

function toCheckpointEntries(entries: TranscriptEntry[]) {
  return entries.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));
}

export function useLiveInterview(
  options: UseLiveInterviewOptions,
): UseLiveInterviewReturn {
  const {
    sessionId,
    templateId,
    initialTranscript,
    onInterruption,
    onInterviewComplete,
    holdInitialPrompt = false,
  } = options;

  const initialTranscriptRef = useRef(
    normalizeInitialTranscript(initialTranscript),
  );

  const [isHeld, setIsHeld] = useState(holdInitialPrompt);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(
    initialTranscriptRef.current,
  );
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"user" | "model" | null>(
    null,
  );
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const transcriptRef = useRef<TranscriptEntry[]>(initialTranscriptRef.current);
  const sessionIdRef = useRef(sessionId);
  const templateIdRef = useRef(templateId);
  const sessionRef = useRef<Session | null>(null);
  const audioCallbackRef = useRef<((base64Data: string) => void) | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userTranscriptRef = useRef("");
  const modelTurnBufferRef = useRef("");
  const userTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionAttemptsRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);
  const isConnectedRef = useRef(false);
  const lastSpeakerRef = useRef<"user" | "model" | null>(null);
  const recentModelTranscriptRef = useRef("");
  const closingDetectedRef = useRef(false);
  const connectingPromiseRef = useRef<Promise<void> | null>(null);
  const checkpointTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkpointInFlightRef = useRef(false);
  const lastCheckpointTurnCountRef = useRef(
    initialTranscriptRef.current.length,
  );
  const hasInitialPromptSentRef = useRef(false);
  // Tracks completed model turns for the min-turn closing detection guard.
  const modelTurnCountRef = useRef(0);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    templateIdRef.current = templateId;
  }, [sessionId, templateId]);

  const checkpointTranscript = useCallback(async () => {
    if (checkpointInFlightRef.current) return;

    const checkpointBase = lastCheckpointTurnCountRef.current;
    const appendEntries = transcriptRef.current.slice(checkpointBase);
    if (appendEntries.length === 0) return;

    checkpointInFlightRef.current = true;

    try {
      const response = await fetch(
        `/api/interview/session/${sessionIdRef.current}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcriptAppend: toCheckpointEntries(appendEntries),
            checkpointBase,
          }),
        },
      );

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.status === 409) {
        const expectedBase =
          payload &&
          typeof payload === "object" &&
          typeof (payload as { expectedBase?: unknown }).expectedBase ===
            "number"
            ? (payload as { expectedBase: number }).expectedBase
            : checkpointBase;

        lastCheckpointTurnCountRef.current = expectedBase;
        // Immediately retry to flush any entries above expectedBase.
        setTimeout(() => void checkpointTranscript(), 100);
        return;
      }

      if (!response.ok) {
        throw new Error("Transcript checkpoint failed");
      }

      const nextCheckpointBase =
        payload &&
        typeof payload === "object" &&
        typeof (payload as { nextCheckpointBase?: unknown })
          .nextCheckpointBase === "number"
          ? (payload as { nextCheckpointBase: number }).nextCheckpointBase
          : checkpointBase + appendEntries.length;

      lastCheckpointTurnCountRef.current = nextCheckpointBase;
    } catch (checkpointError) {
      logger.warn(
        `Transcript checkpoint failed for session ${sessionIdRef.current}`,
        checkpointError,
      );
    } finally {
      checkpointInFlightRef.current = false;
    }
  }, []);

  const commitTranscriptEntry = useCallback(
    (entry: TranscriptEntry) => {
      const next = [...transcriptRef.current, entry];
      transcriptRef.current = next;
      setTranscript(next);

      if (
        next.length - lastCheckpointTurnCountRef.current >=
        CHECKPOINT_TURN_THRESHOLD
      ) {
        void checkpointTranscript();
      }
    },
    [checkpointTranscript],
  );

  useEffect(() => {
    if (status === "connected") {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (
      status === "connected" &&
      sessionRef.current &&
      !hasInitialPromptSentRef.current &&
      !isHeld
    ) {
      hasInitialPromptSentRef.current = true;
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
      } catch (sendError) {
        logger.error("Failed to send initial prompt:", sendError);
      }
    }

    if (status === "disconnected" || status === "idle") {
      hasInitialPromptSentRef.current = false;
      recentModelTranscriptRef.current = "";
      modelTurnBufferRef.current = "";
      closingDetectedRef.current = false;
      modelTurnCountRef.current = 0;
    }
  }, [isHeld, status]);

  const releaseHold = useCallback(() => {
    setIsHeld(false);
  }, []);

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.serverContent?.interrupted) {
        setIsAIResponding(false);
        setCurrentSpeaker(null);
        setCurrentCaption("");
        modelTurnBufferRef.current = "";
        onInterruption?.();
        return;
      }

      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            if (audioCallbackRef.current) {
              audioCallbackRef.current(part.inlineData.data);
            } else {
              logger.warn("No audio callback registered");
            }
          }
        }
      }

      if (message.serverContent?.inputTranscription?.text) {
        if (lastSpeakerRef.current !== "user") {
          userTranscriptRef.current = "";
          lastSpeakerRef.current = "user";
        }

        setCurrentSpeaker("user");
        setIsUserSpeaking(true);

        userTranscriptRef.current +=
          message.serverContent.inputTranscription.text;
        setCurrentCaption(userTranscriptRef.current.trim());

        if (userTranscriptTimeoutRef.current) {
          clearTimeout(userTranscriptTimeoutRef.current);
        }

        userTranscriptTimeoutRef.current = setTimeout(() => {
          const accumulatedText = userTranscriptRef.current.trim();
          if (accumulatedText) {
            commitTranscriptEntry({
              role: "user",
              content: accumulatedText,
              timestamp: Date.now(),
            });
            userTranscriptRef.current = "";
          }

          setIsUserSpeaking(false);
          setCurrentSpeaker(null);
          setCurrentCaption("");
        }, 1500);
      }

      if (message.serverContent?.outputTranscription?.text) {
        const modelText = message.serverContent.outputTranscription.text;
        if (modelText) {
          if (lastSpeakerRef.current !== "model") {
            // FIX: When the model starts speaking, flush any pending user
            // transcript immediately rather than waiting for the 1500 ms timeout.
            // Previously, if the timeout fired after the model turn started, the
            // stale partial user text was committed as a new transcript entry,
            // producing duplicate or fragmented entries interleaved with model turns.
            if (userTranscriptTimeoutRef.current) {
              clearTimeout(userTranscriptTimeoutRef.current);
              userTranscriptTimeoutRef.current = null;
            }
            const pendingUser = userTranscriptRef.current.trim();
            if (pendingUser) {
              commitTranscriptEntry({
                role: "user",
                content: pendingUser,
                timestamp: Date.now(),
              });
            }
            userTranscriptRef.current = "";

            modelTurnBufferRef.current = "";
            lastSpeakerRef.current = "model";
          }

          setIsAIResponding(true);
          setCurrentSpeaker("model");
          setIsUserSpeaking(false);

          modelTurnBufferRef.current += modelText;
          recentModelTranscriptRef.current += modelText.toLowerCase();
          if (
            recentModelTranscriptRef.current.length > RECENT_MODEL_TEXT_LIMIT
          ) {
            recentModelTranscriptRef.current =
              recentModelTranscriptRef.current.slice(-RECENT_MODEL_TEXT_LIMIT);
          }

          setCurrentCaption(modelTurnBufferRef.current);
        }
      }

      if (message.serverContent?.turnComplete) {
        const finalModelText = modelTurnBufferRef.current.trim();
        if (finalModelText) {
          commitTranscriptEntry({
            role: "model",
            content: finalModelText,
            timestamp: Date.now(),
          });
          modelTurnCountRef.current += 1;
        }

        setIsAIResponding(false);
        modelTurnBufferRef.current = "";

        // ── Closing phrase detection ────────────────────────────────────────
        //
        // Three improvements over the previous implementation:
        //
        // 1. MIN_MODEL_TURNS_FOR_CLOSE_DETECTION guard prevents false positives
        //    from opening pleasantries. The interview must be substantively
        //    underway before any closing phrase triggers auto-end.
        //
        // 2. Expanded phrase list covers the specific phrases the system prompt
        //    instructs the AI to use, plus common natural variants the AI may
        //    produce. The previous 13-phrase list missed many standard closings.
        //
        // 3. Delay increased from 5000 ms to 8000 ms. The AI typically delivers
        //    2–4 sentence closings after the detection phrase. 5 seconds was
        //    frequently too short for the audio to finish before the submission
        //    flow began, causing the closing statement to be cut off.

        if (
          !closingDetectedRef.current &&
          modelTurnCountRef.current >= MIN_MODEL_TURNS_FOR_CLOSE_DETECTION
        ) {
          const closingPhrases = [
            // Phrases the system prompt explicitly instructs the AI to use:
            "thank you so much for your time today",
            "it's been really great speaking with you",
            "best of luck — i genuinely hope to see you",
            // Common natural closing variants:
            "thank you for your time",
            "thanks for your time",
            "thanks so much for your time",
            "thank you for taking the time",
            "thanks for taking the time",
            "it was great speaking with you",
            "it was great talking with you",
            "it was really great speaking with you",
            "it was a pleasure speaking with you",
            "it was a pleasure talking with you",
            "it's been a pleasure",
            "it has been a pleasure",
            "i really enjoyed our conversation",
            "i enjoyed our conversation",
            "i enjoyed learning about your experience",
            "good luck with your",
            "best of luck",
            "all the best",
            "wish you all the best",
            "that concludes our interview",
            "that wraps up our interview",
            "this brings us to the end of our interview",
            "that's all the questions i had",
            "those are all the questions",
            "i think we've covered everything",
            "we've covered everything",
            "we'll be in touch",
            "we will be in touch",
            "you'll hear from us",
            "you will hear from us",
            "the team will reach out",
            "someone will follow up",
            "i hope to see you on the other side",
          ];

          const recentTranscriptLower =
            recentModelTranscriptRef.current.toLowerCase();
          if (
            closingPhrases.some((phrase) =>
              recentTranscriptLower.includes(phrase),
            )
          ) {
            closingDetectedRef.current = true;
            logger.info(
              `Interview closing detected after ${modelTurnCountRef.current} model turns. Auto-ending in 8s.`,
            );
            setTimeout(() => {
              onInterviewComplete?.();
            }, 8000);
          }
        }

        setTimeout(() => {
          setCurrentCaption("");
          setCurrentSpeaker(null);
        }, 2000);
      }
    },
    [commitTranscriptEntry, onInterruption, onInterviewComplete],
  );

  const connect = useCallback(async () => {
    if (isConnectedRef.current) return Promise.resolve();
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
            ...(templateIdRef.current
              ? { templateId: templateIdRef.current }
              : {}),
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

        const liveSession = await ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              languageCode: "en-US",
            },
          },
          callbacks: {
            onopen: () => {
              isConnectedRef.current = true;
              setStatus("connected");
              reconnectionAttemptsRef.current = 0;

              if (checkpointTimerRef.current) {
                clearInterval(checkpointTimerRef.current);
              }

              checkpointTimerRef.current = setInterval(() => {
                void checkpointTranscript();
              }, CHECKPOINT_INTERVAL_MS);
            },
            onmessage: handleMessage,
            onerror: (event: ErrorEvent) => {
              logger.error("Live API error:", event);
              isConnectedRef.current = false;
              setError(event.message || "Unknown WebSocket error");
              setStatus("error");
            },
            onclose: (event: CloseEvent) => {
              logger.info("Live API connection closed:", event.reason);
              isConnectedRef.current = false;
              setStatus("disconnected");
            },
          },
        });

        sessionRef.current = liveSession;
      } catch (connectError) {
        const errorMessage =
          connectError instanceof Error
            ? connectError.message
            : "Connection failed";
        setError(errorMessage);
        setStatus("error");
        throw connectError;
      } finally {
        connectingPromiseRef.current = null;
      }
    })();

    connectingPromiseRef.current = connectionPromise;
    return connectionPromise;
  }, [checkpointTranscript, handleMessage]);

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

    const timeoutId = setTimeout(() => {
      connect().catch((reconnectError) => {
        logger.error("Reconnection failed:", reconnectError);
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [connect, status]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    isConnectedRef.current = false;

    if (checkpointTimerRef.current) {
      clearInterval(checkpointTimerRef.current);
      checkpointTimerRef.current = null;
    }

    if (userTranscriptTimeoutRef.current) {
      clearTimeout(userTranscriptTimeoutRef.current);
      userTranscriptTimeoutRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    setIsAIResponding(false);
    setIsUserSpeaking(false);
    setCurrentCaption("");
    setCurrentSpeaker(null);
    setStatus("disconnected");
  }, []);

  const sendAudio = useCallback((base64Data: string) => {
    if (!sessionRef.current || !isConnectedRef.current) return;

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
    } catch (sendError) {
      logger.error("Failed to send audio chunk:", sendError);
    }
  }, []);

  const onAudioReceived = useCallback(
    (callback: (base64Data: string) => void) => {
      audioCallbackRef.current = callback;
    },
    [],
  );

  const flushPendingTranscript = useCallback((): TranscriptEntry[] => {
    if (userTranscriptTimeoutRef.current) {
      clearTimeout(userTranscriptTimeoutRef.current);
      userTranscriptTimeoutRef.current = null;
    }

    const pendingUserText = userTranscriptRef.current.trim();
    if (pendingUserText) {
      commitTranscriptEntry({
        role: "user",
        content: pendingUserText,
        timestamp: Date.now(),
      });
      userTranscriptRef.current = "";
    }

    setIsUserSpeaking(false);
    return transcriptRef.current;
  }, [commitTranscriptEntry]);

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
