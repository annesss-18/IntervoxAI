import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rss, Pen, Cpu, Users, Lightbulb } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

export const metadata: Metadata = {
  title: "Blog - IntervoxAI",
  description:
    "Interview preparation and career growth articles from IntervoxAI.",
  robots: {
    index: false,
    follow: false,
  },
};

const upcomingTopics = [
  {
    icon: Cpu,
    category: "System Design",
    title: "How to structure backend system design answers",
    description:
      "A repeatable framework for communicating architecture decisions under time pressure.",
  },
  {
    icon: Users,
    category: "Soft Skills",
    title: "Communicating tradeoffs under interview pressure",
    description:
      "How to think out loud clearly when the stakes are high and the clock is ticking.",
  },
  {
    icon: Lightbulb,
    category: "Strategy",
    title: "Building a high-impact interview prep routine",
    description:
      "What to practice, how often, and which signals actually predict interview success.",
  },
  {
    icon: Pen,
    category: "Coding",
    title: "Explaining your reasoning while solving LeetCode",
    description:
      "Interviewers score narration heavily - here's how to practise speaking while thinking.",
  },
];

export default function BlogPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Blog"
            title="Interview insights & guides"
            description="Tactical breakdowns and strategies for acing your technical interviews."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="mb-10 flex items-start gap-4 rounded-2xl border border-secondary/25 bg-secondary/8 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 ring-1 ring-secondary/25">
              <Rss className="size-4 text-secondary" />
            </span>
            <div>
              <p className="font-semibold text-sm">Coming soon</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                We&apos;re writing practical, example-driven guides focused on
                real interview scenarios. Articles dropping soon.
              </p>
            </div>
          </div>

          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming articles
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingTopics.map((topic, i) => {
              const Icon = topic.icon;
              return (
                <div
                  key={topic.title}
                  className={`animate-fade-up fill-both group relative overflow-hidden rounded-2xl border border-border bg-card p-6 delay-${(i + 1) * 75}`}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "var(--gradient-brand-subtle)" }}
                  />
                  <div className="relative flex items-start gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="size-4 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <Badge variant="outline" className="mb-2 text-[10px]">
                        {topic.category}
                      </Badge>
                      <h3 className="font-semibold leading-snug">
                        {topic.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {topic.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <Button asChild variant="gradient">
              <Link href="/explore">
                Explore Interview Templates
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
