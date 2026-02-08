import Link from 'next/link'
import {
  ArrowRight,
  Mic,
  Brain,
  BarChart3,
  Target,
  Sparkles,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/atoms/button'

const features = [
  {
    icon: Mic,
    title: 'Voice-Powered Practice',
    description: 'Speak naturally with our AI interviewer.',
  },
  {
    icon: Brain,
    title: 'AI-Driven Feedback',
    description: 'Receive instant, detailed feedback on your answers.',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Monitor your improvement over time.',
  },
  {
    icon: Target,
    title: 'Role-Specific Questions',
    description: 'Practice with questions tailored to your target role.',
  },
  {
    icon: MessageSquare,
    title: 'Real Conversations',
    description: 'Dynamic AI that adapts to your responses.',
  },
  {
    icon: Zap,
    title: 'Instant Analysis',
    description: 'Get immediate insights on your performance.',
  },
]

const howItWorks = [
  {
    step: '01',
    title: 'Create Interview',
    description: 'Pick your target role and focus areas.',
  },
  {
    step: '02',
    title: 'Practice Speaking',
    description: 'Engage in voice conversations with AI.',
  },
  {
    step: '03',
    title: 'Review & Improve',
    description: 'Get structured feedback and track progress.',
  },
]

const stats = [
  { value: '16K+', label: 'Sessions' },
  { value: '90%', label: 'Improve' },
  { value: '4.6', label: 'Rating' },
]

export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="border-b border-border py-24 sm:py-32">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-6 text-4xl font-medium tracking-tight sm:text-5xl">
              <span className="font-serif italic">Master Your Interview</span>
              <br />
              <span className="font-serif italic text-primary">With AI Coaching</span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground">
              Practice technical interviews with an AI that listens, responds, and provides
              structured feedback.
            </p>

            <div className="mb-12 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button variant="outline" size="lg">
                  View Templates
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl font-semibold text-foreground">{stat.value}</div>
                  <div>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="container-app">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
              Features
            </p>
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
              <span className="font-serif italic">Everything you need</span>
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="text-center">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-border">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-border bg-muted/30 py-24 sm:py-32">
        <div className="container-app">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
              Process
            </p>
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
              <span className="font-serif italic">How it works</span>
            </h2>
          </div>

          <div className="mx-auto grid max-w-3xl gap-12 md:grid-cols-3">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mb-4 text-4xl font-light text-primary/30">{item.step}</div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32">
        <div className="container-app">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="mb-6 text-3xl font-medium tracking-tight sm:text-4xl">
              <span className="font-serif italic">Ready to start?</span>
            </h2>
            <p className="mb-8 text-muted-foreground">
              Join thousands who improved their interview skills.
            </p>
            <Link href="/sign-up">
              <Button size="lg">
                <Sparkles className="size-4" />
                Start Practicing Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
