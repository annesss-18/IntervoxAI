"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/lib/utils";
import type { ScoreHistoryEntry } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────

const CHART_W = 580;
const CHART_H = 160;
const PAD_LEFT = 44;
const PAD_RIGHT = 20;
const PAD_TOP = 16;
const PAD_BOTTOM = 44;
const SVG_W = PAD_LEFT + CHART_W + PAD_RIGHT;
const SVG_H = PAD_TOP + CHART_H + PAD_BOTTOM;

const GRID_SCORES = [100, 80, 60, 40, 20, 0];
const ROLLING_WINDOW = 3;

const INTERVIEW_TYPES = [
  "All",
  "Technical",
  "System Design",
  "Behavioral",
  "HR",
  "Mixed",
] as const;
type TypeFilter = (typeof INTERVIEW_TYPES)[number];

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreToY(score: number): number {
  // score 100 → PAD_TOP, score 0 → PAD_TOP + CHART_H
  return PAD_TOP + ((100 - score) / 100) * CHART_H;
}

function indexToX(i: number, n: number): number {
  if (n <= 1) return PAD_LEFT + CHART_W / 2;
  return PAD_LEFT + (i / (n - 1)) * CHART_W;
}

function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function buildPolylinePoints(scores: number[], n: number): string {
  return scores
    .map((s, i) => `${indexToX(i, n).toFixed(1)},${scoreToY(s).toFixed(1)}`)
    .join(" ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--error)";
}

// ── Chart component ─────────────────────────────────────────────────────────

export function ScoreTrendChart() {
  const [data, setData] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard/score-history", { method: "GET", cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setData(json.data ?? []);
        }
      })
      .catch(() => {
        // silently fail — chart just won't render
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered + derived data — recomputed only when dependencies change.
  const filtered = useMemo(
    () =>
      typeFilter === "All" ? data : data.filter((d) => d.type === typeFilter),
    [data, typeFilter],
  );

  const scores = useMemo(() => filtered.map((d) => d.finalScore), [filtered]);

  const avgScores = useMemo(
    () => rollingAverage(scores, ROLLING_WINDOW),
    [scores],
  );

  const stats = useMemo(() => {
    if (scores.length === 0) return null;
    const latest = scores[scores.length - 1]!;
    const best = Math.max(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const trend = scores.length >= 2 ? latest - scores[scores.length - 2]! : 0;
    return { latest, best, avg, trend };
  }, [scores]);

  // Derive which type filters have data so we can grey out empty ones.
  const typeHasData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      counts[d.type] = (counts[d.type] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (data.length < 2) {
    return null; // Not enough data to show a trend — render nothing
  }

  const n = filtered.length;
  const rawPoints = buildPolylinePoints(scores, n);
  const avgPoints = buildPolylinePoints(avgScores, n);

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <span className="font-semibold text-sm">Score trend</span>
          <span className="text-xs text-muted-foreground">
            {filtered.length} session{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Stat summary */}
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="label-caps">Latest</p>
              <p
                className="font-mono font-bold"
                style={{ color: scoreColor(stats.latest) }}
              >
                {stats.latest}
              </p>
            </div>
            <div className="text-center">
              <p className="label-caps">Best</p>
              <p className="font-mono font-bold text-success">{stats.best}</p>
            </div>
            <div className="text-center">
              <p className="label-caps">Average</p>
              <p className="font-mono font-bold text-foreground">{stats.avg}</p>
            </div>
            {Math.abs(stats.trend) > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp
                  className={cn(
                    "size-3.5",
                    stats.trend >= 0 ? "text-success" : "text-error rotate-180",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    stats.trend >= 0 ? "text-success" : "text-error",
                  )}
                >
                  {stats.trend > 0 ? "+" : ""}
                  {stats.trend}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Type filter ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {INTERVIEW_TYPES.map((t) => {
          const count = t === "All" ? data.length : (typeHasData[t] ?? 0);
          const isActive = typeFilter === t;
          const hasEntries = count > 0;
          if (t !== "All" && !hasEntries) return null;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
              )}
            >
              {t}
              {t !== "All" && (
                <span className="ml-1.5 opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── SVG chart ──────────────────────────────────────────────────────── */}
      {n === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
          No scored sessions for this filter
        </div>
      ) : (
        <div className="relative">
          <svg
            width="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="overflow-visible"
          >
            {/* Y-axis grid lines + labels */}
            {GRID_SCORES.map((gs) => {
              const y = scoreToY(gs);
              return (
                <g key={gs}>
                  <line
                    x1={PAD_LEFT}
                    y1={y}
                    x2={PAD_LEFT + CHART_W}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="0.5"
                    strokeDasharray={gs === 0 || gs === 100 ? undefined : "3 3"}
                  />
                  <text
                    x={PAD_LEFT - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="central"
                    fontSize="10"
                    fill="var(--muted-foreground)"
                    fontFamily="var(--font-mono)"
                  >
                    {gs}
                  </text>
                </g>
              );
            })}

            {/* X-axis date labels — show every nth label to avoid clutter */}
            {filtered.map((d, i) => {
              const step = Math.max(1, Math.floor(n / 5));
              if (i % step !== 0 && i !== n - 1) return null;
              return (
                <text
                  key={i}
                  x={indexToX(i, n)}
                  y={PAD_TOP + CHART_H + 18}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--muted-foreground)"
                >
                  {formatDate(d.startedAt)}
                </text>
              );
            })}

            {/* Rolling average line (thicker, drawn first so raw line is on top) */}
            {n >= ROLLING_WINDOW && (
              <polyline
                points={avgPoints}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeOpacity="0.35"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Raw score line */}
            <polyline
              points={rawPoints}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Score dots — coloured by range, interactive via title tooltip */}
            {filtered.map((d, i) => {
              const cx = indexToX(i, n);
              const cy = scoreToY(d.finalScore);
              const isHovered = hoveredIdx === i;
              return (
                <g
                  key={d.sessionId}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: "default" }}
                >
                  {/* Larger invisible hit target */}
                  <circle cx={cx} cy={cy} r="10" fill="transparent" />
                  {/* Visible dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 4}
                    fill={scoreColor(d.finalScore)}
                    stroke="var(--card)"
                    strokeWidth="1.5"
                    style={{ transition: "r 120ms ease" }}
                  />
                  {/* Tooltip — appears above the dot when hovered */}
                  {isHovered && (
                    <>
                      <rect
                        x={cx - 38}
                        y={cy - 44}
                        width="76"
                        height="34"
                        rx="5"
                        fill="var(--card)"
                        stroke="var(--border)"
                        strokeWidth="0.5"
                      />
                      <text
                        x={cx}
                        y={cy - 30}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="var(--font-mono)"
                        fill={scoreColor(d.finalScore)}
                      >
                        {d.finalScore}/100
                      </text>
                      <text
                        x={cx}
                        y={cy - 16}
                        textAnchor="middle"
                        fontSize="9"
                        fill="var(--muted-foreground)"
                      >
                        {d.role.length > 14
                          ? `${d.role.slice(0, 13)}…`
                          : d.role}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-px w-5"
                style={{
                  background: "var(--primary)",
                  opacity: 0.6,
                  height: "1.5px",
                }}
              />
              Score per session
            </span>
            {n >= ROLLING_WINDOW && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-5"
                  style={{
                    background: "var(--primary)",
                    opacity: 0.35,
                    height: "2px",
                  }}
                />
                {ROLLING_WINDOW}-session average
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: "var(--success)" }}
              />
              ≥ 80 &nbsp;
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: "var(--warning)" }}
              />
              60 – 79 &nbsp;
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: "var(--error)" }}
              />
              &lt; 60
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
