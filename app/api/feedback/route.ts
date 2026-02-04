// app/api/feedback/route.ts (UPDATED)
import { NextRequest, NextResponse } from 'next/server'
import { createFeedback } from '@/lib/actions/interview.action'
import { withAuth } from '@/lib/api-middleware'
import { db } from '@/firebase/admin'
import { logger } from '@/lib/logger'
import type { User } from '@/types'
import { z } from 'zod'

// Input validation
const feedbackRequestSchema = z.object({
  interviewId: z.string().min(1, 'Interview ID required'),
  transcript: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .min(1, 'Transcript cannot be empty'),
})

export const POST = withAuth(
  async (req: NextRequest, user: User) => {
    try {
      const body = await req.json()

      // Validate input
      const validation = feedbackRequestSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            details: validation.error.issues,
          },
          { status: 400 }
        )
      }

      const { interviewId, transcript } = validation.data

      // Create feedback
      const result = await createFeedback({
        interviewId,
        userId: user.id,
        transcript,
      })

      if (result.success && 'feedbackId' in result) {
        // Mark session as completed and save transcript
        try {
          await db.collection('interview_sessions').doc(interviewId).update({
            status: 'completed',
            completedAt: new Date().toISOString(),
            feedbackId: result.feedbackId,
            transcript: transcript, // Store full transcript in session
          })
        } catch (updateError) {
          logger.warn('Failed to update session status:', updateError)
        }
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error('API /feedback error:', error)
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
    maxRequests: 10,
    windowMs: 60 * 1000,
  }
)
