import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Briefcase, Sparkles, Target, ShieldCheck, Clock3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getTemplateById } from '@/lib/actions/interview.action'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Card, CardContent } from '@/components/atoms/card'
import { Container } from '@/components/layout/Container'
import CompanyLogo from '@/components/molecules/CompanyLogo'
import DisplayTechIcons from '@/components/molecules/DisplayTechIcons'
import StartSessionButton from '@/components/organisms/StartSessionButton'

const TemplatePage = async ({ params }: { params: Promise<{ templateId: string }> }) => {
  const { templateId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const template = await getTemplateById(templateId, user.id)

  if (!template) {
    return (
      <Container size="md" className="animate-fadeIn">
        <Card variant="gradient" className="py-12 text-center">
          <CardContent className="space-y-4">
            <h1 className="text-2xl font-semibold">Template Not Found</h1>
            <Link href="/dashboard">
              <Button>Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </Container>
    )
  }

  return (
    <Container size="xl" className="animate-fadeIn space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </div>

      <Card variant="gradient" className="animate-slideInLeft">
        <CardContent className="space-y-6 pt-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-surface-2/75 border-border/70 flex size-20 items-center justify-center overflow-hidden rounded-2xl border">
                <CompanyLogo
                  companyName={template.companyName || 'Unknown Company'}
                  logoUrl={template.companyLogoUrl}
                  size={72}
                  className="rounded-xl object-cover"
                />
              </div>

              <div className="space-y-3">
                <Badge variant="info" className="w-fit">
                  <Sparkles className="size-3.5" />
                  Ready to Practice
                </Badge>
                <div>
                  <h1 className="text-2xl font-semibold sm:text-3xl">{template.role} Interview</h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    {template.companyName || 'IntervoxAI'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">
                    <Briefcase className="size-3.5" />
                    {template.level}
                  </Badge>
                  <Badge variant="primary" className="capitalize">
                    <Target className="size-3.5" />
                    {template.type}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs">
              <StartSessionButton templateId={template.id} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoPill
              icon={<ShieldCheck className="text-success size-4" />}
              text="Personalized AI interviewer context"
            />
            <InfoPill
              icon={<Sparkles className="text-primary size-4" />}
              text="Role and stack-aware questioning"
            />
            <InfoPill
              icon={<Clock3 className="text-info size-4" />}
              text="Feedback generated right after session"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-3 pt-7">
            <h2 className="text-xl font-semibold">Job Description</h2>
            <div className="custom-scrollbar max-h-[28rem] overflow-y-auto pr-2">
              <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {template.jobDescription}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-7">
            <h2 className="text-xl font-semibold">Tech Stack Focus</h2>
            <DisplayTechIcons techStack={template.techStack || []} />
            <p className="text-muted-foreground text-sm">
              Expect follow-up questions around these technologies during the interview.
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="border-border/65 bg-surface-1/75 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm">
      {icon}
      <span>{text}</span>
    </div>
  )
}

export default TemplatePage
