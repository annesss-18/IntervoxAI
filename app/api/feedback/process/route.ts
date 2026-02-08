import { after, NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import { InterviewRepository, TranscriptSentence } from '@/lib/repositories/interview.repository'
import { InterviewService } from '@/lib/services/interview.service'
import type { User } from '@/types'
import { z } from 'zod'

export const runtime = 'nodejs'

const processFeedbackSchema = z.object({
  interviewId: z.string().min(1, 'Interview ID required'),
})

const transcriptSchema = z
  .array(
    z.object({
      role: z.string().trim().min(1).max(40),
      content: z.string().trim().min(1).max(2000),
    })
  )
  .min(1)
  .max(300)

type ClaimResult =
  | { type: 'missing' }
  | { type: 'unauthorized' }
  | { type: 'no_transcript' }
  | { type: 'already_processing' }
  | { type: 'already_completed'; feedbackId: string | null }
  | { type: 'claimed'; transcript: TranscriptSentence[] }

async function runFeedbackGeneration(interviewId: string, userId: string, transcript: TranscriptSentence[]) {
  try {
    const result = await InterviewService.createFeedback({
      interviewId,
      userId,
      transcript,
    })

    if (!result.success || !result.feedbackId) {
      throw new Error(result.success ? 'Feedback ID missing after generation' : 'Feedback failed')
    }

    await InterviewRepository.update(interviewId, {
      feedbackStatus: 'completed',
      feedbackError: null,
      feedbackCompletedAt: new Date().toISOString(),
      feedbackId: result.feedbackId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate feedback'
    logger.error(`Async feedback processing failed for interview ${interviewId}:`, error)

    try {
      await InterviewRepository.update(interviewId, {
        feedbackStatus: 'failed',
        feedbackError: message,
      })
    } catch (updateError) {
      logger.error(`Failed to persist feedback failure status for interview ${interviewId}:`, updateError)
    }
  }
}

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json()
      const validation = processFeedbackSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            details: validation.error.issues,
          },
          { status: 400 }
        )
      }

      const { interviewId } = validation.data
      const existingFeedback = await FeedbackRepository.findByInterviewId(interviewId, user.id)

      if (existingFeedback) {
        try {
          await InterviewRepository.update(interviewId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            feedbackId: existingFeedback.id,
            finalScore: existingFeedback.totalScore,
            feedbackStatus: 'completed',
            feedbackError: null,
            feedbackCompletedAt: new Date().toISOString(),
          })
        } catch (updateError) {
          logger.warn(
            `Feedback exists for interview ${interviewId} but session metadata update failed:`,
            updateError
          )
        }

        return NextResponse.json({
          success: true,
          status: 'completed',
          feedbackId: existingFeedback.id,
          reused: true,
        })
      }

      const sessionRef = db.collection('interview_sessions').doc(interviewId)

      const claim = await db.runTransaction<ClaimResult>(async (transaction) => {
        const sessionDoc = await transaction.get(sessionRef)

        if (!sessionDoc.exists) {
          return { type: 'missing' }
        }

        const sessionData = sessionDoc.data()
        if (sessionData?.userId !== user.id) {
          return { type: 'unauthorized' }
        }

        const feedbackId = typeof sessionData?.feedbackId === 'string' ? sessionData.feedbackId : null
        if (feedbackId) {
          transaction.update(sessionRef, {
            feedbackStatus: 'completed',
            feedbackError: null,
            feedbackCompletedAt: sessionData?.feedbackCompletedAt || new Date().toISOString(),
          })
          return { type: 'already_completed', feedbackId }
        }

        if (sessionData?.feedbackStatus === 'processing') {
          return { type: 'already_processing' }
        }

        const transcriptValidation = transcriptSchema.safeParse(sessionData?.transcript)
        if (!transcriptValidation.success) {
          return { type: 'no_transcript' }
        }

        const now = new Date().toISOString()
        transaction.update(sessionRef, {
          status: 'completed',
          completedAt: sessionData?.completedAt || now,
          feedbackStatus: 'processing',
          feedbackProcessingAt: now,
          feedbackError: null,
          feedbackRequestedAt: sessionData?.feedbackRequestedAt || now,
        })

        return { type: 'claimed', transcript: transcriptValidation.data }
      })

      if (claim.type === 'missing') {
        return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
      }

      if (claim.type === 'unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      if (claim.type === 'no_transcript') {
        return NextResponse.json(
          { error: 'No transcript available. Submit the interview transcript first.' },
          { status: 400 }
        )
      }

      if (claim.type === 'already_processing') {
        return NextResponse.json(
          {
            success: true,
            status: 'processing',
          },
          { status: 202 }
        )
      }

      if (claim.type === 'already_completed') {
        return NextResponse.json({
          success: true,
          status: 'completed',
          feedbackId: claim.feedbackId,
          reused: true,
        })
      }

      try {
        after(async () => {
          await runFeedbackGeneration(interviewId, user.id, claim.transcript)
        })
      } catch (scheduleError) {
        logger.error(`Failed to schedule feedback processing for interview ${interviewId}:`, scheduleError)
        await InterviewRepository.update(interviewId, {
          feedbackStatus: 'failed',
          feedbackError: 'Failed to schedule feedback processing',
        })

        return NextResponse.json(
          {
            success: false,
            status: 'failed',
            error: 'Failed to schedule feedback processing',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          status: 'processing',
          queued: true,
        },
        { status: 202 }
      )
    } catch (error) {
      logger.error('API /feedback/process error:', error)
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
    maxRequests: 30,
    windowMs: 60 * 1000,
  }
)
