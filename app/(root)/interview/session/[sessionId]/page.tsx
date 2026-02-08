import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Briefcase, Sparkles, Target, ShieldCheck } from 'lucide-react'
import { getInterviewsById } from '@/lib/actions/interview.action'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { LiveInterviewAgent } from '@/components/organisms/LiveInterviewAgent'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import { Container } from '@/components/layout/Container'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
import type { RouteParams } from '@/types'

const Page = async ({ params }: RouteParams) => {
  const user = await getCurrentUser()
  const { sessionId } = await params

  if (!user) {
    redirect('/sign-in')
  }

  if (!sessionId || typeof sessionId !== 'string') {
    redirect('/')
  }

  const interview = await getInterviewsById(sessionId, user.id)

  if (!interview) {
    return (
      <Container size="md" className="animate-fadeIn">
        <StateCard
          title="Interview Session Not Found"
          description="The interview session does not exist or you do not have access to it."
          actionHref="/create"
          actionLabel="Create New Interview"
        />
      </Container>
    )
  }

  if (!interview.questions || interview.questions.length === 0) {
    return (
      <Container size="md" className="animate-fadeIn">
        <StateCard
          title="Interview Data Incomplete"
          description="This interview session is missing required questions. Please create a new interview."
          actionHref="/create"
          actionLabel="Create New Interview"
        />
      </Container>
    )
  }

  return (
    <Container size="xl" className="animate-fadeIn space-y-4">
      <section className="section-shell surface-highlight texture-noise rounded-2xl px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-surface-1/80 border-border/70 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
              <CompanyLogo
                companyName={interview.companyName || 'Unknown Company'}
                logoUrl={interview.companyLogoUrl}
                size={56}
                className="rounded-lg object-cover"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Badge variant="primary" className="w-fit gap-1.5">
                <Sparkles className="size-3.5" />
                Live Session
              </Badge>
              <h1 className="text-foreground text-xl leading-tight font-bold break-words sm:text-2xl">
                {interview.role}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {interview.companyName || 'IntervoxAI'}
              </p>
              <p className="text-muted-foreground text-sm">
                Keep answers concise, structured, and technically defensible.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 capitalize">
                <Briefcase className="size-3.5" />
                {interview.level}
              </Badge>
              <Badge variant="secondary" className="gap-1.5 capitalize">
                <Target className="size-3.5" />
                {interview.type}
              </Badge>
            </div>

            {interview.techstack && interview.techstack.length > 0 && (
              <div className="flex items-center">
                <DisplayTechIcons techStack={interview.techstack} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HintPill text="Stay focused on one problem at a time" />
          <HintPill text="State assumptions before diving deep" />
          <HintPill text="Ask clarifying questions when needed" />
        </div>
      </section>

      <section className="min-h-[560px] lg:h-[calc(100vh-16rem)]">
        <LiveInterviewAgent interview={interview} sessionId={sessionId} />
      </section>
    </Container>
  )
}

function HintPill({ text }: { text: string }) {
  return (
    <div className="border-border/65 bg-surface-1/75 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm">
      <ShieldCheck className="text-success size-4" />
      <span>{text}</span>
    </div>
  )
}

function StateCard({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <Card variant="gradient" className="py-12">
      <CardContent className="space-y-6 text-center">
        <div className="bg-error/10 border-error/30 mx-auto flex size-16 items-center justify-center rounded-full border">
          <AlertCircle className="text-error size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-foreground text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground mx-auto max-w-lg">{description}</p>
        </div>

        <Link href={actionHref}>
          <Button>
            <Sparkles className="size-4" />
            {actionLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default Page
