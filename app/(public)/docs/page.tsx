import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  MessageSquare,
  FileText,
  Zap,
  Upload,
  Star,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Button } from "@/components/atoms/button";

export const metadata: Metadata = {
  title: "Documentation - IntervoxAI",
  description: "IntervoxAI product and usage documentation.",
  robots: {
    index: false,
    follow: false,
  },
};

const sections = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description:
      "Create your account, explore templates, and run your first interview in under 5 minutes.",
    color: "primary",
    href: "/sign-up",
  },
  {
    icon: MessageSquare,
    title: "Live Interviews",
    description:
      "How the voice interview engine works - microphone setup, AI turn-taking, and ending a session.",
    color: "secondary",
    href: "/explore",
  },
  {
    icon: FileText,
    title: "Feedback Reports",
    description:
      "Understanding your five-dimension score, hiring recommendation, and behavioural insights.",
    color: "accent",
    href: "/dashboard",
  },
  {
    icon: Zap,
    title: "Templates",
    description:
      "Browsing the template library, creating from a job description, and customising prompts.",
    color: "primary",
    href: "/explore",
  },
  {
    icon: Upload,
    title: "Resume Upload",
    description:
      "How your resume is parsed, encrypted, and used to personalise interview context.",
    color: "secondary",
    href: "/create",
  },
  {
    icon: Star,
    title: "Progress Tracking",
    description:
      "Reading session cards, comparing runs, and tracking improvement across categories.",
    color: "accent",
    href: "/dashboard",
  },
];

const iconColorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  secondary: "bg-secondary/10 text-secondary ring-secondary/20",
  accent: "bg-accent/10 text-accent ring-accent/20",
};

export default function DocsPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Documentation"
            title="Learn how to use IntervoxAI"
            description="Guides and references for getting the most out of your interview practice."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="mb-10 flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/6 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
              <Terminal className="size-4 text-primary" />
            </span>
            <div>
              <p className="font-semibold text-sm">Documentation in progress</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The app itself is the best guide for now. Core flow:{" "}
                <span className="text-foreground font-medium">
                  Explore templates -&gt; run interview -&gt; review feedback
                </span>
                . Full docs coming soon.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((sec, i) => {
              const Icon = sec.icon;
              const colorClass = iconColorMap[sec.color];
              return (
                <Link
                  key={sec.title}
                  href={sec.href}
                  className={`animate-fade-up fill-both group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] delay-${(i % 3) * 75 + 75}`}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "var(--gradient-brand-subtle)" }}
                  />
                  <div className="relative flex items-start gap-4">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${colorClass} transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="font-semibold leading-snug">
                        {sec.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {sec.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="absolute right-5 top-5 size-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="gradient">
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
