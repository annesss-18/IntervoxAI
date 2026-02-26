"use client";

import Link from "next/link";
import { Button } from "@/components/atoms/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-10 blur-[100px]"
        style={{
          background: "radial-gradient(ellipse, #c0607a, transparent 70%)",
        }}
      />

      <div className="relative animate-fade-up max-w-md space-y-8">
        <div className="relative mx-auto flex size-24 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-error/20 blur-xl" />
          <div className="relative flex size-24 items-center justify-center rounded-2xl border border-error/30 bg-error/10 shadow-[var(--shadow-lg)]">
            <AlertTriangle className="size-10 text-error" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-sm font-semibold tracking-widest text-error/80 uppercase">
            Something went wrong
          </p>
          <h1 className="font-serif italic font-normal text-4xl text-foreground">
            Unexpected error
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            An unexpected error occurred. You can try again or return home —
            your interview data is safe.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="gradient" size="lg">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
