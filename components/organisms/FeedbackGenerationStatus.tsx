'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

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
    if (!response.ok && response.status !== 202) {
      throw new Error(data.error || 'Failed to start feedback processing')
    }

    if (data.status) {
      setStatus(data.status)
    }

    if (data.error) {
      setError(data.error)
    } else {
      setError(null)
    }
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
      : status === 'failed'
        ? 'Something went wrong while generating feedback. You can retry now.'
        : 'Your interview is complete. We are preparing your detailed report.'

  return (
    <div className="animate-fadeIn mx-auto max-w-4xl p-6">
      <div className="card-border">
        <div className="card space-y-6 !p-12 text-center">
          <div className="mx-auto">
            {status === 'failed' ? (
              <div className="flex size-24 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-500/20">
                <AlertCircle className="size-12 text-red-400" />
              </div>
            ) : (
              <div className="border-primary-400/30 bg-primary-500/10 flex size-24 items-center justify-center rounded-full border-2">
                <Loader2 className="text-primary-300 size-12 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-primary-300 inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="size-3" />
              Feedback Status: {status}
            </div>
            <h2 className="text-light-100 text-2xl font-bold">{title}</h2>
            <p className="text-light-300">{description}</p>
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {status === 'failed' ? (
              <button className="btn-primary inline-flex items-center gap-2" onClick={handleRetry}>
                {isRetrying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                <span>{isRetrying ? 'Retrying...' : 'Retry Generation'}</span>
              </button>
            ) : (
              <button
                className="btn-secondary inline-flex items-center gap-2"
                onClick={() => {
                  void checkStatus()
                }}
              >
                <RefreshCw className="size-4" />
                <span>Check Now</span>
              </button>
            )}

            <Link href={`/interview/session/${sessionId}`} className="btn-secondary inline-flex gap-2">
              <span>Back to Session</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackGenerationStatus
