import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Live Interview · IntervoxAI" };

import {
  AlertCircle,
  Briefcase,
  Sparkles,
  Target,
  ShieldCheck,
} from "lucide-react";
import { getInterviewById } from "@/lib/actions/interview.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { LiveInterviewAgent } from "@/components/organisms/LiveInterviewAgent";
import CompanyLogo from "@/components/molecules/CompanyLogo";
import DisplayTechIcons from "@/components/molecules/DisplayTechIcons";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import type { RouteParams } from "@/types";

const Page = async ({ params }: RouteParams) => {
  const user = await getCurrentUser();
  const { sessionId } = await params;

  if (!user) redirect("/sign-in");
  if (!sessionId || typeof sessionId !== "string") redirect("/");

  const interview = await getInterviewById(sessionId, user.id);

  if (!interview) {
    return (
      <Container size="md" className="animate-fade-up">
        <StateCard
          title="Session Not Found"
          description="This interview session doesn't exist or you don't have access to it."
          actionHref="/create"
          actionLabel="Create New Interview"
        />
      </Container>
    );
  }

  if (!interview.questions || interview.questions.length === 0) {
    return (
      <Container size="md" className="animate-fade-up">
        <StateCard
          title="Interview Data Incomplete"
          description="This session is missing its questions. Please create a new interview."
          actionHref="/create"
          actionLabel="Create New Interview"
        />
      </Container>
    );
  }

  return (
    <Container size="xl" className="animate-fade-up space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-5 sm:px-6">
        <div
          className="pointer-events-none absolute -top-10 right-12 h-32 w-48 rounded-full opacity-15 blur-[60px]"
          style={{ background: "var(--gradient-brand)" }}
        />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2">
              <CompanyLogo
                companyName={interview.companyName || "Unknown Company"}
                logoUrl={interview.companyLogoUrl}
                size={56}
                className="rounded-xl object-contain"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary" dot>
                  <Sparkles className="size-3" />
                  Live Session
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {interview.role}
              </h1>
              <p className="text-sm text-muted-foreground">
                {interview.companyName || "IntervoxAI"} · Keep answers concise
                and technically defensible.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Briefcase className="size-3.5" />
                {interview.level}
              </Badge>
              <Badge variant="secondary">
                <Target className="size-3.5" />
                {interview.type}
              </Badge>
            </div>
            {interview.techStack && interview.techStack.length > 0 && (
              <DisplayTechIcons techStack={interview.techStack} />
            )}
          </div>
        </div>

        <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
          {[
            "Stay focused on one problem at a time",
            "State assumptions before diving deep",
            "Ask clarifying questions when needed",
          ].map((text, i) => (
            <div
              key={text}
              className={`animate-slide-left fill-both flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5 text-sm delay-${(i + 1) * 100}`}
            >
              <ShieldCheck className="size-4 shrink-0 text-success" />
              <span className="text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="min-h-[560px] lg:h-[calc(100vh-18rem)]">
        <LiveInterviewAgent interview={interview} sessionId={sessionId} />
      </section>
    </Container>
  );
};

function StateCard({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: "var(--gradient-brand-subtle)" }}
      />
      <div className="relative flex flex-col items-center gap-5 px-8">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-error/30 bg-error/10">
          <AlertCircle className="size-8 text-error" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link href={actionHref}>
            <Sparkles className="size-4" />
            {actionLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default Page;
