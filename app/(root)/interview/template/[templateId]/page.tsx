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
  Users,
  Star,
  Lightbulb,
  ChevronRight,
  Zap,
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
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border py-24 text-center">
          <div className="relative flex flex-col items-center gap-4 px-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 mb-2">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Template Not Found</h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              This template doesn&apos;t exist or was removed.
            </p>
            <Link
              href="/explore"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Browse other templates
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // Split the job description into readable paragraphs.
  const jobParagraphs = (() => {
    const raw = template.jobDescription?.trim();
    if (!raw) return [];
    const byNewline = raw
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (byNewline.length > 1) return byNewline;
    const sentences = raw.split(/(?<=\.)\s+/).filter(Boolean);
    const CHUNK_SIZE = 3;
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
      chunks.push(sentences.slice(i, i + CHUNK_SIZE).join(" "));
    }
    return chunks.length > 1 ? chunks : [raw];
  })();

  const avgScore = template.avgScore ?? 0;

  return (
    <Container size="xl" className="animate-fade-up pb-16">
      <Link
        href="/explore"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Explore
      </Link>

      <div className="relative mb-5 overflow-hidden rounded-2xl border border-border bg-card gradient-border">
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-56 rounded-full opacity-15 blur-[80px]"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-0 h-32 w-40 rounded-full opacity-8 blur-[60px]"
          style={{ background: "var(--gradient-brand)" }}
        />

        <div className="relative flex flex-col lg:flex-row">
          <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6 lg:border-r lg:border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
                <CompanyLogo
                  companyName={template.companyName || "Unknown Company"}
                  logoUrl={template.companyLogoUrl}
                  size={36}
                  className="rounded-lg object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {template.companyName || "IntervoxAI"}
              </span>
              <Badge variant="primary" dot className="text-[10px] ml-auto">
                <Sparkles className="size-2.5" />
                Ready to Practice
              </Badge>
            </div>

            <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
              {template.role}{" "}
              <span className="text-muted-foreground font-normal">Interview</span>
            </h1>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                <Briefcase className="size-3" />
                {template.level}
              </Badge>
              <Badge variant="primary" className="text-[10px]">
                <Target className="size-3" />
                {template.type}
              </Badge>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {template.techStack && template.techStack.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 shrink-0">
                    Tech Stack
                  </span>
                  <DisplayTechIcons techStack={template.techStack} />
                </div>
              )}

              {template.focusArea && template.focusArea.length > 0 && (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 shrink-0 mr-0.5">
                    Focus
                  </span>
                  {template.focusArea.map((area) => (
                    <Badge key={area} variant="outline" className="text-[10px]">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3.5 p-5 sm:p-6 lg:min-w-[250px] lg:max-w-[290px] overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 bg-surface-2/50 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="size-3 text-muted-foreground" />
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Sessions
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {template.usageCount || 0}
                </span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-2/50 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  {avgScore > 0 ? (
                    <Star className="size-3 text-warning fill-current" />
                  ) : (
                    <Sparkles className="size-3 text-primary" />
                  )}
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Avg Score
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {avgScore > 0 ? avgScore.toFixed(1) : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <StartSessionButton templateId={template.id} />
              <p className="text-[10px] text-center text-muted-foreground">
                AI feedback after your session
              </p>
            </div>

            <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border/50">
              <FeaturePill
                icon={<ShieldCheck className="size-3.5 text-success shrink-0" />}
                text="Personalised AI context"
              />
              <FeaturePill
                icon={<Zap className="size-3.5 text-primary shrink-0" />}
                text="Stack-aware questioning"
              />
              <FeaturePill
                icon={<Clock3 className="size-3.5 text-info shrink-0" />}
                text="Instant post-session feedback"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start animate-fade-up delay-100 fill-both">
        <article className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border/50">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <FileText className="size-4 text-primary" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground text-sm">
                Job Description
              </h2>
              <p className="text-[11px] text-muted-foreground">
                What this role is about
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {jobParagraphs.length > 0 ? (
              jobParagraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm leading-7 text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No job description provided.
              </p>
            )}
          </div>
        </article>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                <Lightbulb className="size-4 text-accent" />
              </span>
              <h3 className="font-semibold text-sm text-foreground">
                Preparation Tips
              </h3>
            </div>

            <div className="space-y-2.5">
              <TipItem
                number="01"
                title="State your assumptions"
                description="Clarify what you're assuming. Clear reasoning matters as much as the right answer."
              />
              <TipItem
                number="02"
                title="Think out loud"
                description="The AI evaluates your process, not just your conclusion. Walk through your thinking."
              />
              <TipItem
                number="03"
                title="Ask clarifying questions"
                description="Just like a real interview, it's fine to ask for more context before answering."
              />
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
};

function FeaturePill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function TipItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 py-2 border-t border-border/40 first:border-t-0 first:pt-0">
      <span className="text-[10px] font-bold text-primary/50 mt-0.5 tabular-nums shrink-0 w-4">
        {number}
      </span>
      <div>
        <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default TemplatePage;
