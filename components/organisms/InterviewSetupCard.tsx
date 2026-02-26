"use client";

import { useState } from "react";
import {
  Phone,
  Loader2,
  Sparkles,
  FileText,
  X,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { ResumeUploader } from "@/components/organisms/ResumeUploader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";

interface InterviewSetupCardProps {
  isUpdating: boolean;
  hasResume: boolean;
  initialResumeText?: string;
  onResumeUploaded: (text: string) => void;
  onResumeClear: () => void;
  onStart: () => void;
}

export function InterviewSetupCard({
  isUpdating,
  hasResume,
  initialResumeText,
  onResumeUploaded,
  onResumeClear,
  onStart,
}: InterviewSetupCardProps) {
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const handleResumeComplete = (text: string) => {
    onResumeUploaded(text);
    setIsResumeModalOpen(false);
  };

  return (
    <div className="w-full max-w-lg animate-fade-up space-y-5">
      <div className="text-center space-y-2">
        <Badge variant="primary" dot>
          <Sparkles className="size-3" />
          Ready to start
        </Badge>
        <h2 className="text-2xl font-semibold">Start Live Interview</h2>
        <p className="text-sm text-muted-foreground">
          Confirm your microphone, optionally add resume context, then begin.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="text-sm font-medium">Resume context</span>
            <Badge
              variant={hasResume ? "success" : "secondary"}
              className="text-[10px]"
            >
              {hasResume ? "Added" : "Optional"}
            </Badge>
          </div>
          {hasResume && (
            <button
              onClick={onResumeClear}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-error transition-colors"
              type="button"
            >
              <X className="size-3.5" />
              Remove
            </button>
          )}
        </div>

        {hasResume && (
          <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/8 px-3 py-2">
            <CheckCircle2 className="size-4 text-success shrink-0" />
            <span className="text-xs text-success">
              Resume loaded — interview will be personalised
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="size-3.5" />
                {hasResume ? "Update Resume" : "Upload Resume"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Resume Context</DialogTitle>
                <DialogDescription>
                  Upload your resume so the AI can tailor follow-up questions to
                  your background.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <ResumeUploader
                  onResumeUploaded={handleResumeComplete}
                  onResumeClear={onResumeClear}
                  initialResumeText={initialResumeText}
                />
              </div>
            </DialogContent>
          </Dialog>
          {!hasResume && (
            <p className="text-xs text-muted-foreground">
              Improves question personalisation
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={onStart}
        disabled={isUpdating}
        variant="gradient"
        size="xl"
        className="w-full "
      >
        {isUpdating ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Phone className="size-5" />
        )}
        {isUpdating ? "Preparing…" : "Start Interview"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          M
        </kbd>{" "}
        to mute / unmute during the interview
      </p>
    </div>
  );
}
