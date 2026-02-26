import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  BarChart3,
  MessageSquare,
  Target,
  Mic,
  Lock,
} from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

export const metadata: Metadata = {
  title: "Pricing · IntervoxAI",
  description: "IntervoxAI pricing and plan information.",
};

const freeTier = [
  { icon: Mic, label: "Unlimited voice interview sessions" },
  { icon: MessageSquare, label: "AI-driven real-time feedback" },
  { icon: Target, label: "Role-specific question templates" },
  { icon: BarChart3, label: "Session history & progress tracking" },
  { icon: Sparkles, label: "Resume-aware interview context" },
];

const proTier = [
  "Everything in Early Access",
  "Advanced analytics & trend charts",
  "Custom interview libraries",
  "Team & recruiter mode",
  "Priority support & SLA",
  "API access",
];

export default function PricingPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Pricing"
            title="Simple, transparent pricing"
            description="Full access while we're in early access. Upgrade when paid plans launch."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            <div className="gradient-border animate-fade-up relative overflow-hidden rounded-2xl bg-card p-8">
              <div
                className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-60 rounded-full opacity-20 blur-[60px]"
                style={{ background: "var(--gradient-brand)" }}
              />

              <div className="relative space-y-6">
                <div>
                  <Badge variant="primary" className="mb-4">
                    Current Plan
                  </Badge>
                  <h2 className="text-2xl font-semibold">Early Access</h2>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-mono text-5xl font-bold text-foreground">
                      $0
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Full access while we collect feedback and finalise paid
                    plans.
                  </p>
                </div>

                <ul className="space-y-3">
                  {freeTier.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20">
                        <Icon className="size-3.5 text-success" />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" variant="gradient" className="w-full">
                  <Link href="/sign-up">
                    Start Practicing Free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="animate-fade-up delay-100 fill-both relative overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2/50 p-8 opacity-60">
              <div className="space-y-6">
                <div>
                  <Badge variant="secondary" className="mb-4">
                    Coming Soon
                  </Badge>
                  <h2 className="text-2xl font-semibold text-muted-foreground">
                    Pro
                  </h2>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-mono text-5xl font-bold text-muted-foreground">
                      $19
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Advanced features for serious preparation and career growth.
                  </p>
                </div>

                <ul className="space-y-3">
                  {proTier.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Check className="size-4 shrink-0 text-muted-foreground/50" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button variant="outline" size="lg" className="w-full" disabled>
                  <Lock className="size-4" />
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Questions about pricing or the roadmap?{" "}
              <Link
                href="/support"
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                Contact us
              </Link>
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
