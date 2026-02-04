'use client'

import { useState } from 'react'
import { Phone, Loader2, Sparkles, FileText, ArrowRight, X } from 'lucide-react'
import { ResumeUploader } from '@/components/organisms/ResumeUploader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/atoms/dialog'

interface InterviewSetupCardProps {
  /** Whether the session is being updated (e.g., resume upload) */
  isUpdating: boolean
  /** Whether a resume is attached */
  hasResume: boolean
  /** Initial resume text for the uploader */
  initialResumeText?: string
  /** Callback when resume is uploaded */
  onResumeUploaded: (text: string) => void
  /** Callback when resume is cleared */
  onResumeClear: () => void
  /** Callback when user clicks start */
  onStart: () => void
}

/**
 * Compact setup card shown before an interview starts.
 * Features animated mic indicator and glassmorphism styling.
 */
export function InterviewSetupCard({
  isUpdating,
  hasResume,
  initialResumeText,
  onResumeUploaded,
  onResumeClear,
  onStart,
}: InterviewSetupCardProps) {
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)

  const handleResumeComplete = (text: string) => {
    onResumeUploaded(text)
    setIsResumeModalOpen(false)
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-8">
      {/* Compact Animated Microphone Indicator */}
      <div className="relative">
        {/* Pulse rings */}
        <div
          className="bg-primary/20 absolute inset-0 animate-ping rounded-full"
          style={{ animationDuration: '2s' }}
        />
        <div
          className="bg-primary/10 absolute -inset-2 animate-ping rounded-full"
          style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
        />

        {/* Main icon */}
        <div className="from-primary/20 via-primary/10 to-accent/20 border-primary/30 relative flex size-24 items-center justify-center rounded-full border-2 bg-gradient-to-br backdrop-blur-sm">
          <div className="from-primary to-primary-600 flex size-14 items-center justify-center rounded-full bg-gradient-to-br shadow-lg">
            <Phone className="size-7 text-white" />
          </div>
        </div>

        {/* AI badge */}
        <div className="from-success-500 to-success-600 border-surface-950 absolute -right-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full border-4 bg-gradient-to-br shadow-lg">
          <Sparkles className="size-4 text-white" />
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-2 text-center">
        <h3 className="text-foreground text-2xl font-bold">Ready to Start?</h3>
        <p className="text-muted-foreground mx-auto w-11/12">
          We'll analyze your responses in real-time. Good luck!
        </p>
      </div>

      {/* Actions */}
      <div className="flex w-full flex-col gap-3">
        {/* Primary Start Button */}
        <button
          onClick={onStart}
          disabled={isUpdating}
          className="group shadow-primary/20 hover:shadow-primary/40 relative w-full overflow-hidden rounded-xl px-6 py-4 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="from-primary to-primary-600 group-hover:from-primary-600 group-hover:to-primary-700 absolute inset-0 bg-gradient-to-r transition-all duration-300" />
          <span className="relative flex items-center justify-center gap-2">
            {isUpdating ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Phone className="size-5" />
            )}
            <span>Start Interview Now</span>
          </span>
        </button>

        {/* Resume Options */}
        <div className="flex w-full items-center justify-center">
          {hasResume ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-400">
              <FileText className="size-3.5" />
              <span>Resume Added</span>
              <button
                onClick={onResumeClear}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-emerald-400/20"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
              <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5">
                  <FileText className="size-4" />
                  Add Resume for Context
                </button>
              </DialogTrigger>
              <DialogContent className="bg-surface-900 border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Provide Context</DialogTitle>
                  <DialogDescription>
                    Upload your resume so the AI can ask more personalized questions based on your
                    experience.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <ResumeUploader
                    onResumeUploaded={handleResumeComplete}
                    onResumeClear={onResumeClear}
                    initialResumeText={initialResumeText}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}

export default InterviewSetupCard
