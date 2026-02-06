import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import { logger } from '@/lib/logger'
import type { User } from '@/types'
import { z } from 'zod'

const transcriptEntrySchema = z.object({
  role: z.string().trim().min(1).max(40),
  content: z.string().trim().min(1).max(2000),
})

const feedbackQueueSchema = z.object({
  interviewId: z.string().min(1, 'Interview ID required'),
  transcript: z.array(transcriptEntrySchema).min(1, 'Transcript cannot be empty').max(300),
})

function normalizeTranscript(transcript: z.infer<typeof transcriptEntrySchema>[]) {
  return transcript
    .map((entry) => ({
      role: entry.role.trim().slice(0, 40),
      content: entry.content.replace(/\s+/g, ' ').trim(),
    }))
    .filter((entry) => entry.content.length > 0)
}

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json()
      const validation = feedbackQueueSchema.safeParse(body)

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
      const transcript = normalizeTranscript(validation.data.transcript)

      if (transcript.length === 0) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            details: [{ message: 'Transcript cannot be empty' }],
          },
          { status: 400 }
        )
      }

      const sessionRef = db.collection('interview_sessions').doc(interviewId)
      const sessionDoc = await sessionRef.get()

      if (!sessionDoc.exists) {
        return NextResponse.json({ error: 'Interview session not found' }, { status: 404 })
      }

      const sessionData = sessionDoc.data()
      if (sessionData?.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const now = new Date().toISOString()
      const existingFeedback = await FeedbackRepository.findByInterviewId(interviewId, user.id)

      if (existingFeedback) {
        await sessionRef.update({
          status: 'completed',
          completedAt: sessionData?.completedAt || now,
          transcript,
          feedbackId: existingFeedback.id,
          finalScore: existingFeedback.totalScore,
          feedbackStatus: 'completed',
          feedbackError: null,
          feedbackCompletedAt: now,
        })

        return NextResponse.json({
          success: true,
          queued: false,
          status: 'completed',
          feedbackId: existingFeedback.id,
          reused: true,
        })
      }

      const queuedStatus = sessionData?.feedbackStatus === 'processing' ? 'processing' : 'pending'

      await sessionRef.update({
        status: 'completed',
        completedAt: sessionData?.completedAt || now,
        transcript,
        feedbackStatus: queuedStatus,
        feedbackError: null,
        feedbackRequestedAt: now,
      })

      return NextResponse.json(
        {
          success: true,
          queued: true,
          status: queuedStatus,
        },
        { status: queuedStatus === 'processing' ? 200 : 202 }
      )
    } catch (error) {
      logger.error('API /feedback queue error:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Internal Server Error',
        },
        { status: 500 }
      )
    }
  },
  {
    maxRequests: 20,
    windowMs: 60 * 1000,
  }
)
