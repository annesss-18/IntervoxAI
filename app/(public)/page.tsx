import Link from "next/link";
import {
  ArrowRight,
  Mic,
  Brain,
  BarChart3,
  Target,
  Sparkles,
  MessageSquare,
  Zap,
} from "lucide-react";
import { Button } from "@/components/atoms/button";

const features = [
  {
    icon: Mic,
    title: "Voice-Powered Practice",
    description: "Speak naturally with our AI interviewer.",
  },
  {
    icon: Brain,
    title: "AI-Driven Feedback",
    description: "Receive instant, detailed feedback on your answers.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Monitor your improvement over time.",
  },
  {
    icon: Target,
    title: "Role-Specific Questions",
    description: "Practice with questions tailored to your target role.",
  },
  {
    icon: MessageSquare,
    title: "Real Conversations",
    description: "Dynamic AI that adapts to your responses.",
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    description: "Get immediate insights on your performance.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Create Interview",
    description: "Pick your target role and focus areas.",
  },
  {
    step: "02",
    title: "Practice Speaking",
    description: "Engage in voice conversations with AI.",
  },
  {
    step: "03",
    title: "Review & Improve",
    description: "Get structured feedback and track progress.",
  },
];

const stats = [
  { value: "16K+", label: "Sessions" },
  { value: "90%", label: "Improve" },
  { value: "4.6", label: "Rating" },
];

export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative border-b border-border py-28 sm:py-36">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-6 text-4xl font-medium leading-[1.15] tracking-tight sm:text-5xl">
              <span className="font-serif italic">Master Your Interview</span>
              <br />
              <span className="animate-gradient bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text font-serif italic text-transparent">
                With AI Coaching
              </span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground">
              Practice technical interviews with an AI that listens, responds,
              and provides structured feedback.
            </p>

            <div className="relative mb-12 flex flex-wrap items-center justify-center gap-4">
              {/* Subtle glow behind CTAs */}
              <div className="pointer-events-none absolute -inset-x-12 -inset-y-8 rounded-3xl bg-primary/5 blur-2xl" />
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

            <div className="flex items-center justify-center gap-10 text-sm text-muted-foreground">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center ${i > 0 ? "border-l border-border/50 pl-10" : ""}`}
                >
                  <div className="text-xl font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </div>
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

          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`animate-staggerFadeIn surface-glass p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md delay-${(i % 3) * 100 + 100}`}
                  style={{ animationFillMode: "forwards" }}
                >
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-primary/20 bg-primary/5 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
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

          <div className="relative mx-auto grid max-w-3xl gap-12 md:grid-cols-3">
            {/* Connecting line (desktop only) */}
            <div className="pointer-events-none absolute top-8 left-[16.67%] right-[16.67%] hidden h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent md:block" />

            {howItWorks.map((item, i) => (
              <div
                key={item.step}
                className={`animate-fadeInUp opacity-0 text-center delay-${(i + 1) * 100}`}
                style={{ animationFillMode: "forwards" }}
              >
                <div className="relative mx-auto mb-4 flex size-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-lg" />
                  <span className="relative bg-gradient-to-br from-primary to-secondary bg-clip-text text-4xl font-light text-transparent">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32">
        <div className="container-app">
          <div className="texture-noise gradient-border mx-auto max-w-xl overflow-hidden rounded-2xl bg-gradient-to-br from-surface-1 to-surface-2 p-12 text-center sm:p-16">
            <h2 className="relative z-10 mb-6 text-3xl font-medium tracking-tight sm:text-4xl">
              <span className="font-serif italic">Ready to start?</span>
            </h2>
            <p className="relative z-10 mb-8 text-muted-foreground">
              Join thousands who improved their interview skills.
            </p>
            <Link href="/sign-up" className="relative z-10">
              <Button size="lg">
                <Sparkles className="size-4" />
                Start Practicing Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
