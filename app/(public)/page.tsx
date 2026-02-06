import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Mic, Brain, BarChart3, Target, Sparkles, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Badge } from '@/components/atoms/badge'
import { Card, CardContent } from '@/components/atoms/card'
import { Container, Section } from '@/components/layout/Container'

const features = [
  {
    icon: Mic,
    title: 'Voice-Powered Practice',
    description:
      'Speak naturally with our AI interviewer. Practice verbal communication just like in real interviews.',
  },
  {
    icon: Brain,
    title: 'AI-Driven Feedback',
    description:
      'Receive instant, detailed feedback on your answers, communication style, and technical accuracy.',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description:
      'Monitor your improvement over time with detailed analytics and performance insights.',
  },
  {
    icon: Target,
    title: 'Role-Specific Questions',
    description: 'Practice with questions tailored to your target role, company, and tech stack.',
  },
  {
    icon: Sparkles,
    title: 'Adaptive Difficulty',
    description:
      'The AI adjusts question difficulty based on your performance for optimal learning.',
  },
  {
    icon: Shield,
    title: 'Safe Practice Space',
    description: 'Make mistakes and learn without the pressure of a real interview environment.',
  },
]

const howItWorks = [
  {
    step: '01',
    title: 'Choose Your Role',
    description: "Select the job role, company type, and tech stack you're targeting.",
  },
  {
    step: '02',
    title: 'Practice & Speak',
    description: 'Have a realistic conversation with our AI interviewer using voice or text.',
  },
  {
    step: '03',
    title: 'Get Feedback',
    description: 'Receive detailed feedback and actionable tips to improve your performance.',
  },
]

const stats = [
  { value: '10K+', label: 'Practice Sessions' },
  { value: '85%', label: 'Success Rate' },
  { value: '4.9', label: 'User Rating' },
]

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <Section spacing="lg" className="relative overflow-hidden">
        <Container>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            {/* Badge */}
            <Badge variant="primary" className="animate-fadeInUp mb-6">
              <Sparkles className="size-3.5" />
              AI-Powered Mock Interviews
            </Badge>

            {/* Headline */}
            <h1 className="animate-fadeInUp animation-delay-100 mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Practice. <span className="text-gradient-primary">Speak.</span>{' '}
              <span className="text-gradient-cosmic">Improve.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-muted-foreground animate-fadeInUp animation-delay-200 mb-8 max-w-2xl text-lg sm:text-xl">
              Master your technical interviews with AI-powered mock interviews. Real interviews.
              Real feedback. Faster growth.
            </p>

            {/* CTAs */}
            <div className="animate-fadeInUp animation-delay-300 flex flex-col gap-4 sm:flex-row">
              <Link href="/explore">
                <Button size="lg" className="min-w-[200px]">
                  Explore Interviews
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="animate-fadeInUp animation-delay-500 mt-12 flex flex-col items-center gap-8 sm:flex-row">
              {/* User avatars */}
              <div className="flex items-center">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="border-background from-primary-400 to-accent-400 flex size-10 items-center justify-center rounded-full border-2 bg-gradient-to-br text-xs font-bold text-white"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-muted-foreground ml-4 text-sm">Join 10,000+ job seekers</span>
              </div>

              {/* Stats */}
              <div className="hidden items-center gap-8 sm:flex">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-foreground text-2xl font-bold">{stat.value}</div>
                    <div className="text-muted-foreground text-xs">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>

        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="bg-primary/10 animate-pulse-slow absolute top-1/4 -left-20 h-72 w-72 rounded-full blur-3xl" />
          <div className="bg-accent/10 animate-pulse-slow animation-delay-200 absolute top-1/3 -right-20 h-72 w-72 rounded-full blur-3xl" />
          <div className="bg-stellar/5 absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full blur-3xl" />
        </div>
      </Section>

      {/* How It Works Section */}
      <Section className="bg-surface-2/50">
        <Container>
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              How It Works
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Three Steps to Interview Success
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Our streamlined process helps you prepare effectively and build confidence.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {howItWorks.map((item) => (
              <Card
                key={item.step}
                variant="gradient"
                className="group relative h-full overflow-visible"
              >
                <CardContent className="flex h-full min-h-[220px] flex-col items-center px-6 pt-12 pb-8 text-center">
                  {/* Step number */}
                  <div className="from-primary to-accent absolute -top-5 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-lg">
                    {item.step}
                  </div>

                  <h3 className="mb-4 text-2xl font-bold">{item.title}</h3>
                  <p className="text-muted-foreground max-w-[34ch] leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* Features Section */}
      <Section>
        <Container>
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Everything You Need to <span className="text-gradient-primary">Succeed</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Comprehensive tools and features designed to give you the edge in your next interview.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} variant="interactive" className="group">
                  <CardContent className="pt-6">
                    <div className="from-primary/20 to-accent/20 mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110">
                      <Icon className="text-primary size-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section>
        <Container size="md">
          <Card variant="gradient" className="relative overflow-hidden">
            <CardContent className="relative z-10 px-8 py-12 text-center">
              {/* Logo */}
              <div className="bg-surface-1/50 mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl backdrop-blur">
                <Image src="/icon.png" alt="IntervoxAI" width={48} height={48} />
              </div>

              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                Ready to Ace Your Next Interview?
              </h2>
              <p className="text-muted-foreground mx-auto mb-8 max-w-md">
                Join thousands of successful candidates who practiced with IntervoxAI.
              </p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/sign-up">
                  <Button size="lg">
                    Start Practicing Free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="text-muted-foreground mt-8 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="size-4" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <span>Setup in 2 minutes</span>
                </div>
              </div>
            </CardContent>

            {/* Background glow */}
            <div className="from-primary/5 to-accent/5 absolute inset-0 -z-10 bg-gradient-to-br via-transparent" />
          </Card>
        </Container>
      </Section>
    </>
  )
}
