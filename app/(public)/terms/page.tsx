import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { Container, PageHeader, Section } from '@/components/layout/Container'
import { Card, CardContent } from '@/components/atoms/card'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for using IntervoxAI.',
}

const terms = [
  {
    title: 'Service scope',
    text: 'IntervoxAI provides AI-assisted mock interview practice and performance feedback features.',
  },
  {
    title: 'User responsibility',
    text: 'Users are responsible for content submitted to the platform, including resumes and interview responses.',
  },
  {
    title: 'Platform evolution',
    text: 'Features and pricing may evolve as the service matures and we release stable commercial tiers.',
  },
]

export default function TermsPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Legal"
            title="Terms of Service"
            description="The rules and guidelines for using IntervoxAI."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container size="md">
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-info/20 bg-info/5 p-4">
            <FileText className="size-5 text-info" />
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">Early access terms.</strong> Updated terms for commercial launch coming soon.
            </span>
          </div>

          <div className="space-y-4">
            {terms.map((term, index) => (
              <Card key={term.title}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{term.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{term.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            This summary will be replaced with full legal terms in the next update.
          </p>
        </Container>
      </Section>
    </>
  )
}
