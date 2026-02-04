// app/api/interview/template/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import type { InterviewTemplate, User } from '@/types'

export const POST = withAuth(async (req: NextRequest, user: User) => {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.role || !body.baseQuestions || !Array.isArray(body.baseQuestions)) {
      return NextResponse.json(
        { error: 'Invalid template data: role and baseQuestions required' },
        { status: 400 }
      )
    }

    const templateData: Omit<InterviewTemplate, 'id'> = {
      role: body.role,
      companyName: body.companyName || '',
      companyLogoUrl: body.companyLogoUrl,
      level: body.level || 'Mid',
      type: body.type || 'Technical',
      techStack: body.techStack || [],
      focusArea: body.focusArea || [],
      isPublic: typeof body.isPublic === 'boolean' ? body.isPublic : false,

      jobDescription: body.jobDescription || '',
      baseQuestions: body.baseQuestions,
      creatorId: user.id,

      usageCount: 0,
      avgScore: 0,
      createdAt: new Date().toISOString(),
    }

    const docRef = await db.collection('interview_templates').add(templateData)

    return NextResponse.json({ success: true, templateId: docRef.id })
  } catch (error) {
    logger.error('Create Template Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
})
