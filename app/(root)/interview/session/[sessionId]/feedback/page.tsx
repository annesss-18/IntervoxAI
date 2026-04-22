import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Feedback - IntervoxAI" };

import {
  AlertCircle,
  Award,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Home,
  Info,
  Lightbulb,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { RouteParams } from "@/types";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/interview.action";
import { Button } from "@/components/atoms/button";
import { Progress } from "@/components/atoms/progress";
import { Badge } from "@/components/atoms/badge";
import { ScoreRing } from "@/components/atoms/progress";
import { Container } from "@/components/layout/Container";
import { FeedbackGenerationStatus } from "@/components/organisms/FeedbackGenerationStatus";
import { TranscriptViewer } from "@/components/organisms/TranscriptViewer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BehaviouralVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "secondary";

/**
 * Map each behavioural trait value to a Badge semantic variant.
 * Positive outcomes → success, neutral → secondary, developing → warning,
 * needs-work → error, variable/exploratory → info.
 */
const BEHAVIOURAL_VARIANT: Record<string, BehaviouralVariant> = {
  // confidenceLevel
  High: "success",
  Moderate: "secondary",
  Low: "warning",
  Variable: "info",
  // clarityOfThought
  Excellent: "success",
  Good: "secondary",
  Developing: "warning",
  "Needs Improvement": "error",
  // technicalDepth
  Expert: "success",
  Proficient: "secondary",
  Intermediate: "warning",
  Foundational: "error",
  // problemApproach
  Systematic: "success",
  Intuitive: "secondary",
  Exploratory: "info",
  Uncertain: "warning",
  // stressResponse
  Composed: "success",
  Adaptive: "secondary",
  Hesitant: "warning",
  Struggled: "error",
};

function traitVariant(value: string): BehaviouralVariant {
  return BEHAVIOURAL_VARIANT[value] ?? "secondary";
}

const Page = async ({ params }: RouteParams) => {
  const { sessionId } = await params;
  if (!sessionId || typeof sessionId !== "string") redirect("/");

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(sessionId, user.id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: sessionId,
    userId: user.id,
  });

  if (!feedback) {
    if (interview.status === "completed") {
      return <FeedbackGenerationStatus sessionId={sessionId} />;
    }
    return (
      <Container size="md" className="animate-fade-up">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border py-16 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{ background: "var(--gradient-brand-subtle)" }}
          />
          <div className="relative flex flex-col items-center gap-5 px-8">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <AlertCircle className="size-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">No Feedback Yet</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Complete the interview first to receive a detailed performance
                report.
              </p>
            </div>
            <Button asChild variant="gradient">
              <Link href={`/interview/session/${sessionId}`}>
                <Target className="size-4" />
                Resume Interview
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  type CategoryItem = { name: string; score: number; comment: string };

  const formatDate = (iso?: string) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const scoreVariant = (s: number): "success" | "warning" | "error" =>
    s >= 80 ? "success" : s >= 60 ? "warning" : "error";

  const scoreTone = (s: number) =>
    s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-error";

  const { totalScore } = feedback;

  const hiringRecMap: Record<
    string,
    { label: string; variant: "success" | "secondary" | "warning" | "error" }
  > = {
    "Strong Yes": { label: "Strong Hire", variant: "success" },
    Yes: { label: "Hire", variant: "success" },
    "Lean Yes": { label: "Lean Hire", variant: "secondary" },
    "Lean No": { label: "Lean No", variant: "warning" },
    No: { label: "Not Recommended", variant: "error" },
    "Strong No": { label: "Strong No", variant: "error" },
  };

  const storedRec = feedback.hiringRecommendation
    ? hiringRecMap[feedback.hiringRecommendation]
    : undefined;

  const hiringRec =
    storedRec ??
    (totalScore >= 80
      ? { label: "Strong Hire", variant: "success" as const }
      : totalScore >= 70
        ? { label: "Lean Hire", variant: "secondary" as const }
        : totalScore >= 55
          ? { label: "Borderline", variant: "warning" as const }
          : { label: "Not Recommended", variant: "error" as const });

  const scoreMessage =
    totalScore >= 80
      ? "Outstanding. Clear reasoning, confident delivery, and strong technical depth."
      : totalScore >= 60
        ? "Solid progress - tighten structure and reduce hedging to close the gap."
        : "Clear room for growth. Focus on the areas below and run another session.";

  // Defensively access fields that may be absent in legacy feedback documents.
  const behavioralInsights = feedback.behavioralInsights as
    | typeof feedback.behavioralInsights
    | undefined
    | null;
  const careerCoaching = feedback.careerCoaching as
    | typeof feedback.careerCoaching
    | undefined
    | null;

  const behaviouralTraits = behavioralInsights
    ? [
        { label: "Confidence", value: behavioralInsights.confidenceLevel },
        {
          label: "Clarity of thought",
          value: behavioralInsights.clarityOfThought,
        },
        { label: "Technical depth", value: behavioralInsights.technicalDepth },
        {
          label: "Problem approach",
          value: behavioralInsights.problemApproach,
        },
        { label: "Under pressure", value: behavioralInsights.stressResponse },
      ]
    : [];

  return (
    <Container size="xl" className="animate-fade-up space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-5">
        <div
          className="pointer-events-none absolute -top-10 right-12 h-32 w-48 rounded-full opacity-12 blur-[60px]"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Badge variant="success" dot>
              <Sparkles className="size-3" />
              Interview Completed
            </Badge>
            <h1 className="font-serif italic font-normal text-3xl text-foreground sm:text-4xl">
              Performance Report
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              ID: {feedback.interviewId}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Badge variant="outline" className="w-fit gap-1.5">
              <Calendar className="size-3.5" />
              {formatDate(feedback.createdAt)}
            </Badge>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4 font-medium"
            >
              <Home className="size-3.5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ── Overall score + hiring recommendation ──────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8">
          <ScoreRing score={totalScore} size={180} strokeWidth={12} />
          <p className="mt-4 text-sm text-muted-foreground text-center max-w-[12rem]">
            Overall score
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Award className={`size-6 ${scoreTone(totalScore)}`} />
              <h2 className="text-xl font-semibold">Overall Performance</h2>
              <Badge
                variant={hiringRec.variant}
                className="ml-auto text-xs font-semibold tracking-wide"
              >
                {hiringRec.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {scoreMessage}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground label-caps">Score</span>
              <span className={`font-mono font-bold ${scoreTone(totalScore)}`}>
                {totalScore}/100
              </span>
            </div>
            <Progress
              value={totalScore}
              variant={scoreVariant(totalScore)}
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
            {[
              {
                label: "Score",
                val: `${totalScore}`,
                color: scoreTone(totalScore),
              },
              {
                label: "Areas",
                val: String(
                  Array.isArray(feedback.categoryScores)
                    ? feedback.categoryScores.length
                    : 0,
                ),
                color: "text-foreground",
              },
              {
                label: "Strengths",
                val: String(
                  Array.isArray(feedback.strengths)
                    ? feedback.strengths.length
                    : 0,
                ),
                color: "text-success",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`font-mono text-2xl font-bold ${s.color}`}>
                  {s.val}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Hiring signal legend — collapsible to avoid visual clutter */}
          <details className="border-t border-border/50 pt-4 group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Info className="size-3.5 shrink-0" />
              <span>What does this hiring signal mean?</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              {[
                {
                  dot: "bg-success",
                  text: "Strong Hire — top ~5 % for this level",
                },
                {
                  dot: "bg-success",
                  text: "Hire — recommend without reservation",
                },
                { dot: "bg-secondary", text: "Lean Hire — minor reservations" },
                {
                  dot: "bg-warning",
                  text: "Lean No — not recommended, borderline",
                },
                { dot: "bg-error", text: "Not Recommended — significant gaps" },
                { dot: "bg-error", text: "Strong No — fundamental misfit" },
              ].map(({ dot, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full shrink-0 ${dot}`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* ── Category breakdown ─────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">Performance Breakdown</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.isArray(feedback.categoryScores) &&
            feedback.categoryScores.map((cat: CategoryItem, i: number) => (
              <div
                key={cat.name}
                className={`animate-fade-up fill-both rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-md)] delay-${(i + 1) * 75}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-snug">{cat.name}</h3>
                  <span
                    className={`font-mono text-xl font-bold shrink-0 ${scoreTone(cat.score)}`}
                  >
                    {cat.score}
                    <span className="text-sm text-muted-foreground font-normal">
                      /100
                    </span>
                  </span>
                </div>
                <Progress
                  value={cat.score}
                  variant={scoreVariant(cat.score)}
                  className="mb-3 h-1.5"
                />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cat.comment}
                </p>
              </div>
            ))}
        </div>
      </section>

      {/* ── Strengths + improvements ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-success/25 bg-success/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success/15 ring-1 ring-success/25">
              <TrendingUp className="size-5 text-success" />
            </span>
            <h3 className="text-lg font-semibold">Key Strengths</h3>
          </div>
          <ul className="space-y-3">
            {Array.isArray(feedback.strengths) &&
              feedback.strengths.map((s: string, index: number) => (
                <li key={`${s}-${index}`} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {s}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-warning/25 bg-warning/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-warning/15 ring-1 ring-warning/25">
              <TrendingDown className="size-5 text-warning" />
            </span>
            <h3 className="text-lg font-semibold">Areas to Improve</h3>
          </div>
          <ul className="space-y-3">
            {Array.isArray(feedback.areasForImprovement) &&
              feedback.areasForImprovement.map(
                (item: string, index: number) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {item}
                    </span>
                  </li>
                ),
              )}
          </ul>
        </div>
      </div>

      {/* ── Behavioural profile ────────────────────────────────────────── */}
      {behavioralInsights && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Brain className="size-5 text-info" />
            <h2 className="text-xl font-semibold">Behavioural profile</h2>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            {/* Trait pills */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {behaviouralTraits.map(({ label, value }) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {label}
                  </p>
                  <Badge
                    variant={traitVariant(value)}
                    className="text-xs font-medium"
                  >
                    {value}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Observations */}
            {Array.isArray(behavioralInsights.observations) &&
              behavioralInsights.observations.length > 0 && (
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Notable observations
                  </p>
                  {behavioralInsights.observations.map(
                    (obs: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 size-1.5 rounded-full bg-info shrink-0" />
                        <span className="leading-relaxed">{obs}</span>
                      </div>
                    ),
                  )}
                </div>
              )}
          </div>
        </section>
      )}

      {/* ── Career coaching ─────────────────────────────────────────────── */}
      {careerCoaching && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Career coaching</h2>
          </div>

          <div className="space-y-4">
            {/* Three coaching columns */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Immediate actions */}
              {Array.isArray(careerCoaching.immediateActions) &&
                careerCoaching.immediateActions.length > 0 && (
                  <div className="rounded-2xl border border-info/25 bg-info/5 p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info/15 ring-1 ring-info/25">
                        <Zap className="size-4 text-info" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Do this week</p>
                        <p className="text-[10px] text-muted-foreground">
                          Next 2 weeks
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {careerCoaching.immediateActions.map(
                        (action: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                          >
                            <span className="mt-1.5 size-1.5 rounded-full bg-info shrink-0" />
                            {action}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

              {/* Learning path */}
              {Array.isArray(careerCoaching.learningPath) &&
                careerCoaching.learningPath.length > 0 && (
                  <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/25">
                        <BookOpen className="size-4 text-accent" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Learning path</p>
                        <p className="text-[10px] text-muted-foreground">
                          3–6 month focus
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {careerCoaching.learningPath.map(
                        (item: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                          >
                            <span className="mt-1.5 size-1.5 rounded-full bg-accent shrink-0" />
                            {item}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

              {/* Interview tips */}
              {Array.isArray(careerCoaching.interviewTips) &&
                careerCoaching.interviewTips.length > 0 && (
                  <div className="rounded-2xl border border-warning/25 bg-warning/5 p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 ring-1 ring-warning/25">
                        <Lightbulb className="size-4 text-warning" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Interview tips</p>
                        <p className="text-[10px] text-muted-foreground">
                          From this session
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {careerCoaching.interviewTips.map(
                        (tip: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                          >
                            <span className="mt-1.5 size-1.5 rounded-full bg-warning shrink-0" />
                            {tip}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
            </div>

            {/* Role readiness — full width */}
            {careerCoaching.roleReadiness && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20 mt-0.5">
                  <Target className="size-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold mb-1.5">Role readiness</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {careerCoaching.roleReadiness}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Final assessment ────────────────────────────────────────────── */}
      <div className="gradient-border overflow-hidden rounded-2xl p-px">
        <div className="rounded-2xl bg-card p-6 space-y-4">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-[0_4px_16px_-4px_color-mix(in_srgb,var(--primary)_50%,var(--accent)_50%)]">
              <Sparkles className="size-5 text-white" />
            </span>
            <div>
              <h3 className="text-lg font-semibold">Final Assessment</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feedback.finalAssessment}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Home className="size-4" />
                Return to Dashboard
              </Link>
            </Button>
            <Button asChild variant="gradient" className="flex-1">
              <Link href="/explore">
                <RefreshCw className="size-4" />
                Practice Again
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Transcript viewer ─────────────────────────────────────────── */}
      {interview.transcript && interview.transcript.length > 0 && (
        <TranscriptViewer transcript={interview.transcript} />
      )}
    </Container>
  );
};

export default Page;
