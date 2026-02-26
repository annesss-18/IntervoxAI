import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Interview Template · IntervoxAI" };

import {
  ArrowLeft,
  Briefcase,
  Sparkles,
  Target,
  ShieldCheck,
  Clock3,
  FileText,
} from "lucide-react";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getTemplateById } from "@/lib/actions/interview.action";
import { Badge } from "@/components/atoms/badge";
import { Container } from "@/components/layout/Container";
import CompanyLogo from "@/components/molecules/CompanyLogo";
import DisplayTechIcons from "@/components/molecules/DisplayTechIcons";
import StartSessionButton from "@/components/organisms/StartSessionButton";

const TemplatePage = async ({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) => {
  const { templateId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const template = await getTemplateById(templateId, user.id);

  if (!template) {
    return (
      <Container size="md" className="animate-fade-up">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="relative flex flex-col items-center gap-4 px-8">
            <h1 className="text-xl font-semibold">Template Not Found</h1>
            <p className="text-sm text-muted-foreground">
              This template doesn't exist or was removed.
            </p>
            <Link
              href="/explore"
              className="text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Browse other templates
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl" className="animate-fade-up space-y-5">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Explore
      </Link>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-6">
        <div
          className="pointer-events-none absolute -top-16 right-8 h-40 w-64 rounded-full opacity-15 blur-[70px]"
          style={{ background: "var(--gradient-brand)" }}
        />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2">
              <CompanyLogo
                companyName={template.companyName || "Unknown Company"}
                logoUrl={template.companyLogoUrl}
                size={64}
                className="rounded-xl object-contain"
              />
            </div>

            <div className="space-y-2">
              <Badge variant="primary" dot>
                <Sparkles className="size-3" />
                Ready to Practice
              </Badge>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {template.role} Interview
              </h1>
              <p className="text-muted-foreground text-sm">
                {template.companyName || "IntervoxAI"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Briefcase className="size-3.5" />
                  {template.level}
                </Badge>
                <Badge variant="primary">
                  <Target className="size-3.5" />
                  {template.type}
                </Badge>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-64 xl:shrink-0">
            <StartSessionButton templateId={template.id} />
          </div>
        </div>

        <div className="relative mt-5 grid gap-2.5 sm:grid-cols-3">
          <InfoPill
            icon={<ShieldCheck className="size-4 text-success" />}
            text="Personalised AI interviewer context"
          />
          <InfoPill
            icon={<Sparkles className="size-4 text-primary" />}
            text="Role and stack-aware questioning"
          />
          <InfoPill
            icon={<Clock3 className="size-4 text-info" />}
            text="Feedback generated right after session"
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <FileText className="size-4 text-primary" />
            </span>
            <h2 className="font-semibold">Job Description</h2>
          </div>
          <div className="custom-scrollbar max-h-[26rem] overflow-y-auto pr-2">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {template.jobDescription}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Tech Stack Focus</h2>
          <DisplayTechIcons techStack={template.techStack || []} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Expect follow-up questions around these technologies during your
            session.
          </p>

          <div className="mt-2 rounded-xl border border-primary/20 bg-primary/6 p-4">
            <p className="text-sm font-semibold text-primary mb-1">Tip</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              State your assumptions before answering. Clear reasoning matters
              as much as the correct answer.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5 text-sm">
      {icon}
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

export default TemplatePage;
