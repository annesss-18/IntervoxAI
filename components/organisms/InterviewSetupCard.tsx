'use client'

import { useState } from 'react'
import { Phone, Loader2, Sparkles, FileText, X } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card'
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
 * Setup card shown before an interview starts.
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
    <div className="w-full max-w-3xl">
      <Card variant="gradient" className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Sparkles className="text-primary size-5" />
                Start Live Interview
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Confirm your mic settings, optionally attach your resume for better context, then
                begin.
              </CardDescription>
            </div>
            <Badge variant={hasResume ? 'success' : 'secondary'}>
              {hasResume ? 'Resume Added' : 'Resume Optional'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex justify-center">
            <Button onClick={onStart} disabled={isUpdating} size="lg" className="min-w-[220px]">
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Phone className="size-4" />
              )}
              Start Interview
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="text-primary size-4" />
                <span className="text-sm font-medium">Resume context</span>
              </div>
              {hasResume && (
                <button
                  onClick={onResumeClear}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
                  type="button"
                >
                  <X className="size-3.5" />
                  Remove
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <FileText className="size-4" />
                    {hasResume ? 'Update Resume' : 'Upload Resume'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Provide Additional Context</DialogTitle>
                    <DialogDescription>
                      Add your resume so the interviewer can tailor follow-up questions to your
                      experience.
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

              <p className="text-muted-foreground text-xs">
                Optional, but improves interview personalization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InterviewSetupCard
