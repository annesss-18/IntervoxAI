"use client";

import { useState, useCallback, useRef } from "react";
import { FileUp, FileCheck, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ResumeUploaderProps {
  onResumeUploaded: (text: string) => void;
  onResumeClear: () => void;
  initialResumeText?: string;
}

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  fileName?: string;
  error?: string;
  textPreview?: string;
}

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME = "text/plain";

function isAllowedResumeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type === DOCX_MIME ||
    file.type === TXT_MIME ||
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt")
  );
}

export function ResumeUploader({
  onResumeUploaded,
  onResumeClear,
  initialResumeText,
}: ResumeUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>(() =>
    initialResumeText
      ? {
          status: "success",
          fileName: "Previously uploaded resume",
          textPreview: initialResumeText.slice(0, 100),
        }
      : { status: "idle" },
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAllowedResumeFile(file)) {
        toast.error("Please upload a PDF, DOCX, or TXT file");
        setUploadState({ status: "error", error: "PDF, DOCX, or TXT only" });
        return;
      }
      if (file.size > MAX_RESUME_SIZE_BYTES) {
        toast.error("File must be under 5 MB");
        setUploadState({ status: "error", error: "File too large (max 5 MB)" });
        return;
      }
      setUploadState({ status: "uploading", fileName: file.name });
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/resume/parse", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to parse resume");
        setUploadState({
          status: "success",
          fileName: file.name,
          textPreview: data.text.slice(0, 100),
        });
        onResumeUploaded(data.text);
        toast.success("Resume uploaded!");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadState({ status: "error", fileName: file.name, error: msg });
        toast.error(msg);
      }
    },
    [onResumeUploaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    setUploadState({ status: "idle" });
    onResumeClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onResumeClear]);
  if (uploadState.status === "idle") {
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload resume file (PDF, DOCX, or TXT). Click or drag and drop."
        className={`cursor-pointer rounded-xl border-2 border-dashed p-5 transition-all duration-200 ${
          isDragOver
            ? "scale-[1.01] border-primary bg-primary/8"
            : "border-border bg-surface-2/50 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex items-center gap-4">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              isDragOver
                ? "bg-primary/20 text-primary"
                : "bg-surface-1 border border-border text-muted-foreground"
            }`}
          >
            <FileUp className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">
              {isDragOver ? "Drop to upload" : "Upload resume"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, or TXT | Max 5 MB | Optional
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (uploadState.status === "uploading") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-primary/25 bg-primary/6 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Loader2 className="size-5 text-primary animate-spin" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{uploadState.fileName}</p>
          <p className="text-xs text-muted-foreground">Parsing resume…</p>
        </div>
      </div>
    );
  }
  if (uploadState.status === "error") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-error/25 bg-error/6 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-error/15">
          <AlertCircle className="size-5 text-error" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Upload failed</p>
          <p className="text-xs text-error">{uploadState.error}</p>
        </div>
        <button
          onClick={handleClear}
          className="rounded-lg p-1.5 hover:bg-surface-2 transition-colors"
          aria-label="Dismiss and retry"
        >
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-success/25 bg-success/6 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15">
        <FileCheck className="size-5 text-success" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{uploadState.fileName}</p>
        <p className="text-xs text-success">Ready for personalisation</p>
      </div>
      <button
        onClick={handleClear}
        className="rounded-lg p-1.5 hover:bg-surface-2 transition-colors"
        title="Remove"
        aria-label="Remove uploaded resume"
      >
        <X className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}
