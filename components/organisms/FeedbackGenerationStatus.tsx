'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
import { Badge } from '@/components/atoms/badge'

type FeedbackJobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface FeedbackGenerationStatusProps {
  sessionId: string
}

interface FeedbackStatusResponse {
  success?: boolean
  status?: FeedbackJobStatus
  feedbackId?: string | null
  error?: string | null
}

const POLL_INTERVAL_MS = 2500

export function FeedbackGenerationStatus({ sessionId }: FeedbackGenerationStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState<FeedbackJobStatus>('pending')
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const pollTimerRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)
  const completionToastShownRef = useRef(false)

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const checkStatus = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    try {
      const response = await fetch(`/api/feedback/status?interviewId=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        cache: 'no-store',
      })

      const data = (await response.json()) as FeedbackStatusResponse
      if (!response.ok || !data.success || !data.status) {
        throw new Error(data.error || 'Failed to fetch feedback status')
      }

      setStatus(data.status)
      setError(data.error || null)

      if (data.status === 'completed') {
        clearPolling()
        if (!completionToastShownRef.current) {
          completionToastShownRef.current = true
          toast.success('Your interview feedback is ready.')
        }
        router.refresh()
      }

      if (data.status === 'failed') {
        clearPolling()
      }
    } catch (statusError) {
      setError(
        statusError instanceof Error ? statusError.message : 'Unable to check feedback status right now'
      )
    } finally {
      inFlightRef.current = false
    }
  }, [clearPolling, router, sessionId])

  const triggerProcessing = useCallback(async () => {
    const response = await fetch('/api/feedback/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: sessionId }),
    })

    const data = (await response.json()) as FeedbackStatusResponse
    if (!response.ok || !data.success || !data.status) {
      throw new Error(data.error || 'Failed to start feedback processing')
    }

    setStatus(data.status)
    setError(data.error || null)
  }, [sessionId])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        await triggerProcessing()
      } catch (processingError) {
        if (isMounted) {
          setStatus('failed')
          setError(
            processingError instanceof Error
              ? processingError.message
              : 'Failed to start feedback processing'
          )
          return
        }
      }

      if (!isMounted) return
      await checkStatus()

      if (pollTimerRef.current === null) {
        pollTimerRef.current = window.setInterval(() => {
          void checkStatus()
        }, POLL_INTERVAL_MS)
      }
    }

    void initialize()

    return () => {
      isMounted = false
      clearPolling()
    }
  }, [checkStatus, clearPolling, triggerProcessing])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    setError(null)
    setStatus('pending')

    try {
      await triggerProcessing()
      await checkStatus()
      if (pollTimerRef.current === null) {
        pollTimerRef.current = window.setInterval(() => {
          void checkStatus()
        }, POLL_INTERVAL_MS)
      }
    } catch (retryError) {
      setStatus('failed')
      setError(retryError instanceof Error ? retryError.message : 'Retry failed')
    } finally {
      setIsRetrying(false)
    }
  }, [checkStatus, triggerProcessing])

  const title =
    status === 'processing'
      ? 'Analyzing Interview'
      : status === 'failed'
        ? 'Feedback Generation Failed'
        : 'Feedback Queued'

  const description =
    status === 'processing'
      ? 'Your transcript is being analyzed. This usually takes under a minute.'
      : status === 'pending'
        ? 'Your transcript is queued. Processing starts automatically in a moment.'
        : status === 'failed'
          ? 'Something went wrong while generating feedback. You can retry now.'
          : 'Your interview is complete. We are preparing your detailed report.'

  const statusVariant =
    status === 'failed' ? 'error' : status === 'completed' ? 'success' : status === 'processing' ? 'info' : 'secondary'

  return (
    <div className="animate-fadeIn mx-auto max-w-3xl p-6">
      <Card variant="gradient">
        <CardContent className="space-y-6 px-7 py-10 text-center sm:px-10 sm:py-12">
          <div className="mx-auto">
            {status === 'failed' ? (
              <div className="border-error/30 bg-error/10 flex size-24 items-center justify-center rounded-full border-2">
                <AlertCircle className="text-error size-12" />
              </div>
            ) : (
              <div className="border-primary/30 bg-primary/10 flex size-24 items-center justify-center rounded-full border-2">
                <Loader2 className="text-primary size-12 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Badge variant={statusVariant} className="mx-auto inline-flex uppercase">
              <Sparkles className="size-3" />
              Feedback Status: {status}
            </Badge>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
            {error && <p className="text-error text-sm">{error}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {status === 'failed' ? (
              <Button onClick={handleRetry}>
                {isRetrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                <span>{isRetrying ? 'Retrying...' : 'Retry Generation'}</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  void checkStatus()
                }}
              >
                <RefreshCw className="size-4" />
                <span>Check Now</span>
              </Button>
            )}

            <Button asChild variant="outline">
              <Link href={`/interview/session/${sessionId}`}>Back to Session</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeedbackGenerationStatus
