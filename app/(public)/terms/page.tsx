import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Scroll,
  ShieldCheck,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Terms of Service · IntervoxAI",
  description: "Terms for using IntervoxAI.",
};

const terms = [
  {
    icon: Scroll,
    title: "Service scope",
    body: "IntervoxAI provides AI-assisted mock interview practice and performance feedback. The platform is intended for personal preparation and skill development, not for commercial redistribution.",
  },
  {
    icon: ShieldCheck,
    title: "User responsibility",
    body: "You are responsible for all content submitted to the platform, including resume data and interview responses. Do not submit sensitive personal data belonging to third parties.",
  },
  {
    icon: RefreshCcw,
    title: "Platform evolution",
    body: "Features and pricing may change as the service matures from early access to stable commercial tiers. We will communicate significant changes with reasonable notice.",
  },
  {
    icon: AlertTriangle,
    title: "Limitation of liability",
    body: "IntervoxAI is provided as-is for preparation purposes. We make no guarantees about interview outcomes. The platform is not a substitute for professional career coaching.",
  },
];

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
          <div className="mb-10 flex items-start gap-4 rounded-2xl border border-info/25 bg-info/8 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info/15 ring-1 ring-info/25">
              <FileText className="size-4 text-info" />
            </span>
            <div>
              <p className="font-semibold text-sm">Early-access terms</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Full legal terms for the commercial launch are in preparation.
                These points summarise your rights and responsibilities today.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {terms.map((term, i) => {
              const Icon = term.icon;
              return (
                <div
                  key={term.title}
                  className={`animate-fade-up fill-both flex items-start gap-5 rounded-2xl border border-border bg-card p-6 delay-${(i + 1) * 75}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                    <Icon className="size-4.5 text-accent" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{term.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {term.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Last updated: early-access period.{" "}
            <Link
              href="/privacy"
              className="text-primary hover:underline underline-offset-4"
            >
              View Privacy Policy
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
