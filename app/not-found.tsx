import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/atoms/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-15 blur-[100px]"
        style={{
          background: "radial-gradient(ellipse, #7050b0, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-10 blur-[90px]"
        style={{
          background: "radial-gradient(ellipse, #48a8b8, transparent 70%)",
        }}
      />

      <div className="relative animate-fade-up space-y-8 max-w-lg">
        <div className="relative mx-auto flex size-24 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-15 blur-xl" />
          <div className="relative flex size-24 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)]">
            <Compass className="size-10 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-sm font-semibold tracking-widest text-primary uppercase">
            404 Not Found
          </p>
          <h1 className="font-serif italic font-normal text-4xl text-foreground md:text-5xl">
            Lost in the interview
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            This page doesn&apos;t exist or has been moved. Head back to the
            dashboard to keep practising.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="gradient" size="lg">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">Explore interviews</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
