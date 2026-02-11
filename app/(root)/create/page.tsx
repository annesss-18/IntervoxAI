import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles, Wand2, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Container, PageHeader } from "@/components/layout/Container";
import { Card, CardContent } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { CreateInterviewForm } from "@/components/organisms/CreateInterviewForm";

export const metadata: Metadata = {
  title: "Create Interview",
  description:
    "Create a new custom interview template tailored to your target role and company.",
};

export default async function CreatePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <Container size="xl">
      <PageHeader
        title="Create New Interview"
        description="Paste a role description or job post and let IntervoxAI generate a polished interview template."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <Card variant="gradient" className="hidden lg:block">
          <CardContent className="space-y-5 pt-7">
            <Badge variant="info" className="w-fit">
              <Sparkles className="size-3.5" />
              Template Studio
            </Badge>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">
                Build role-specific interview flows
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The generated template includes role context, likely technical
                depth, suggested interview type, and stack-aware questioning
                seeds.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  icon: Wand2,
                  text: "Auto extract role and level from JD input",
                },
                { icon: Sparkles, text: "Generate focused tech stack context" },
                {
                  icon: ShieldCheck,
                  text: "Choose public or private visibility mode",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="border-border/65 bg-surface-1/75 flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                  >
                    <Icon className="text-primary size-4" />
                    <span className="text-sm">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <CreateInterviewForm userId={user.id} />
      </div>
    </Container>
  );
}
