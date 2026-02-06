import { getCurrentUser } from '@/lib/actions/auth.action'
import { getFeedbackByInterviewId, getInterviewsById } from '@/lib/actions/interview.action'
import { FeedbackGenerationStatus } from '@/components/organisms/FeedbackGenerationStatus'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Home,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import type { RouteParams } from '@/types'

const Page = async ({ params }: RouteParams) => {
  const { sessionId } = await params

  // Guard: ensure route param exists
  if (!sessionId || typeof sessionId !== 'string') {
    redirect('/')
  }

  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in')
  }

  const interview = await getInterviewsById(sessionId, user.id)
  if (!interview) redirect('/')

  const feedback = await getFeedbackByInterviewId({
    interviewId: sessionId,
    userId: user.id,
  })

  if (!feedback) {
    if (interview.status === 'completed') {
      return <FeedbackGenerationStatus sessionId={sessionId} />
    }

    return (
      <div className="animate-fadeIn mx-auto max-w-4xl p-6">
        <div className="card-border">
          <div className="card space-y-6 !p-12 text-center">
            <div className="bg-primary-500/10 border-primary-400/30 mx-auto flex size-24 items-center justify-center rounded-full border-2">
              <AlertCircle className="text-primary-300 size-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-light-100 text-2xl font-bold">No Feedback Available</h2>
              <p className="text-light-300">
                Complete the interview to receive detailed feedback on your performance
              </p>
            </div>
            <Link
              href={`/interview/session/${sessionId}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Target className="size-5" />
              <span>Take Interview</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  type CategoryItem = { name: string; score: number; comment: string }

  const formatDate = (iso?: string) => {
    if (!iso) return 'N/A'
    const date = new Date(iso)
    if (isNaN(date.getTime())) return 'Invalid date'
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-success-100 to-success-200'
    if (score >= 60) return 'from-warning-200 to-accent-200'
    return 'from-destructive-100 to-destructive-200'
  }

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-success-100'
    if (score >= 60) return 'text-warning-200'
    return 'text-destructive-100'
  }

  return (
    <div className="animate-fadeIn mx-auto max-w-6xl space-y-8 p-6">
      {/* Header Section */}
      <header className="card-border animate-slideInLeft">
        <div className="card !p-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="bg-success-100/20 border-success-100/30 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 backdrop-blur-md">
                <Sparkles className="text-success-100 size-3" />
                <span className="text-success-100 text-xs font-semibold">Interview Completed</span>
              </div>

              <div className="space-y-2">
                <h1 className="from-primary-200 to-accent-300 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent lg:text-4xl">
                  Performance Report
                </h1>
                <p className="text-light-400 text-sm">
                  Interview ID:{' '}
                  <span className="text-light-300 font-mono">{feedback.interviewId}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="bg-dark-200/60 border-primary-400/20 flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-sm">
                <Calendar className="text-primary-300 size-4" />
                <span className="text-light-200 text-sm font-medium">
                  {formatDate(feedback.createdAt)}
                </span>
              </div>

              <Link
                href="/"
                className="text-primary-300 hover:text-primary-200 flex items-center gap-2 text-sm font-semibold transition-colors duration-300"
              >
                <Home className="size-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Overall Score Section */}
      <section className="card-border animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
        <div className="card relative overflow-hidden !p-8">
          <div className="from-primary-500/5 absolute inset-0 bg-gradient-to-br to-transparent" />

          <div className="relative z-10 flex flex-col items-center gap-8 lg:flex-row">
            <div className="group relative">
              <div className="from-primary-500/30 to-accent-300/30 absolute inset-0 rounded-full bg-gradient-to-r opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="from-dark-200 to-dark-300 border-primary-400/30 relative flex size-48 items-center justify-center rounded-full border-8 bg-gradient-to-br shadow-2xl">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreTextColor(feedback.totalScore)}`}>
                    {feedback.totalScore}
                  </div>
                  <div className="text-light-400 text-xl font-semibold">/100</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className={`size-6 ${getScoreTextColor(feedback.totalScore)}`} />
                  <h2 className="text-light-100 text-2xl font-bold">Overall Performance</h2>
                </div>
                <p className="text-light-300">
                  {feedback.totalScore >= 80
                    ? 'Outstanding performance! You demonstrated excellent understanding and communication.'
                    : feedback.totalScore >= 60
                      ? 'Good performance with room for improvement. Keep practicing to enhance your skills.'
                      : "There's significant room for growth. Focus on the areas highlighted below."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-light-400">Score Distribution</span>
                  <span className={`font-bold ${getScoreTextColor(feedback.totalScore)}`}>
                    {feedback.totalScore}%
                  </span>
                </div>
                <div className="bg-dark-200 h-4 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-4 bg-gradient-to-r ${getScoreColor(feedback.totalScore)} rounded-full shadow-lg transition-all duration-1000 ease-out`}
                    style={{ width: `${feedback.totalScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Scores Grid */}
      <section className="animate-slideInLeft space-y-4" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-light-100 flex items-center gap-2 text-2xl font-bold">
          <Target className="text-primary-300 size-6" />
          Performance Breakdown
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.isArray(feedback.categoryScoresArray) &&
            feedback.categoryScoresArray.map((cat: CategoryItem, idx: number) => (
              <div
                key={cat.name}
                className="card-border animate-fadeIn"
                style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
              >
                <div className="card !p-6 transition-transform duration-300 hover:scale-[1.02]">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-light-100 text-lg font-bold">{cat.name}</h3>
                    <div className={`text-2xl font-bold ${getScoreTextColor(cat.score)}`}>
                      {cat.score}%
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-dark-200 h-2.5 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-2.5 bg-gradient-to-r ${getScoreColor(cat.score)} transition-all duration-1000 ease-out`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>

                    <p className="text-light-300 text-sm leading-relaxed">{cat.comment}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Strengths and Improvements */}
      <section
        className="animate-slideInLeft grid grid-cols-1 gap-6 lg:grid-cols-2"
        style={{ animationDelay: '0.4s' }}
      >
        <div className="card-border">
          <div className="card !from-success-100/5 !bg-gradient-to-br !to-transparent !p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-success-100/20 border-success-100/30 flex size-12 items-center justify-center rounded-xl border">
                <TrendingUp className="text-success-100 size-6" />
              </div>
              <h3 className="text-light-100 text-xl font-bold">Key Strengths</h3>
            </div>

            <ul className="space-y-3">
              {Array.isArray(feedback.strengths) &&
                feedback.strengths.map((s: string, i: number) => (
                  <li
                    key={i}
                    className="animate-fadeIn flex items-start gap-3"
                    style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                  >
                    <CheckCircle2 className="text-success-100 mt-0.5 size-5 shrink-0" />
                    <span className="text-light-200 text-sm leading-relaxed">{s}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="card-border">
          <div className="card !from-warning-200/5 !bg-gradient-to-br !to-transparent !p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-warning-200/20 border-warning-200/30 flex size-12 items-center justify-center rounded-xl border">
                <TrendingDown className="text-warning-200 size-6" />
              </div>
              <h3 className="text-light-100 text-xl font-bold">Areas for Improvement</h3>
            </div>

            <ul className="space-y-3">
              {Array.isArray(feedback.areasForImprovement) &&
                feedback.areasForImprovement.map((a: string, i: number) => (
                  <li
                    key={i}
                    className="animate-fadeIn flex items-start gap-3"
                    style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                  >
                    <AlertCircle className="text-warning-200 mt-0.5 size-5 shrink-0" />
                    <span className="text-light-200 text-sm leading-relaxed">{a}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final Assessment */}
      <section className="card-border animate-slideInLeft" style={{ animationDelay: '0.5s' }}>
        <div className="card !p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="bg-primary-500/20 border-primary-400/30 flex size-12 shrink-0 items-center justify-center rounded-xl border">
              <Sparkles className="text-primary-300 size-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-light-100 mb-2 text-xl font-bold">Final Assessment</h3>
              <p className="text-light-200 leading-relaxed">{feedback.finalAssessment}</p>
            </div>
          </div>

          <div className="border-primary-400/20 flex flex-col gap-4 border-t pt-6 sm:flex-row">
            <Link href="/" className="btn-secondary flex-1 !justify-center">
              <Home className="size-5" />
              <span>Return to Dashboard</span>
            </Link>
            <Link href="/interview" className="btn-primary flex-1 !justify-center">
              <Target className="size-5" />
              <span>Practice More</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Page
