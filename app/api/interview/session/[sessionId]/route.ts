// app/api/interview/session/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase/admin'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

// Maximum resume text length
const MAX_RESUME_LENGTH = 5000

// PATCH - Update session (e.g., add resume text)
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const { sessionId } = await context.params

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const body = await req.json()
    const { resumeText } = body

    // Get session document
    const sessionRef = db.collection('interview_sessions').doc(sessionId)
    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionDoc.data()

    // Verify user owns this session
    if (sessionData?.userId !== user.id) {
      logger.warn(
        `Unauthorized session update attempt: user ${user.id} tried to update session ${sessionId}`
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow updates to sessions in 'setup' status
    if (sessionData?.status !== 'setup') {
      return NextResponse.json(
        { error: 'Session cannot be modified after starting' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (resumeText !== undefined) {
      // Allow empty string to clear resume
      updateData.resumeText = resumeText ? String(resumeText).slice(0, MAX_RESUME_LENGTH) : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update session
    await sessionRef.update(updateData)

    logger.info(`Session ${sessionId} updated with resume text by user ${user.id}`)

    return NextResponse.json({
      success: true,
      sessionId,
    })
  } catch (error) {
    logger.error('Error updating session:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    )
  }
}

// GET - Get session details
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const { sessionId } = await context.params

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const sessionDoc = await db.collection('interview_sessions').doc(sessionId).get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionDoc.data()

    // Verify user owns this session
    if (sessionData?.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionDoc.id,
        ...sessionData,
      },
    })
  } catch (error) {
    logger.error('Error fetching session:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
