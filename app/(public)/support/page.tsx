import type { Metadata } from "next";
import Link from "next/link";
import {
  Mic,
  RefreshCw,
  Wifi,
  LayoutDashboard,
  Mail,
  Twitter,
  MessageCircle,
  ArrowRight,
  LifeBuoy,
} from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Button } from "@/components/atoms/button";

export const metadata: Metadata = {
  title: "Support · IntervoxAI",
  description: "Get help using IntervoxAI.",
};

const quickFixes = [
  {
    icon: Mic,
    title: "Microphone not working",
    fix: "Open browser settings → Site permissions → allow microphone for this site, then reload.",
  },
  {
    icon: Wifi,
    title: "Session drops or stalls",
    fix: "Check your network connection. A stable broadband or Wi-Fi connection is required for live voice interviews.",
  },
  {
    icon: RefreshCw,
    title: "Feedback not generating",
    fix: "Return to the dashboard and re-open the session. Feedback generation is async and may take up to 60 seconds.",
  },
  {
    icon: LayoutDashboard,
    title: "Can't see past sessions",
    fix: "Ensure you're signed in to the same account. Sessions are tied to your Firebase user ID.",
  },
];

const contactChannels = [
  {
    icon: Mail,
    label: "Email",
    value: "support@intervoxai.com",
    href: "mailto:support@intervoxai.com",
    sub: "Response within 2 business days",
  },
  {
    icon: Twitter,
    label: "Twitter / X",
    value: "@intervoxai",
    href: "https://twitter.com/intervoxai",
    sub: "DMs open",
  },
  {
    icon: MessageCircle,
    label: "GitHub Discussions",
    value: "github.com/intervoxai",
    href: "https://github.com/intervoxai",
    sub: "Bug reports & feature requests",
  },
];

export default function SupportPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Support"
            title="We're here to help"
            description="Try these quick fixes first, then contact us if issues persist."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <h2 className="font-semibold">Quick troubleshooting</h2>
              {quickFixes.map((fix, i) => {
                const Icon = fix.icon;
                return (
                  <div
                    key={fix.title}
                    className={`animate-fade-up fill-both flex items-start gap-4 rounded-2xl border border-border bg-card p-5 delay-${(i + 1) * 75}`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="size-4 text-primary" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{fix.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {fix.fix}
                      </p>
                    </div>
                  </div>
                );
              })}

              <Button asChild variant="gradient" className="mt-2">
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="font-semibold">Contact support</h2>

              <div className="rounded-2xl border border-border bg-surface-2/60 p-5 text-sm text-muted-foreground leading-relaxed">
                <p className="flex items-center gap-2 font-semibold text-foreground mb-2">
                  <LifeBuoy className="size-4 text-primary" />
                  Help us help you
                </p>
                When reaching out, please include your{" "}
                <strong className="text-foreground">session ID</strong> (found
                in the feedback page URL), your{" "}
                <strong className="text-foreground">browser</strong>, and a
                one-sentence description of what went wrong.
              </div>

              <div className="space-y-3">
                {contactChannels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <a
                      key={ch.label}
                      href={ch.href}
                      target={ch.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border transition-colors group-hover:bg-primary/10 group-hover:ring-primary/20">
                        <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{ch.value}</p>
                        <p className="text-xs text-muted-foreground">
                          {ch.sub}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
