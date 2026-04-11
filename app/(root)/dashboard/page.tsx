import { Metadata } from "next";
import Link from "next/link";
import {
  PlusCircle,
  Activity,
  CheckCircle2,
  Award,
  LayoutTemplate,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getUserSessionsPage,
  getUserTemplates,
} from "@/lib/actions/interview.action";
import { UserRepository } from "@/lib/repositories/user.repository";
import { Container, PageHeader } from "@/components/layout/Container";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import { Button } from "@/components/atoms/button";
import { DashboardSessionList } from "@/components/organisms/DashboardSessionList";
import { TemplateCard } from "@/components/organisms/TemplateCard";
import { ScoreTrendChart } from "@/components/organisms/ScoreTrendChart";

export const metadata: Metadata = {
  title: "Dashboard - IntervoxAI",
  description:
    "Manage your mock interviews, track progress, and create new interview templates.",
};

function needsStatsReconciliation(args: {
  activeCount?: number;
  completedCount?: number;
  scoreCount?: number;
  scoreSum?: number;
  activeSessionsLoaded: number;
  activeCursor: string | null;
  completedSessionsLoaded: number;
  completedCursor: string | null;
}) {
  const {
    activeCount,
    completedCount,
    scoreCount,
    scoreSum,
    activeSessionsLoaded,
    activeCursor,
    completedSessionsLoaded,
    completedCursor,
  } = args;

  const hasNegativeCounters =
    (typeof activeCount === "number" && activeCount < 0) ||
    (typeof completedCount === "number" && completedCount < 0) ||
    (typeof scoreCount === "number" && scoreCount < 0);

  const hasImpossibleScoreState =
    typeof scoreCount === "number" &&
    typeof scoreSum === "number" &&
    scoreCount === 0 &&
    scoreSum !== 0;

  const activeLooksDrifted =
    typeof activeCount === "number" &&
    activeCount > 0 &&
    activeSessionsLoaded === 0 &&
    !activeCursor;

  const completedLooksDrifted =
    typeof completedCount === "number" &&
    completedCount > 0 &&
    completedSessionsLoaded === 0 &&
    !completedCursor;

  return (
    hasNegativeCounters ||
    hasImpossibleScoreState ||
    activeLooksDrifted ||
    completedLooksDrifted
  );
}

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const [activeSessionsPage, completedSessionsPage, templates] =
    await Promise.all([
      getUserSessionsPage(user.id, undefined, 20, "active"),
      getUserSessionsPage(user.id, undefined, 20, "completed"),
      getUserTemplates(user.id),
    ]);

  const activeSessions = activeSessionsPage.sessions;
  const completedSessions = completedSessionsPage.sessions;

  const shouldReconcileStats = needsStatsReconciliation({
    activeCount: user.stats?.activeCount,
    completedCount: user.stats?.completedCount,
    scoreCount: user.stats?.scoreCount,
    scoreSum: user.stats?.scoreSum,
    activeSessionsLoaded: activeSessions.length,
    activeCursor: activeSessionsPage.nextCursor,
    completedSessionsLoaded: completedSessions.length,
    completedCursor: completedSessionsPage.nextCursor,
  });

  const resolvedStats = shouldReconcileStats
    ? await UserRepository.reconcileStats(user.id)
    : user.stats;

  // Prefer pre-aggregated stats and fall back to session-derived values for
  // legacy users.
  const activeCount = Math.max(
    0,
    resolvedStats?.activeCount ?? activeSessions.length,
  );
  const completedCount =
    Math.max(0, resolvedStats?.completedCount ?? completedSessions.length);
  const averageScore: number | null =
    typeof resolvedStats?.scoreSum === "number" &&
      typeof resolvedStats?.scoreCount === "number" &&
      resolvedStats.scoreCount > 0
      ? Math.round(resolvedStats.scoreSum / resolvedStats.scoreCount)
      : (() => {
        const withScores = completedSessions.filter(
          (s) => typeof s.finalScore === "number",
        );
        return withScores.length > 0
          ? Math.round(
            withScores.reduce((t, s) => t + (s.finalScore || 0), 0) /
            withScores.length,
          )
          : null;
      })();

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <Container>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Track active practice, review completed sessions, and launch your next interview."
      >
        <Link href="/create">
          <Button variant="gradient" className="gap-2">
            <PlusCircle className="size-4" />
            New Interview
          </Button>
        </Link>
      </PageHeader>

      {/* ── Metric cards ─────────────────────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active Sessions"
          value={String(activeCount)}
          icon={<Activity className="size-5" />}
          tone="primary"
        />
        <MetricCard
          label="Completed"
          value={String(completedCount)}
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />
        <MetricCard
          label="Avg Score"
          value={averageScore !== null ? `${averageScore}` : "\u2014"}
          valueSuffix={averageScore !== null ? "/100" : undefined}
          icon={<TrendingUp className="size-5" />}
          tone="info"
        />
        <MetricCard
          label="Templates"
          value={String(templates.length)}
          icon={<LayoutTemplate className="size-5" />}
          tone="accent"
        />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="active">
            Practice
            {activeCount > 0 && (
              <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            History
            {completedCount > 0 && (
              <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {completedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates
            {templates.length > 0 && (
              <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {templates.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Practice tab */}
        <TabsContent value="active">
          <DashboardSessionList
            initialSessions={activeSessions}
            initialCursor={activeSessionsPage.nextCursor}
            status="active"
            emptyState={
              <EmptyState
                icon={<Activity className="size-8 text-muted-foreground/50" />}
                title="No active interviews"
                description="Start a new interview session and your active practice will appear here."
                action={
                  <Link href="/create">
                    <Button variant="gradient">
                      <PlusCircle className="size-4" />
                      New Interview
                    </Button>
                  </Link>
                }
              />
            }
          />
        </TabsContent>

        {/* History tab — ScoreTrendChart is mounted here so it only fetches
            data when the user navigates to this tab. */}
        <TabsContent value="history">
          <ScoreTrendChart />
          <DashboardSessionList
            initialSessions={completedSessions}
            initialCursor={completedSessionsPage.nextCursor}
            status="completed"
            emptyState={
              <EmptyState
                icon={<Award className="size-8 text-muted-foreground/50" />}
                title="No completed interviews"
                description="Complete your first interview to unlock full feedback history and score trends."
              />
            }
          />
        </TabsContent>

        {/* Templates tab */}
        <TabsContent value="templates">
          {templates.length > 0 ? (
            <CardGrid>
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </CardGrid>
          ) : (
            <EmptyState
              icon={
                <LayoutTemplate className="size-8 text-muted-foreground/50" />
              }
              title="No templates yet"
              description="Create your first role-specific template to run tailored interview sessions."
              action={
                <Link href="/create">
                  <Button variant="gradient">
                    <PlusCircle className="size-4" />
                    Create Template
                  </Button>
                </Link>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </Container>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}

const toneConfig = {
  primary: {
    icon: "bg-primary/10 text-primary ring-primary/20",
    badge: "bg-primary/8 border-primary/20",
    numColor: "text-foreground",
  },
  success: {
    icon: "bg-success/10 text-success ring-success/20",
    badge: "bg-success/8 border-success/20",
    numColor: "text-foreground",
  },
  info: {
    icon: "bg-info/10 text-info ring-info/20",
    badge: "bg-info/8 border-info/20",
    numColor: "text-foreground",
  },
  accent: {
    icon: "bg-accent/10 text-accent ring-accent/20",
    badge: "bg-accent/8 border-accent/20",
    numColor: "text-foreground",
  },
};

function MetricCard({
  label,
  value,
  valueSuffix,
  icon,
  tone,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
  icon: ReactNode;
  tone: keyof typeof toneConfig;
}) {
  const cfg = toneConfig[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-md)]">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "var(--gradient-brand-subtle)" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="label-caps mb-3">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
              {value}
            </span>
            {valueSuffix && (
              <span className="font-mono text-sm text-muted-foreground">
                {valueSuffix}
              </span>
            )}
          </div>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${cfg.icon}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2/40 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-30"
        style={{ background: "var(--gradient-brand-subtle)" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4 px-8">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
          {icon}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
