"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

interface QuestionsPreviewProps {
    questions: string[];
}

export function QuestionsPreview({ questions }: QuestionsPreviewProps) {
    const [revealed, setRevealed] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    if (!questions || questions.length === 0) return null;

    const handleCopy = async (text: string, idx: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 1500);
        } catch {
            // clipboard API not available — silent fail
        }
    };

    if (!revealed) {
        return (
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold">
                        {questions.length} interview question
                        {questions.length !== 1 ? "s" : ""} prepared
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Start cold for a realistic experience, or reveal to study before
                        your session.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => setRevealed(true)}
                >
                    <Eye className="size-3.5" />
                    Reveal for study mode
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm">Interview questions</span>
                    <Badge variant="warning" className="text-[10px]">Study mode</Badge>
                </div>
                <button
                    type="button"
                    onClick={() => setRevealed(false)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <EyeOff className="size-3.5" />
                    Hide
                </button>
            </div>

            <ol className="divide-y divide-border/60">
                {questions.map((q, i) => (
                    <li
                        key={i}
                        className="group flex items-start gap-3.5 px-5 py-4 hover:bg-surface-2/50 transition-colors"
                    >
                        <span className="font-mono text-xs text-muted-foreground/60 mt-0.5 w-5 shrink-0 select-none">
                            {i + 1}.
                        </span>
                        <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                            {q}
                        </p>
                        <button
                            type="button"
                            onClick={() => handleCopy(q, i)}
                            title="Copy question"
                            className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-all"
                        >
                            {copiedIdx === i ? (
                                <Check className="size-3.5 text-success" />
                            ) : (
                                <Copy className="size-3.5" />
                            )}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}