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
    <Container size="xl" className="animate-fade-up">
      <Link
        href="/explore"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Explore
      </Link>

      {/* Two-column layout: 1fr left, 2fr right */}
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr] lg:h-[calc(100vh-10rem)]">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5 lg:min-h-0">
          {/* Template details card */}
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card p-6 flex flex-col">
            <div
              className="pointer-events-none absolute -top-12 right-4 h-32 w-48 rounded-full opacity-15 blur-[60px]"
              style={{ background: "var(--gradient-brand)" }}
            />

            <div className="relative flex flex-col gap-4 flex-1">
              {/* Logo + badge */}
              <div className="flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2">
                  <CompanyLogo
                    companyName={template.companyName || "Unknown Company"}
                    logoUrl={template.companyLogoUrl}
                    size={52}
                    className="rounded-xl object-contain"
                  />
                </div>
                <div className="pt-0.5">
                  <Badge variant="primary" dot>
                    <Sparkles className="size-3" />
                    Ready to Practice
                  </Badge>
                </div>
              </div>

              {/* Title + company */}
              <div>
                <h1 className="text-xl font-bold text-foreground leading-snug sm:text-2xl">
                  {template.role} Interview
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.companyName || "IntervoxAI"}
                </p>
              </div>

              {/* Badges */}
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

              {/* Tech stack */}
              {template.techStack && template.techStack.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Tech Stack</span>
                  <DisplayTechIcons techStack={template.techStack} />
                </div>
              )}

              {/* Spacer pushes button down */}
              <div className="flex-1" />

              {/* Start button */}
              <StartSessionButton templateId={template.id} />
            </div>
          </div>

          {/* Tips & features card */}
          <div className="shrink-0 rounded-2xl border border-border bg-card p-5 space-y-4">
            {/* Tip callout */}
            <div className="rounded-xl border border-primary/20 bg-primary/6 p-3.5">
              <p className="text-sm font-semibold text-primary mb-1">Tip</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                State your assumptions before answering. Clear reasoning matters
                as much as the correct answer.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-2">
              <FeatureLine
                icon={<ShieldCheck className="size-4 text-success" />}
                text="Personalised AI interviewer context"
              />
              <FeatureLine
                icon={<Sparkles className="size-4 text-primary" />}
                text="Role and stack-aware questioning"
              />
              <FeatureLine
                icon={<Clock3 className="size-4 text-info" />}
                text="Feedback generated right after session"
              />
            </div>
          </div>
        </div>

        {/* ── Right column: Job Description ── */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col lg:min-h-0">
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <FileText className="size-4 text-primary" />
            </span>
            <h2 className="font-semibold">Job Description</h2>
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-2 lg:min-h-0">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {template.jobDescription}
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

function FeatureLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {icon}
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

export default TemplatePage;
