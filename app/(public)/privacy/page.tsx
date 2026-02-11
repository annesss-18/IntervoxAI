import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Card, CardContent } from "@/components/atoms/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How IntervoxAI handles and protects user data.",
};

const items = [
  {
    title: "Authentication and account data",
    text: "IntervoxAI uses Firebase Authentication and stores essential account metadata for product operation.",
  },
  {
    title: "Interview and resume content",
    text: "Interview/session data is stored in Firestore. Resume text may be encrypted at rest when encryption is configured.",
  },
  {
    title: "Operational logging",
    text: "Minimal operational logs may be collected for reliability and debugging purposes.",
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
            description="How we handle and protect your personal data."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container size="md">
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-secondary/20 bg-secondary/5 p-4">
            <Shield className="size-5 text-secondary" />
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">
                Your data is protected.
              </strong>{" "}
              We take privacy seriously.
            </span>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <Card key={item.title}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            This summary will be replaced with a full legal policy in the next
            update.
          </p>
        </Container>
      </Section>
    </>
  );
}
