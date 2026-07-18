import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Database, Eye, Server, Mail } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Privacy Policy",
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
    body: "Session transcripts, scores, and encrypted resume text are stored in Firebase Firestore for your account. Resume text is encrypted with AES-256-GCM before storage. You can delete individual sessions or your account from the product; deletion is also propagated to the associated application records.",
  },
  {
    icon: Eye,
    title: "AI and service providers",
    body: "We do not sell personal data. To operate the service, account and interview data may be processed by Firebase/Google, including Gemini for template generation, live audio interviews, and feedback. We also use Upstash QStash for background-job delivery, Resend for optional feedback emails, Vercel Analytics for aggregate usage analytics, and—only when enabled—Jina Reader to retrieve a job-posting URL. These providers process data under their own service terms and privacy notices.",
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
                  className={`animate-fade-up fill-both flex items-start gap-5 rounded-2xl border border-border bg-card p-6 ${["delay-75", "delay-150", "delay-225", "delay-300", "delay-400"][i]}`}
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
            Last updated: July 2026.{" "}
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
