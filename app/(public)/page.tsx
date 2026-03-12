import Link from "next/link";
import { BrandLogo } from "@/components/molecules/BrandLogo";
import {
  ArrowRight,
  Mic,
  Brain,
  BarChart3,
  Target,
  MessageSquare,
  Zap,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { SectionHeader } from "@/components/layout/Container";
const features = [
  {
    icon: Mic,
    title: "Voice-Powered Practice",
    description:
      "Speak naturally. Our AI listens, understands context, and responds like a real technical interviewer — no typing required.",
    color: "primary",
  },
  {
    icon: Brain,
    title: "AI-Driven Feedback",
    description:
      "Get instant, structured feedback on clarity, depth, and technical accuracy. Every answer scored across five key dimensions.",
    color: "accent",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Watch your scores improve session over session. Identify patterns and focus on what actually moves the needle.",
    color: "secondary",
  },
  {
    icon: Target,
    title: "Role-Specific Questions",
    description:
      "Paste a job description and get a tailored interview template in seconds — questions aligned to the exact role and stack.",
    color: "primary",
  },
  {
    icon: MessageSquare,
    title: "Real Conversations",
    description:
      "Dynamic AI that adapts to your answers. Follow-ups, clarifications, hints — it responds to what you actually say.",
    color: "secondary",
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    description:
      "Behavioral insights, hiring recommendation, and a coaching roadmap generated the moment you finish your session.",
    color: "accent",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Interview",
    description:
      "Paste a job description or pick from curated templates. IntervoxAI extracts the role, level, and tech stack automatically.",
  },
  {
    number: "02",
    title: "Practice Speaking",
    description:
      "Engage in a real-time voice conversation with your AI interviewer. Answer questions, ask clarifications, think out loud.",
  },
  {
    number: "03",
    title: "Review & Improve",
    description:
      "Get a structured performance report — scores, strengths, gaps, and a personalised learning path. Repeat until you're ready.",
  },
];

const stats = [
  { value: "16K+", label: "Sessions completed" },
  { value: "90%", label: "Of users improve" },
  { value: "4.6", label: "Average rating" },
];

const testimonials = [
  {
    quote:
      "The voice-first format makes it feel like a real interview. I got the job after just two weeks of practice.",
    author: "Priya M.",
    role: "Software Engineer · Google",
  },
  {
    quote:
      "The feedback is unusually specific — it references exactly what I said, not generic advice. That's what makes it useful.",
    author: "James T.",
    role: "Senior Dev · Stripe",
  },
  {
    quote:
      "I used to freeze under pressure. After 10 sessions I could articulate system design problems clearly and confidently.",
    author: "Linh N.",
    role: "Staff Engineer · Shopify",
  },
];

const iconColorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  secondary: "bg-secondary/10 text-secondary ring-secondary/20",
  accent: "bg-accent/10 text-accent ring-accent/20",
};
export default function LandingPage() {
  return (
    <div className="bg-background overflow-hidden">
      <section className="relative flex min-h-[90vh] items-center border-b border-border/50 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-32 right-0 h-[480px] w-[480px] rounded-full opacity-[0.12] blur-[100px]"
            style={{
              background: "radial-gradient(ellipse, #7050b0, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-20 -left-24 h-[400px] w-[400px] rounded-full opacity-[0.10] blur-[90px]"
            style={{
              background: "radial-gradient(ellipse, #48a8b8, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-[0.04] blur-[140px]"
            style={{
              background: "radial-gradient(ellipse, #c0607a, transparent 70%)",
            }}
          />
        </div>

        <div className="container-app w-full">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Powered by Gemini Live
            </div>

            <h1 className="animate-fade-up delay-100 fill-both mb-6 text-5xl font-normal leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="font-serif italic font-normal text-foreground">
                Master Your Interview
              </span>
              <br />
              <span className="font-serif italic font-normal text-gradient-brand">
                With AI Coaching
              </span>
            </h1>

            <p className="animate-fade-up delay-200 fill-both mx-auto mb-10 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Practice technical interviews with an AI that listens, responds,
              and delivers structured feedback — so you walk into every
              interview ready.
            </p>

            <div className="animate-fade-up delay-300 fill-both mb-16 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sign-up">
                <Button size="xl" variant="gradient" className="gap-2.5">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="xl" variant="outline" className="gap-2">
                  Browse Templates
                </Button>
              </Link>
            </div>

            <div className="animate-fade-up delay-400 fill-both flex flex-wrap items-center justify-center gap-8 sm:gap-14">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center gap-1 ${
                    i > 0 ? "sm:border-l sm:border-border/50 sm:pl-14" : ""
                  }`}
                >
                  <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 sm:py-32">
        <div className="container-app">
          <SectionHeader
            badge="Features"
            title="Everything you need"
            titleAccent="to land the role"
            description="Six interconnected capabilities that turn raw practice into measurable, hirable skill."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              const colorClass =
                iconColorMap[feat.color] ?? iconColorMap.primary;
              return (
                <div
                  key={feat.title}
                  className={`animate-fade-up fill-both group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-md)] delay-${[75, 150, 225][i % 3]}`}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "var(--gradient-brand-subtle)" }}
                  />

                  <div
                    className={`relative mb-4 inline-flex size-11 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 ${colorClass}`}
                  >
                    <Icon className="size-5" />
                  </div>

                  <h3 className="relative mb-2 font-semibold text-foreground">
                    {feat.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed text-muted-foreground">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-border/50 bg-surface-2/40 py-24 sm:py-32"
      >
        <div className="container-app">
          <SectionHeader
            badge="Process"
            title="How it works"
            description="Three steps from job description to interview-ready confidence."
          />

          <div className="relative mx-auto max-w-4xl">
            <div
              className="pointer-events-none absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] hidden h-px md:block"
              style={{
                background:
                  "linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 35%, transparent), color-mix(in srgb, var(--secondary) 35%, transparent), transparent)",
              }}
            />

            <div className="grid gap-10 md:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.number}
                  className={`animate-fade-up fill-both text-center delay-${(i + 1) * 100}`}
                >
                  <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full opacity-20 blur-xl"
                      style={{ background: "var(--gradient-brand)" }}
                    />
                    <div className="relative flex size-20 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-sm)]">
                      <span className="font-mono text-2xl font-bold text-gradient-brand">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="container-app">
          <SectionHeader
            badge="Testimonials"
            title="Real results from"
            titleAccent="real candidates"
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={t.author}
                className={`animate-fade-up fill-both rounded-2xl border border-border bg-card p-6 delay-${(i + 1) * 100}`}
              >
                <div className="mb-4 font-sans text-4xl font-bold leading-none text-gradient-brand select-none">
                  "
                </div>
                <p className="mb-6 text-sm leading-relaxed text-foreground/90">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 border-t border-border/50 pt-4">
                  <div className="flex size-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                    {t.author[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="container-app">
          <div className="gradient-border relative overflow-hidden rounded-3xl p-px">
            <div className="relative overflow-hidden rounded-3xl bg-card px-10 py-16 text-center sm:px-16 sm:py-20">
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div
                  className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-15 blur-[80px]"
                  style={{
                    background:
                      "radial-gradient(ellipse, #7050b0, transparent 70%)",
                  }}
                />
                <div
                  className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-15 blur-[80px]"
                  style={{
                    background:
                      "radial-gradient(ellipse, #48a8b8, transparent 70%)",
                  }}
                />
              </div>

              <div className="mx-auto mb-6">
                <BrandLogo size="lg" />
              </div>

              <h2 className="mb-4 font-serif italic font-normal text-3xl text-foreground sm:text-4xl">
                Ready to start?
              </h2>
              <p className="mx-auto mb-10 max-w-md text-muted-foreground leading-relaxed">
                Join thousands of engineers who've used IntervoxAI to prepare,
                practice, and land their next role.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/sign-up">
                  <Button size="xl" variant="gradient">
                    <Sparkles className="size-4" />
                    Start Practicing Free
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button size="xl" variant="outline">
                    Explore Templates
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
                {[
                  "No credit card required",
                  "Free to start",
                  "Voice interviews included",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-success" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
