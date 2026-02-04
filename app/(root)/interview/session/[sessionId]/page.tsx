// app/(root)/interview/session/[sessionId]/page.tsx
import { getInterviewsById } from '@/lib/actions/interview.action'
import { redirect } from 'next/navigation'
import type { RouteParams } from '@/types'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import { LiveInterviewAgent } from '@/components/organisms/LiveInterviewAgent'
import { getCurrentUser } from '@/lib/actions/auth.action'
import {
  Briefcase,
  Clock,
  Target,
  AlertCircle,
  Sparkles,
  Mic,
  Shield,
  MessageSquare,
  Award,
} from 'lucide-react'
import Link from 'next/link'

const Page = async ({ params }: RouteParams) => {
  const user = await getCurrentUser()
  const { sessionId } = await params

  if (!sessionId || typeof sessionId !== 'string') {
    redirect('/')
  }

  const interview = await getInterviewsById(sessionId, user?.id)

  if (!interview) {
    return (
      <div className="animate-fadeIn mx-auto max-w-4xl p-6">
        <div className="card-gradient">
          <div className="space-y-6 p-12 text-center">
            <div className="bg-error-500/20 border-error-400/30 mx-auto flex size-20 items-center justify-center rounded-full border-2">
              <AlertCircle className="text-error-400 size-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-foreground text-2xl font-bold">Interview Session Not Found</h2>
              <p className="text-muted-foreground">
                The interview session you&apos;re looking for doesn&apos;t exist or you don&apos;t
                have access to it.
              </p>
            </div>
            <Link href="/interview" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="size-5" />
              <span>Create New Interview</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!interview.questions || interview.questions.length === 0) {
    return (
      <div className="animate-fadeIn mx-auto max-w-4xl p-6">
        <div className="card-gradient">
          <div className="space-y-6 p-12 text-center">
            <div className="bg-warning-500/20 border-warning-400/30 mx-auto flex size-20 items-center justify-center rounded-full border-2">
              <AlertCircle className="text-warning-400 size-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-foreground text-2xl font-bold">Interview Data Incomplete</h2>
              <p className="text-muted-foreground">
                This interview session is missing required data. Please create a new interview.
              </p>
            </div>
            <Link href="/interview" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="size-5" />
              <span>Create New Interview</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const guidelines = [
    { icon: Mic, text: 'Quiet environment, mic enabled' },
    { icon: MessageSquare, text: 'Speak clearly, take your time' },
    { icon: Shield, text: 'AI asks follow-up questions' },
    { icon: Award, text: 'Get detailed feedback after' },
  ]

  return (
    <div className="animate-fadeIn mx-auto flex h-[calc(100vh-4rem)] max-w-[1600px] flex-col p-4 md:p-6 lg:p-8">
      {/* Single unified interactive container */}
      <div className="grid h-full min-h-0 flex-1 gap-6 lg:grid-cols-[350px_1fr]">
        {/* Left Column: Interview Info (Collapsible sidebar concept) */}
        <div className="bg-card border-border flex h-full flex-col overflow-hidden rounded-2xl border shadow-md">
          <div className="border-border/50 flex flex-col border-b p-6">
            {/* Header */}
            <div className="mb-6 flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="from-primary/40 to-accent/40 absolute inset-0 rounded-xl bg-gradient-to-r opacity-60 blur-xl" />
                <CompanyLogo
                  companyName={interview.companyName || 'Unknown Company'}
                  size={48}
                  className="ring-primary/30 relative size-12 rounded-xl ring-2"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="bg-primary/20 border-primary/30 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                    <Sparkles className="size-2.5" />
                    Live
                  </span>
                </div>
                <h1 className="text-foreground truncate text-lg leading-tight font-bold">
                  {interview.role}
                </h1>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mb-6 grid grid-cols-2 gap-2">
              <div className="bg-secondary/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                <Briefcase className="text-primary size-3.5" />
                <span className="text-foreground truncate capitalize">{interview.level}</span>
              </div>
              <div className="bg-secondary/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                <Target className="text-accent-foreground size-3.5" />
                <span className="text-foreground truncate capitalize">{interview.type}</span>
              </div>
            </div>

            {interview.techstack && interview.techstack.length > 0 && (
              <div className="mb-6">
                <span className="text-muted-foreground mb-2 block text-xs font-medium tracking-wider uppercase">
                  Stack
                </span>
                <DisplayTechIcons techStack={interview.techstack} />
              </div>
            )}

            {/* Guidelines - Scrollable Area */}
            <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
              <h3 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
                <Shield className="text-primary size-4" />
                Quick Tips
              </h3>
              <div className="space-y-3">
                {guidelines.map((item, index) => (
                  <div
                    key={index}
                    className="bg-secondary/30 hover:border-border flex items-start gap-3 rounded-lg border border-transparent p-3 text-sm transition-colors"
                  >
                    <item.icon className="text-primary mt-0.5 size-4 shrink-0" />
                    <span className="text-muted-foreground leading-snug">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Agent Interface (Main Stage) */}
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl">
          <LiveInterviewAgent interview={interview} sessionId={sessionId} userId={user?.id || ''} />
        </div>
      </div>
    </div>
  )
}

export default Page
