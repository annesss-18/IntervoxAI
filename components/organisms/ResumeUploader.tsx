'use client'

import { useState, useCallback, useRef } from 'react'
import { FileUp, FileCheck, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ResumeUploaderProps {
  onResumeUploaded: (text: string) => void
  onResumeClear: () => void
  initialResumeText?: string
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  fileName?: string
  error?: string
  textPreview?: string
}

export function ResumeUploader({
  onResumeUploaded,
  onResumeClear,
  initialResumeText,
}: ResumeUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>(() => {
    if (initialResumeText) {
      return {
        status: 'success',
        fileName: 'Previously uploaded resume',
        textPreview: initialResumeText.slice(0, 100),
      }
    }
    return { status: 'idle' }
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setUploadState({ status: 'error', error: 'Please upload a PDF file' })
        toast.error('Please upload a PDF file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setUploadState({ status: 'error', error: 'File size must be under 5MB' })
        toast.error('File size must be under 5MB')
        return
      }

      setUploadState({ status: 'uploading', fileName: file.name })

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/resume/parse', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to parse resume')
        }

        setUploadState({
          status: 'success',
          fileName: file.name,
          textPreview: data.text.slice(0, 100),
        })

        onResumeUploaded(data.text)
        toast.success('Resume uploaded!')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload'
        setUploadState({ status: 'error', fileName: file.name, error: errorMessage })
        toast.error(errorMessage)
      }
    },
    [onResumeUploaded]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0 && files[0]) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0 && files[0]) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleClear = useCallback(() => {
    setUploadState({ status: 'idle' })
    onResumeClear()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onResumeClear])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )

  // Idle state - compact upload zone
  if (uploadState.status === 'idle') {
    return (
      <div className="w-full">
        <div
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          className={`group cursor-pointer rounded-xl p-4 transition-all duration-200 ${
            isDragOver
              ? 'bg-primary/10 border-primary scale-[1.02] border-2'
              : 'bg-secondary/50 border-border hover:border-primary/50 border-2 border-dashed'
          } `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-lg transition-all ${
                isDragOver
                  ? 'bg-primary/20'
                  : 'bg-card border-border group-hover:border-primary/40 border'
              }`}
            >
              <FileUp
                className={`size-5 ${isDragOver ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">
                {isDragOver ? 'Drop here' : 'Upload resume'}
              </p>
              <p className="text-muted-foreground text-xs">PDF, max 5MB (optional)</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Uploading state
  if (uploadState.status === 'uploading') {
    return (
      <div className="border-primary/30 bg-primary/5 w-full rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
            <Loader2 className="text-primary size-5 animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">{uploadState.fileName}</p>
            <p className="text-muted-foreground text-xs">Analyzing...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (uploadState.status === 'error') {
    return (
      <div className="border-error/30 bg-error/5 w-full rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-error/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
            <AlertCircle className="text-error size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">Upload failed</p>
            <p className="text-error text-xs">{uploadState.error}</p>
          </div>
          <button onClick={handleClear} className="hover:bg-secondary rounded-lg p-1.5">
            <X className="text-muted-foreground size-4" />
          </button>
        </div>
      </div>
    )
  }

  // Success state - compact
  return (
    <div className="border-success/30 bg-success/5 w-full rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-success/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FileCheck className="text-success size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">{uploadState.fileName}</p>
          <p className="text-success text-xs">Ready for personalization</p>
        </div>
        <button
          onClick={handleClear}
          className="hover:bg-secondary rounded-lg p-1.5"
          title="Remove"
        >
          <X className="text-muted-foreground size-4" />
        </button>
      </div>
    </div>
  )
}

export default ResumeUploader
