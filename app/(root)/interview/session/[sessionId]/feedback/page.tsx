import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Home,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { RouteParams } from '@/types'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getFeedbackByInterviewId, getInterviewsById } from '@/lib/actions/interview.action'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
import { Progress } from '@/components/atoms/progress'
import { Badge } from '@/components/atoms/badge'
import { Container } from '@/components/layout/Container'
import { FeedbackGenerationStatus } from '@/components/organisms/FeedbackGenerationStatus'

const Page = async ({ params }: RouteParams) => {
  const { sessionId } = await params

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
      <Container size="md" className="animate-fadeIn p-6">
        <Card variant="gradient" className="py-12">
          <CardContent className="space-y-6 text-center">
            <div className="bg-primary/10 border-primary/30 mx-auto flex size-24 items-center justify-center rounded-full border-2">
              <AlertCircle className="text-primary size-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No Feedback Available</h2>
              <p className="text-muted-foreground">
                Complete the interview to receive detailed feedback on your performance.
              </p>
            </div>
            <Button asChild>
              <Link href={`/interview/session/${sessionId}`}>
                <Target className="size-5" />
                <span>Take Interview</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
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

  const scoreVariant = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  const scoreTone = (score: number) => {
    if (score >= 80) return 'text-success'
    if (score >= 60) return 'text-warning'
    return 'text-error'
  }

  const scoreMessage =
    feedback.totalScore >= 80
      ? 'Outstanding performance. You demonstrated clear reasoning and confident communication.'
      : feedback.totalScore >= 60
        ? 'Solid progress with room to improve. Keep tightening structure and clarity.'
        : 'There is clear room for growth. Focus on the improvement areas below and iterate.'

  return (
    <Container size="xl" className="animate-fadeIn space-y-7 p-6">
      <Card variant="gradient" className="animate-slideInLeft">
        <CardContent className="space-y-4 pt-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Badge variant="success" className="w-fit">
                <Sparkles className="size-3" />
                Interview Completed
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold sm:text-4xl">Performance Report</h1>
                <p className="text-muted-foreground text-sm">
                  Interview ID: <span className="font-mono">{feedback.interviewId}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <Badge variant="secondary" className="w-fit">
                <Calendar className="size-3.5" />
                {formatDate(feedback.createdAt)}
              </Badge>
              <Link
                href="/dashboard"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium"
              >
                <Home className="size-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slideInLeft">
        <CardContent className="pt-7">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="border-border/65 bg-surface-2/70 mx-auto flex size-48 flex-col items-center justify-center rounded-full border">
              <div className={`text-6xl font-semibold ${scoreTone(feedback.totalScore)}`}>
                {feedback.totalScore}
              </div>
              <div className="text-muted-foreground text-lg">/100</div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className={`size-6 ${scoreTone(feedback.totalScore)}`} />
                  <h2 className="text-2xl font-semibold">Overall Performance</h2>
                </div>
                <p className="text-muted-foreground">{scoreMessage}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score Distribution</span>
                  <span className={`font-semibold ${scoreTone(feedback.totalScore)}`}>
                    {feedback.totalScore}%
                  </span>
                </div>
                <Progress value={feedback.totalScore} variant={scoreVariant(feedback.totalScore)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Target className="text-primary size-6" />
          Performance Breakdown
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.isArray(feedback.categoryScoresArray) &&
            feedback.categoryScoresArray.map((category: CategoryItem) => (
              <Card key={category.name}>
                <CardContent className="space-y-4 pt-7">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <span className={`text-2xl font-semibold ${scoreTone(category.score)}`}>
                      {category.score}%
                    </span>
                  </div>
                  <Progress value={category.score} variant={scoreVariant(category.score)} />
                  <p className="text-muted-foreground text-sm leading-relaxed">{category.comment}</p>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-gradient-to-br from-success/8 to-transparent">
          <CardContent className="space-y-5 pt-7">
            <div className="flex items-center gap-3">
              <div className="bg-success/15 border-success/30 flex size-12 items-center justify-center rounded-xl border">
                <TrendingUp className="text-success size-6" />
              </div>
              <h3 className="text-xl font-semibold">Key Strengths</h3>
            </div>
            <ul className="space-y-3">
              {Array.isArray(feedback.strengths) &&
                feedback.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" />
                    <span className="text-muted-foreground text-sm leading-relaxed">{strength}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-transparent">
          <CardContent className="space-y-5 pt-7">
            <div className="flex items-center gap-3">
              <div className="bg-warning/20 border-warning/35 flex size-12 items-center justify-center rounded-xl border">
                <TrendingDown className="text-warning size-6" />
              </div>
              <h3 className="text-xl font-semibold">Areas for Improvement</h3>
            </div>
            <ul className="space-y-3">
              {Array.isArray(feedback.areasForImprovement) &&
                feedback.areasForImprovement.map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <AlertCircle className="text-warning mt-0.5 size-5 shrink-0" />
                    <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-6 pt-7">
          <div className="flex items-start gap-4">
            <div className="bg-primary/15 border-primary/30 flex size-12 shrink-0 items-center justify-center rounded-xl border">
              <Sparkles className="text-primary size-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Final Assessment</h3>
              <p className="text-muted-foreground leading-relaxed">{feedback.finalAssessment}</p>
            </div>
          </div>

          <div className="border-border/65 flex flex-col gap-4 border-t pt-6 sm:flex-row">
            <Button asChild variant="secondary" className="flex-1">
              <Link href="/dashboard">
                <Home className="size-5" />
                <span>Return to Dashboard</span>
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/explore">
                <Target className="size-5" />
                <span>Practice More</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}

export default Page
