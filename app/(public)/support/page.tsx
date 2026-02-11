import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, CheckCircle } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Card, CardContent } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help using IntervoxAI.",
};

const quickFixes = [
  {
    icon: CheckCircle,
    text: "Confirm browser microphone permissions are enabled",
  },
  { icon: CheckCircle, text: "Retry from dashboard if a session stalls" },
  { icon: CheckCircle, text: "Verify network stability during live interview" },
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
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Quick Fixes */}
            <Card variant="interactive">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">
                  Quick troubleshooting
                </h2>
                <ul className="space-y-3">
                  {quickFixes.map((fix) => {
                    const Icon = fix.icon;
                    return (
                      <li key={fix.text} className="flex items-start gap-3">
                        <Icon className="mt-0.5 size-4 shrink-0 text-success" />
                        <span className="text-sm">{fix.text}</span>
                      </li>
                    );
                  })}
                </ul>
                <Button asChild className="mt-6">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Contact support</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  When reaching out, please include your session ID, browser
                  version, and a brief description of where the flow failed.
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:support@intervoxai.com"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-surface-2"
                  >
                    <Mail className="size-4 text-muted-foreground" />
                    support@intervoxai.com
                  </a>
                  <a
                    href="https://twitter.com/intervoxai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-surface-2"
                  >
                    <MessageCircle className="size-4 text-muted-foreground" />
                    @intervoxai on Twitter
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
