import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Database, Eye, Server, Mail } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Privacy Policy · IntervoxAI",
  description: "How IntervoxAI handles and protects user data.",
};

const items = [
  {
    icon: Database,
    title: "Authentication & account data",
    body: "IntervoxAI uses Firebase Authentication and stores essential account metadata — name, email, UID — in Firestore for product operation and personalisation.",
  },
  {
    icon: Lock,
    title: "Interview & resume content",
    body: "Session transcripts and scores are stored per-user in Firestore, accessible only to you. Resume text is always encrypted at rest using AES-256-GCM before storage. You may delete individual sessions at any time from your dashboard.",
  },
  {
    icon: Eye,
    title: "Data visibility",
    body: "Your data is never sold to or shared with third parties. AI inference is performed server-side via the Google Gemini API; your interview audio is not retained beyond a session. Session transcripts are stored for the lifetime of your account.",
  },
  {
    icon: Server,
    title: "Operational logging",
    body: "Minimal operational logs — request timing, error codes — are collected for reliability and debugging. These logs do not contain interview content.",
  },
  {
    icon: Mail,
    title: "Contact & deletion requests",
    body: "To request data deletion or access a copy of your data, contact support@intervoxai.com. We will respond within 14 business days.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Legal"
            title="Privacy Policy"
            description="How we collect, use, and protect your personal information."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container size="md">
          <div className="mb-10 flex items-start gap-4 rounded-2xl border border-success/25 bg-success/8 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15 ring-1 ring-success/25">
              <Shield className="size-4 text-success" />
            </span>
            <div>
              <p className="font-semibold text-sm">Your data is protected</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                We only collect what the product needs to function. No
                advertising. No data sales.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`animate-fade-up fill-both flex items-start gap-5 rounded-2xl border border-border bg-card p-6 delay-${(i + 1) * 75}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Icon className="size-4.5 text-primary" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Last updated: March 2026.{" "}
            <Link
              href="/terms"
              className="text-primary hover:underline underline-offset-4"
            >
              View Terms of Service
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
