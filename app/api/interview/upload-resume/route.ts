import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase/admin'
import { extractTextFromFile } from '@/lib/server-utils'
import { withAuth } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { encryptResumeText } from '@/lib/resume-crypto'
import type { User } from '@/types'

export const runtime = 'nodejs'

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const formData = await req.formData()
    const sessionId =
      (formData.get('sessionId') as string) || (formData.get('interviewId') as string)
    const resumeFile = formData.get('resume') as File

    if (!sessionId || !resumeFile) {
      return NextResponse.json({ error: 'Missing sessionId or resume file' }, { status: 400 })
    }

    // Verify ownership: User must own the session they're uploading to
    const sessionDoc = await db.collection('interview_sessions').doc(sessionId).get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionDoc.data()
    if (sessionData?.userId !== user.id) {
      return NextResponse.json(
        {
          error: 'Forbidden. You can only upload resumes to your own sessions.',
        },
        { status: 403 }
      )
    }

    const resumeText = await extractTextFromFile(resumeFile)
    const encryptedResumeText = encryptResumeText(resumeText)

    await db.collection('interview_sessions').doc(sessionId).update({
      resumeText: encryptedResumeText,
    })

    return NextResponse.json({ success: true, resumeText })
  } catch (error) {
    logger.error('Resume Upload Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, {
  maxRequests: 6,
  windowMs: 60 * 1000,
})
