import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Container, PageHeader, Section } from '@/components/layout/Container'
import { Card, CardContent } from '@/components/atoms/card'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'IntervoxAI pricing and plan information.',
}

const features = [
  'Unlimited practice sessions',
  'AI-powered feedback',
  'Voice and text interviews',
  'Progress tracking',
  'Role-specific templates',
]

export default function PricingPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Pricing"
            title="Simple, transparent pricing"
            description="Start practicing for free. Upgrade when you need more."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Free Plan */}
            <Card variant="interactive" className="relative overflow-hidden">
              <CardContent className="space-y-6 p-8">
                <div>
                  <Badge variant="success" className="mb-4">Current Plan</Badge>
                  <h2 className="text-2xl font-semibold">Early Access</h2>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>

                <p className="text-muted-foreground">
                  Full access to core features while we collect feedback and finalize paid plans.
                </p>

                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="size-4 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="w-full">
                  <Link href="/sign-up">
                    Start Practicing Free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan (Coming Soon) */}
            <Card className="relative overflow-hidden border-dashed opacity-75">
              <CardContent className="space-y-6 p-8">
                <div>
                  <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                  <h2 className="text-2xl font-semibold">Pro</h2>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$19</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>

                <p className="text-muted-foreground">
                  Advanced features for serious interview preparation and career growth.
                </p>

                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="size-4" />
                    Everything in Free
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="size-4" />
                    Detailed analytics & history
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="size-4" />
                    Custom interview libraries
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Check className="size-4" />
                    Priority support
                  </li>
                </ul>

                <Button variant="outline" size="lg" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  )
}
