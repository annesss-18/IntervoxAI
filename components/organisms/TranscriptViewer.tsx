"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, User2 } from "lucide-react";

interface TranscriptEntry {
    role: string;
    content: string;
}

interface TranscriptViewerProps {
    transcript: TranscriptEntry[];
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
    const [open, setOpen] = useState(false);

    if (!transcript || transcript.length === 0) return null;

    const userTurns = transcript.filter((e) => e.role === "user").length;
    const aiTurns = transcript.filter((e) => e.role !== "user").length;

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-2/60"
                aria-expanded={open}
            >
                <div className="space-y-0.5">
                    <span className="font-semibold">Full transcript</span>
                    <p className="text-xs text-muted-foreground">
                        {aiTurns} interviewer turn{aiTurns !== 1 ? "s" : ""} ·{" "}
                        {userTurns} candidate turn{userTurns !== 1 ? "s" : ""}
                    </p>
                </div>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {open ? (
                        <ChevronUp className="size-4" />
                    ) : (
                        <ChevronDown className="size-4" />
                    )}
                </span>
            </button>

            {open && (
                <div className="custom-scrollbar max-h-[560px] overflow-y-auto border-t border-border px-6 py-5 space-y-4">
                    {transcript.map((entry, i) => {
                        const isAI = entry.role === "model";
                        return (
                            <div
                                key={i}
                                className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}
                            >
                                {/* Avatar */}
                                <div
                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${isAI ? "bg-primary/12" : "bg-secondary/12"
                                        }`}
                                >
                                    {isAI ? (
                                        <Sparkles className="size-3.5 text-primary" />
                                    ) : (
                                        <User2 className="size-3.5 text-secondary" />
                                    )}
                                </div>

                                {/* Bubble */}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isAI
                                            ? "rounded-tl-sm bg-surface-2 text-foreground"
                                            : "rounded-tr-sm bg-secondary/10 text-foreground"
                                        }`}
                                >
                                    {entry.content}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}