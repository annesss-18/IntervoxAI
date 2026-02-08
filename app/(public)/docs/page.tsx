import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, MessageSquare, FileText, Zap } from 'lucide-react'
import { Container, PageHeader, Section } from '@/components/layout/Container'
import { Card, CardContent } from '@/components/atoms/card'
import { Button } from '@/components/atoms/button'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'IntervoxAI product and usage documentation.',
}

const sections = [
  { icon: BookOpen, title: 'Getting Started', description: 'Set up your first interview session in minutes' },
  { icon: MessageSquare, title: 'Live Interview', description: 'How to navigate voice and text interview flows' },
  { icon: FileText, title: 'Feedback Reports', description: 'Understanding your performance insights' },
  { icon: Zap, title: 'Templates', description: 'Creating and customizing interview templates' },
]

export default function DocsPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Documentation"
            title="Learn how to use IntervoxAI"
            description="Guides.and references for getting the most out of your interview practice."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Documentation in progress.</strong> Use the app directly while we expand our guides. The core flow is: explore templates → run interviews → review feedback.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <Card key={section.title} variant="interactive" className="group">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild>
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
