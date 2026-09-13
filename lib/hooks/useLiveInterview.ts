"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  "idle" | "connecting" | "connected" | "disconnected" | "error";

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
const CAPTION_WORD_INTERVAL_MS = 55;
const CAPTION_CATCH_UP_INTERVAL_MS = 26;

// Delay close detection until after opening pleasantries.
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

// Live transcription events may arrive as whole phrases and do not reliably
// preserve a leading space. Normalize once at the boundary so both the saved
// transcript and the subtitle stream remain readable.
function appendTranscriptText(current: string, incoming: string): string {
  const next = incoming.replace(/\s+/g, " ").trim();
  const previous = current.replace(/\s+/g, " ").trim();

  if (!next) return previous;
  if (!previous) return next;

  if (/^[,.;:!?%\)\]\}]/.test(next) || /[([{]$/.test(previous)) {
    return `${previous}${next}`;
  }

  return `${previous} ${next}`;
}

function captionWords(text: string): string[] {
  return text.match(/\S+/g) ?? [];
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

  const initialTranscriptValue = useMemo(
    () => normalizeInitialTranscript(initialTranscript),
    [initialTranscript],
  );

  const checkpointTranscriptRef = useRef<(() => Promise<void>) | null>(null);

  const [isHeld, setIsHeld] = useState(holdInitialPrompt);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(
    () => initialTranscriptValue,
  );
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"user" | "model" | null>(
    null,
  );
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const transcriptRef = useRef<TranscriptEntry[]>(initialTranscriptValue);
  const sessionIdRef = useRef(sessionId);
  const templateIdRef = useRef(templateId);
  const sessionRef = useRef<Session | null>(null);
  const audioCallbackRef = useRef<((base64Data: string) => void) | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userTranscriptRef = useRef("");
  const modelTurnBufferRef = useRef("");
  const userTranscriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captionQueueRef = useRef<string[]>([]);
  const captionVisibleRef = useRef("");
  const captionSpeakerRef = useRef<"user" | "model" | null>(null);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const captionClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionAttemptsRef = useRef(0);
  const reconnectNotBeforeRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);
  const isConnectedRef = useRef(false);
  const lastSpeakerRef = useRef<"user" | "model" | null>(null);
  const closingDetectedRef = useRef(false);
  const connectingPromiseRef = useRef<Promise<void> | null>(null);
  const checkpointTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkpointInFlightRef = useRef(false);
  const lastCheckpointTurnCountRef = useRef(initialTranscriptValue.length);
  const checkpointConflictRetryRef = useRef(0);
  const hasInitialPromptSentRef = useRef(false);
  const modelTurnCountRef = useRef(0);
  const resumptionHandleRef = useRef<string | null>(null);
  const cachedTokenRef = useRef<{
    token: string;
    model: string;
    expiresAtMs: number;
  } | null>(null);

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
        checkpointConflictRetryRef.current += 1;
        if (checkpointConflictRetryRef.current > 3) {
          logger.warn(
            `Transcript checkpoint conflict retry limit reached for session ${sessionIdRef.current}`,
          );
          checkpointConflictRetryRef.current = 0;
          return;
        }

        const expectedBase =
          payload &&
          typeof payload === "object" &&
          typeof (payload as { expectedBase?: unknown }).expectedBase ===
            "number"
            ? (payload as { expectedBase: number }).expectedBase
            : checkpointBase;

        lastCheckpointTurnCountRef.current = expectedBase;
        setTimeout(() => {
          void checkpointTranscriptRef.current?.();
        }, 100);
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
      checkpointConflictRetryRef.current = 0;
    } catch (checkpointError) {
      logger.warn(
        `Transcript checkpoint failed for session ${sessionIdRef.current}`,
        checkpointError,
      );
    } finally {
      checkpointInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkpointTranscriptRef.current = checkpointTranscript;

    return () => {
      checkpointTranscriptRef.current = null;
    };
  }, [checkpointTranscript]);

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
      // A resumption handle means the server-side session — and its
      // conversation history — is expected to survive this reconnect.
      // Only wipe local turn-tracking state on a genuinely fresh start.
      if (!resumptionHandleRef.current) {
        hasInitialPromptSentRef.current = false;
        modelTurnBufferRef.current = "";
        closingDetectedRef.current = false;
        modelTurnCountRef.current = 0;
      }
    }
  }, [isHeld, status]);

  const releaseHold = useCallback(() => {
    setIsHeld(false);
  }, []);

  const stopCaptionReveal = useCallback(() => {
    if (captionTimerRef.current) {
      clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    captionQueueRef.current = [];
  }, []);

  const beginCaptionForSpeaker = useCallback(
    (speaker: "user" | "model") => {
      if (captionClearTimeoutRef.current) {
        clearTimeout(captionClearTimeoutRef.current);
        captionClearTimeoutRef.current = null;
      }

      if (captionSpeakerRef.current !== speaker) {
        stopCaptionReveal();
        captionSpeakerRef.current = speaker;
        captionVisibleRef.current = "";
        setCurrentCaption("");
      }
    },
    [stopCaptionReveal],
  );

  const queueCaptionText = useCallback(
    (speaker: "user" | "model", text: string) => {
      beginCaptionForSpeaker(speaker);
      captionQueueRef.current.push(...captionWords(text));

      if (captionTimerRef.current) return;

      const revealNextWord = () => {
        const word = captionQueueRef.current.shift();
        if (!word) {
          captionTimerRef.current = null;
          return;
        }

        captionVisibleRef.current = appendTranscriptText(
          captionVisibleRef.current,
          word,
        );
        setCurrentCaption(captionVisibleRef.current);

        const interval =
          captionQueueRef.current.length > 10
            ? CAPTION_CATCH_UP_INTERVAL_MS
            : CAPTION_WORD_INTERVAL_MS;
        captionTimerRef.current = setTimeout(revealNextWord, interval);
      };

      revealNextWord();
    },
    [beginCaptionForSpeaker],
  );

  const clearCaptionAfter = useCallback(
    (speaker: "user" | "model", delay: number) => {
      if (captionClearTimeoutRef.current) {
        clearTimeout(captionClearTimeoutRef.current);
      }

      const queuedWordCount = captionQueueRef.current.length;
      captionClearTimeoutRef.current = setTimeout(
        () => {
          if (captionSpeakerRef.current !== speaker) return;
          stopCaptionReveal();
          captionVisibleRef.current = "";
          setCurrentCaption("");
          setCurrentSpeaker(null);
        },
        Math.max(delay, queuedWordCount * CAPTION_CATCH_UP_INTERVAL_MS + 900),
      );
    },
    [stopCaptionReveal],
  );

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.sessionResumptionUpdate?.resumable) {
        const newHandle = message.sessionResumptionUpdate.newHandle;
        if (newHandle) {
          resumptionHandleRef.current = newHandle;
        }
      }

      if (message.serverContent?.interrupted) {
        setIsAIResponding(false);
        setCurrentSpeaker(null);
        setCurrentCaption("");
        modelTurnBufferRef.current = "";
        stopCaptionReveal();
        captionVisibleRef.current = "";
        captionSpeakerRef.current = null;
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

        const userText = message.serverContent.inputTranscription.text;
        userTranscriptRef.current = appendTranscriptText(
          userTranscriptRef.current,
          userText,
        );
        queueCaptionText("user", userText);

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
          clearCaptionAfter("user", 2_000);
        }, 1500);
      }

      if (message.serverContent?.outputTranscription?.text) {
        const modelText = message.serverContent.outputTranscription.text;
        if (modelText) {
          if (lastSpeakerRef.current !== "model") {
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

          modelTurnBufferRef.current = appendTranscriptText(
            modelTurnBufferRef.current,
            modelText,
          );
          queueCaptionText("model", modelText);
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

        if (
          !closingDetectedRef.current &&
          modelTurnCountRef.current >= MIN_MODEL_TURNS_FOR_CLOSE_DETECTION
        ) {
          const closingPhrases = [
            "thank you so much for your time today",
            "it's been really great speaking with you",
            "best of luck — i genuinely hope to see you",
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

          // Only the just-completed turn counts — a closing phrase spoken
          // earlier in the conversation must not linger and trip this later.
          const finalTextLower = finalModelText.toLowerCase();
          const closingWindow = finalTextLower.slice(-120);
          const endsWithQuestion = /\?\s*$/.test(finalModelText);
          if (
            !endsWithQuestion &&
            closingPhrases.some((phrase) => closingWindow.includes(phrase))
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

        clearCaptionAfter("model", 2_000);
      }
    },
    [
      clearCaptionAfter,
      commitTranscriptEntry,
      onInterruption,
      onInterviewComplete,
      queueCaptionText,
      stopCaptionReveal,
    ],
  );

  const connect = useCallback(async () => {
    if (isConnectedRef.current) return Promise.resolve();
    if (connectingPromiseRef.current) return connectingPromiseRef.current;

    const connectionPromise = (async () => {
      let usedCachedToken = false;
      try {
        setStatus("connecting");
        setError(null);
        isIntentionalDisconnectRef.current = false;

        // A resuming reconnect can reuse its still-valid token — the Live
        // API allows this even though the token is marked single-use — so
        // it skips the token-issuance cooldown and the gap where mic audio
        // would otherwise be silently dropped.
        const TOKEN_REUSE_SAFETY_MS = 20_000;
        const cached = cachedTokenRef.current;
        const canReuseToken =
          Boolean(resumptionHandleRef.current) &&
          Boolean(cached) &&
          cached!.expiresAtMs - Date.now() > TOKEN_REUSE_SAFETY_MS;

        let token: string;
        let model: string;

        if (canReuseToken) {
          token = cached!.token;
          model = cached!.model;
          usedCachedToken = true;
        } else {
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
            const errorData = await tokenResponse.json().catch(() => ({}));
            const retryAfterSeconds = Number(
              tokenResponse.headers.get("Retry-After") ||
                (typeof errorData?.retryAfter === "number"
                  ? errorData.retryAfter
                  : 0),
            );

            if (tokenResponse.status === 429 && retryAfterSeconds > 0) {
              reconnectNotBeforeRef.current =
                Date.now() + retryAfterSeconds * 1000;
              setError("Reconnecting shortly…");
              setStatus("disconnected");
              return;
            }

            throw new Error(
              errorData?.error || "Failed to get authentication token",
            );
          }

          const tokenData = await tokenResponse.json();
          token = tokenData.token;
          model = tokenData.model;
          cachedTokenRef.current = {
            token,
            model,
            expiresAtMs: new Date(tokenData.expiresAt).getTime(),
          };
        }

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
            sessionResumption: {
              handle: resumptionHandleRef.current ?? undefined,
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
              setStatus("disconnected");
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
        // A failed attempt to resume with a reused token shouldn't be
        // retried indefinitely — fall back to a fresh token and session
        // next time. A fresh-token failure leaves resumption state intact,
        // since that failure says nothing about whether resumption itself
        // would have worked.
        if (usedCachedToken) {
          resumptionHandleRef.current = null;
          cachedTokenRef.current = null;
        }
        // Let the reconnect effect handle transient failures.
        setStatus("disconnected");
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

    const exponentialDelay =
      baseDelay * Math.pow(2, reconnectionAttemptsRef.current);
    const cooldownDelay = Math.max(
      0,
      reconnectNotBeforeRef.current - Date.now(),
    );
    const delay = Math.max(exponentialDelay, cooldownDelay);
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
    resumptionHandleRef.current = null;
    cachedTokenRef.current = null;

    if (checkpointTimerRef.current) {
      clearInterval(checkpointTimerRef.current);
      checkpointTimerRef.current = null;
    }

    if (userTranscriptTimeoutRef.current) {
      clearTimeout(userTranscriptTimeoutRef.current);
      userTranscriptTimeoutRef.current = null;
    }

    if (captionClearTimeoutRef.current) {
      clearTimeout(captionClearTimeoutRef.current);
      captionClearTimeoutRef.current = null;
    }
    stopCaptionReveal();
    captionVisibleRef.current = "";
    captionSpeakerRef.current = null;

    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    setIsAIResponding(false);
    setIsUserSpeaking(false);
    setCurrentCaption("");
    setCurrentSpeaker(null);
    setStatus("disconnected");
  }, [stopCaptionReveal]);

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
