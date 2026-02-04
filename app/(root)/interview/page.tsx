// app/(root)/interview/page.tsx
import React from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/actions/auth.action'
import {
  getInterviewsByUserId,
  getLatestInterviews,
  getFeedbackByInterviewId,
} from '@/lib/actions/interview.action'
import { Sparkles, Plus } from 'lucide-react'
import InterviewTabs from '@/components/organisms/InterviewTabs'

const Page = async () => {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const [userSessions, allTemplates] = await Promise.all([
    getInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id }),
  ])

  // NEW: Fetch feedback for each session
  // This is required because InterviewCard is no longer async
  const sessionsWithFeedback = await Promise.all(
    (userSessions || []).map(async (session) => {
      const feedback = await getFeedbackByInterviewId({ interviewId: session.id, userId: user.id })
      // Map to satisfy SessionData interface (techstack vs techStack, createdAt vs startedAt)
      return {
        ...session,
        techstack: session.techStack,
        createdAt: session.startedAt,
        feedback,
      }
    })
  )

  return (
    <div className="container-app">
      <section className="animate-fadeIn mb-12">
        <div className="card-border">
          <div className="card !p-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="flex-1 space-y-4">
                <div className="bg-primary-500/20 border-primary-400/30 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-md">
                  <Sparkles className="text-primary-300 size-4 animate-pulse" />
                  <span className="text-primary-200 text-sm font-semibold">
                    Interview Dashboard
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  Welcome back,{' '}
                  <span className="from-primary-200 to-accent-300 bg-gradient-to-r bg-clip-text text-transparent">
                    {user.name}
                  </span>
                </h1>

                <p className="text-light-300 max-w-2xl text-lg">
                  Manage your interview sessions and explore new interview templates
                </p>
              </div>

              <Link href="/create" className="btn-primary group px-8 py-4 text-lg">
                <Plus className="size-6" />
                <span className="font-bold">Create Interview</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pass the enriched sessions list */}
      <InterviewTabs
        userSessions={sessionsWithFeedback}
        allTemplates={allTemplates || []}
        userId={user.id}
      />
    </div>
  )
}

export default Page
