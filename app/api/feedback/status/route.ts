import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import { InterviewRepository } from '@/lib/repositories/interview.repository'
import type { User } from '@/types'
import { z } from 'zod'

const feedbackStatusQuerySchema = z.object({
  interviewId: z.string().min(1, 'Interview ID required'),
})

function resolveFeedbackStatus(
  sessionStatus: string | undefined,
  feedbackStatus: string | undefined,
  hasTranscript: boolean
): 'idle' | 'pending' | 'processing' | 'completed' | 'failed' {
  if (feedbackStatus === 'pending' || feedbackStatus === 'processing' || feedbackStatus === 'failed') {
    return feedbackStatus
  }

  if (feedbackStatus === 'completed') {
    return 'completed'
  }

  if (sessionStatus === 'completed' && hasTranscript) {
    return 'pending'
  }

  return 'idle'
}

export const GET = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const rawInterviewId = req.nextUrl.searchParams.get('interviewId') ?? ''
      const validation = feedbackStatusQuerySchema.safeParse({ interviewId: rawInterviewId })

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid query',
            details: validation.error.issues,
          },
          { status: 400 }
        )
      }

      const { interviewId } = validation.data
      const session = await InterviewRepository.findById(interviewId)

      if (!session) {
        return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
      }

      if (session.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const feedback = await FeedbackRepository.findByInterviewId(interviewId, user.id)

      if (feedback) {
        if (
          session.feedbackStatus !== 'completed' ||
          session.feedbackId !== feedback.id ||
          session.finalScore !== feedback.totalScore
        ) {
          await InterviewRepository.update(interviewId, {
            status: 'completed',
            completedAt: session.completedAt || new Date().toISOString(),
            feedbackStatus: 'completed',
            feedbackError: null,
            feedbackCompletedAt: session.feedbackCompletedAt || new Date().toISOString(),
            feedbackId: feedback.id,
            finalScore: feedback.totalScore,
          })
        }

        return NextResponse.json({
          success: true,
          status: 'completed',
          feedbackId: feedback.id,
          error: null,
        })
      }

      const hasTranscript = Array.isArray(session.transcript) && session.transcript.length > 0
      const status = resolveFeedbackStatus(session.status, session.feedbackStatus, hasTranscript)

      return NextResponse.json({
        success: true,
        status,
        feedbackId: session.feedbackId || null,
        error: status === 'failed' ? (session.feedbackError ?? 'Feedback generation failed') : null,
      })
    } catch (error) {
      logger.error('API /feedback/status error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
        },
        { status: 500 }
      )
    }
  },
  {
    maxRequests: 120,
    windowMs: 60 * 1000,
  }
)
