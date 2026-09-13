"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/atoms/button";

const CATEGORIES = [
  "Microphone or audio",
  "Live interview session",
  "Feedback generation",
  "Account or billing",
  "Something else",
] as const;

export function SupportForm() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    CATEGORIES[0],
  );
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/support/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Request failed");
      }
      setStatus("sent");
      setMessage("");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/8 p-5 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <p>
          Thanks — we&apos;ve received your message and will follow up by email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-card p-5"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Category
        </label>
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as (typeof CATEGORIES)[number])
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          What went wrong?
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Include your session ID (from the feedback page URL) and your browser if relevant."
          rows={4}
          maxLength={2000}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-error">
          {errorMessage ||
            "Something went wrong sending that. Please try again."}
        </p>
      )}

      <Button
        type="submit"
        variant="gradient"
        className="w-full"
        disabled={status === "submitting" || message.trim().length < 10}
      >
        {status === "submitting" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Send message
      </Button>
    </form>
  );
}
