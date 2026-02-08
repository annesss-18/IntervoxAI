import { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle, Activity, CheckCircle2, Award, LayoutTemplate } from 'lucide-react'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getUserSessions, getUserTemplates } from '@/lib/actions/interview.action'
import { Container, PageHeader } from '@/components/layout/Container'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
import { Badge } from '@/components/atoms/badge'
import { SessionCard } from '@/components/organisms/SessionCard'
import { TemplateCard } from '@/components/organisms/TemplateCard'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your mock interviews, track progress, and create new interview templates.',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [sessions, templates] = await Promise.all([
    getUserSessions(user.id),
    getUserTemplates(user.id),
  ])

  const activeSessions = sessions.filter((session) => session.status !== 'completed')
  const completedSessions = sessions.filter((session) => session.status === 'completed')
  const completedWithScores = completedSessions.filter((session) => typeof session.finalScore === 'number')
  const averageScore =
    completedWithScores.length > 0
      ? Math.round(
          completedWithScores.reduce((total, session) => total + (session.finalScore || 0), 0) /
            completedWithScores.length
        )
      : 0

  return (
    <Container>
      <PageHeader
        title="Your Dashboard"
        description="Track active practice, review completed sessions, and launch your next interview set."
      >
        <Link href="/create">
          <Button>
            <PlusCircle className="size-4" />
            New Interview
          </Button>
        </Link>
      </PageHeader>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Sessions"
          value={String(activeSessions.length)}
          icon={<Activity className="text-primary size-5" />}
          tone="primary"
        />
        <MetricCard
          label="Completed"
          value={String(completedSessions.length)}
          icon={<CheckCircle2 className="text-success size-5" />}
          tone="success"
        />
        <MetricCard
          label="Average Score"
          value={averageScore > 0 ? `${averageScore}%` : 'N/A'}
          icon={<Award className="text-info size-5" />}
          tone="info"
        />
        <MetricCard
          label="Templates"
          value={String(templates.length)}
          icon={<LayoutTemplate className="text-accent-foreground size-5" />}
          tone="accent"
        />
      </section>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active">Practice ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="history">History ({completedSessions.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeSessions.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {activeSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active interviews"
              description="Start a new interview session and your active practice will appear here."
              action={
                <Link href="/create">
                  <Button>
                    <PlusCircle className="size-4" />
                    New Interview
                  </Button>
                </Link>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          {completedSessions.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {completedSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No completed interviews"
              description="Complete one interview to unlock full feedback history and score trends."
            />
          )}
        </TabsContent>

        <TabsContent value="templates">
          {templates.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No templates yet"
              description="Create your first role-specific template to run tailored interview sessions."
              action={
                <Link href="/create">
                  <Button>
                    <PlusCircle className="size-4" />
                    Create Template
                  </Button>
                </Link>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </Container>
  )
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: ReactNode
  tone: 'primary' | 'success' | 'info' | 'accent'
}) {
  const toneClass =
    tone === 'success'
      ? 'from-success/14 to-transparent'
      : tone === 'info'
        ? 'from-info/14 to-transparent'
        : tone === 'accent'
          ? 'from-accent/12 to-transparent'
          : 'from-primary/12 to-transparent'

  return (
    <Card className={`bg-gradient-to-br ${toneClass}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
          <div className="border-border/65 bg-surface-1/80 rounded-xl border p-2.5">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card variant="gradient" className="py-10 text-center">
      <CardContent className="space-y-5">
        <Badge variant="secondary" className="mx-auto w-fit">
          <LayoutTemplate className="size-3.5" />
          Workspace Empty
        </Badge>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground mx-auto max-w-lg">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
