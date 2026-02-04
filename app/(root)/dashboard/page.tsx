import { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getUserSessions, getUserTemplates } from '@/lib/actions/interview.action'
import { Container, PageHeader } from '@/components/layout/Container'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
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

  const activeSessions = sessions.filter((s) => s.status !== 'completed')
  const completedSessions = sessions.filter((s) => s.status === 'completed')

  return (
    <Container>
      <PageHeader
        title="Your Dashboard"
        description="Manage your interviews and track your progress."
      >
        <Link href="/create">
          <Button>
            <PlusCircle className="size-4" />
            New Interview
          </Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active">Practice ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="history">History ({completedSessions.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        {/* Active Sessions */}
        <TabsContent value="active">
          {activeSessions.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active interviews"
              description="Start a new interview to begin practicing."
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

        {/* Completed Sessions */}
        <TabsContent value="history">
          {completedSessions.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {completedSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No completed interviews"
              description="Your completed interviews will appear here."
            />
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          {templates.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No custom templates"
              description="Create a custom interview template to practice specific roles."
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

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card variant="gradient" className="py-12 text-center">
      <CardContent>
        <div className="bg-surface-2 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
          <PlusCircle className="text-muted-foreground size-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mx-auto mb-6 max-w-md">{description}</p>
        {action}
      </CardContent>
    </Card>
  )
}
