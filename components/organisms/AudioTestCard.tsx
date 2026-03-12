"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Wifi,
  WifiOff,
  Headphones,
  AudioLines,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/hooks/useLiveInterview";

type TestStatus = "idle" | "testing" | "passed" | "failed";

interface AudioTestCardProps {
  connectionStatus: ConnectionStatus;
  onContinue: () => void;
  onBack: () => void;
}

const BAR_COUNT = 12;

export function AudioTestCard({
  connectionStatus,
  onContinue,
  onBack,
}: AudioTestCardProps) {
  const [micStatus, setMicStatus] = useState<TestStatus>("idle");
  const [speakerStatus, setSpeakerStatus] = useState<TestStatus>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [speakerConfirmNeeded, setSpeakerConfirmNeeded] = useState(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);
  const micTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micDetectedRef = useRef(false);

  const speakerContextRef = useRef<AudioContext | null>(null);

  const bothPassed = micStatus === "passed" && speakerStatus === "passed";
  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  // Run the microphone check and detect sustained voice activity.
  const stopMicTest = useCallback(() => {
    if (micRafRef.current) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micTimeoutRef.current) {
      clearTimeout(micTimeoutRef.current);
      micTimeoutRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current && micContextRef.current.state !== "closed") {
      micContextRef.current.close();
      micContextRef.current = null;
    }
    micAnalyserRef.current = null;
  }, []);

  const startMicTest = useCallback(async () => {
    try {
      setMicStatus("testing");
      setMicLevel(0);
      micDetectedRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const ctx = new AudioContext();
      micContextRef.current = ctx;

      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let voiceDetectedCount = 0;

      const poll = () => {
        if (!micAnalyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Compute a normalized RMS-like level for the visualizer.
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] ?? 0) / 255;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(1, rms * 3); // amplify for visual
        setMicLevel(level);

        if (level > 0.08) {
          voiceDetectedCount++;
          // Roughly one second of sustained voice at 60fps is enough to pass.
          if (voiceDetectedCount >= 60 && !micDetectedRef.current) {
            micDetectedRef.current = true;
            setMicStatus("passed");
            stopMicTest();
            return;
          }
        }

        micRafRef.current = requestAnimationFrame(poll);
      };

      micRafRef.current = requestAnimationFrame(poll);

      // Stop automatically after 15 seconds if no voice is detected.
      micTimeoutRef.current = setTimeout(() => {
        if (!micDetectedRef.current) {
          setMicStatus("failed");
          stopMicTest();
        }
      }, 15000);
    } catch {
      setMicStatus("failed");
    }
  }, [stopMicTest]);

  // Clean up audio resources when the component unmounts.
  useEffect(() => {
    return () => {
      stopMicTest();
      if (
        speakerContextRef.current &&
        speakerContextRef.current.state !== "closed"
      ) {
        speakerContextRef.current.close();
      }
    };
  }, [stopMicTest]);

  // Play a short tone and ask the user to confirm they heard it.
  const startSpeakerTest = useCallback(() => {
    setSpeakerStatus("testing");
    setSpeakerConfirmNeeded(false);

    try {
      // Close the previous context to prevent AudioContext leaks on retries.
      if (
        speakerContextRef.current &&
        speakerContextRef.current.state !== "closed"
      ) {
        speakerContextRef.current.close();
      }

      const ctx = new AudioContext();
      speakerContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      // Apply a gentle fade-in and fade-out envelope.
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);

      osc.onended = () => {
        setSpeakerConfirmNeeded(true);
      };
    } catch {
      setSpeakerStatus("failed");
    }
  }, []);

  const confirmSpeakerHeard = useCallback(() => {
    setSpeakerStatus("passed");
    setSpeakerConfirmNeeded(false);
  }, []);

  const connectionBadge = isConnected ? (
    <Badge variant="success" className="gap-1 text-[10px]">
      <Wifi className="size-3" />
      AI Ready
    </Badge>
  ) : isConnecting ? (
    <Badge variant="warning" className="gap-1 text-[10px]">
      <Loader2 className="size-3 animate-spin" />
      Connecting…
    </Badge>
  ) : (
    <Badge variant="error" className="gap-1 text-[10px]">
      <WifiOff className="size-3" />
      Not connected
    </Badge>
  );

  // Derive animated bar heights from the current microphone level.
  const barHeights = Array.from({ length: BAR_COUNT }, (_, i) => {
    if (micStatus !== "testing" || micLevel < 0.01) return 4 + (i % 3) * 2;
    const base = 6;
    const scale = 30;
    const variation = Math.sin((i / BAR_COUNT) * Math.PI) * 0.8 + 0.2;
    return base + micLevel * scale * variation;
  });

  return (
    <div className="w-full max-w-lg animate-fade-up space-y-5">
      <div className="text-center space-y-2">
        <Badge variant="primary" dot>
          <AudioLines className="size-3" />
          Audio check
        </Badge>
        <h2 className="text-2xl font-semibold">Test Your Audio</h2>
        <p className="text-sm text-muted-foreground">
          Make sure your microphone and speakers work before the interview
          begins.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {micStatus === "passed" ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : micStatus === "failed" ? (
              <MicOff className="size-4 text-error" />
            ) : (
              <Mic className="size-4 text-primary" />
            )}
            <span className="text-sm font-medium">Microphone</span>
            <Badge
              variant={
                micStatus === "passed"
                  ? "success"
                  : micStatus === "failed"
                    ? "error"
                    : micStatus === "testing"
                      ? "primary"
                      : "secondary"
              }
              className="text-[10px]"
            >
              {micStatus === "passed"
                ? "Working"
                : micStatus === "failed"
                  ? "Not detected"
                  : micStatus === "testing"
                    ? "Listening…"
                    : "Not tested"}
            </Badge>
          </div>
        </div>

        <div
          className={cn(
            "flex h-12 items-end justify-center gap-1 rounded-lg border px-3 py-2 transition-colors duration-300",
            micStatus === "testing"
              ? "border-primary/20 bg-primary/5"
              : micStatus === "passed"
                ? "border-success/20 bg-success/5"
                : micStatus === "failed"
                  ? "border-error/20 bg-error/5"
                  : "border-border bg-surface-2/40",
          )}
          aria-hidden
        >
          {barHeights.map((h, i) => (
            <span
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-all",
                micStatus === "testing"
                  ? "bg-gradient-to-t from-primary/50 to-primary"
                  : micStatus === "passed"
                    ? "bg-gradient-to-t from-success/50 to-success"
                    : "bg-border",
              )}
              style={{
                height: `${h}px`,
                transitionDuration: micStatus === "testing" ? "60ms" : "300ms",
              }}
            />
          ))}
        </div>

        {micStatus === "passed" ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/8 px-3 py-2">
            <CheckCircle2 className="size-4 text-success shrink-0" />
            <span className="text-xs text-success">
              Microphone is working perfectly
            </span>
          </div>
        ) : micStatus === "failed" ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-error">
              No voice detected. Check your mic and try again.
            </p>
            <Button variant="outline" size="sm" onClick={startMicTest}>
              Retry
            </Button>
          </div>
        ) : micStatus === "testing" ? (
          <p className="text-xs text-muted-foreground">
            Speak into your microphone…
          </p>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={startMicTest}
          >
            <Mic className="size-3.5" />
            Test Microphone
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {speakerStatus === "passed" ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <Headphones className="size-4 text-secondary" />
            )}
            <span className="text-sm font-medium">Speakers</span>
            <Badge
              variant={
                speakerStatus === "passed"
                  ? "success"
                  : speakerStatus === "testing"
                    ? "secondary"
                    : "secondary"
              }
              className="text-[10px]"
            >
              {speakerStatus === "passed"
                ? "Working"
                : speakerStatus === "testing"
                  ? "Playing…"
                  : "Not tested"}
            </Badge>
          </div>
        </div>

        {speakerStatus === "passed" ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/8 px-3 py-2">
            <CheckCircle2 className="size-4 text-success shrink-0" />
            <span className="text-xs text-success">
              Speakers are working perfectly
            </span>
          </div>
        ) : speakerConfirmNeeded ? (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Did you hear the tone?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={confirmSpeakerHeard}>
                <CheckCircle2 className="size-3.5 mr-1" />
                Yes
              </Button>
              <Button size="sm" variant="outline" onClick={startSpeakerTest}>
                Play again
              </Button>
            </div>
          </div>
        ) : speakerStatus === "testing" ? (
          <div className="flex items-center gap-2 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2">
            <Volume2 className="size-4 text-secondary animate-pulse" />
            <span className="text-xs text-secondary">Playing test tone…</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={startSpeakerTest}
          >
            <Volume2 className="size-3.5" />
            Test Speakers
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {connectionBadge}
        {isConnecting && (
          <span className="text-[11px] text-muted-foreground">
            Setting up in the background…
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onContinue}
          variant="gradient"
          size="xl"
          className="w-full"
        >
          {bothPassed ? (
            <>
              <ArrowRight className="size-5" />
              Continue to Interview
            </>
          ) : (
            <>
              <ArrowRight className="size-5" />
              Skip & Start Interview
            </>
          )}
        </Button>

        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Setup
        </Button>
      </div>

      {!bothPassed && (
        <p className="text-center text-[11px] text-muted-foreground">
          You can skip the tests, but we recommend checking both for the best
          experience.
        </p>
      )}
    </div>
  );
}
