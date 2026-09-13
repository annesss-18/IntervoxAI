"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreHistoryEntry } from "@/types";

// A handful of results makes a trend meaningful without asking people to wait
// through an entire month of practice before they can see progress.
const MIN_SESSIONS_FOR_TREND = 6;
const GRAPH_W = 156;
const GRAPH_H = 42;
const GRAPH_PAD = 4;

function pointForScore(score: number, index: number, total: number) {
  const x =
    total <= 1
      ? GRAPH_W / 2
      : GRAPH_PAD + (index / (total - 1)) * (GRAPH_W - GRAPH_PAD * 2);
  const y = GRAPH_PAD + ((100 - score) / 100) * (GRAPH_H - GRAPH_PAD * 2);
  return { x, y };
}

function scoreColor(score: number) {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--error)";
}

export function ScoreTrendChart() {
  const [data, setData] = useState<ScoreHistoryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard/score-history", { method: "GET", cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setData(json.data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const sessions = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      ),
    [data],
  );

  const scores = useMemo(
    () => sessions.map((session) => session.finalScore),
    [sessions],
  );

  const summary = useMemo(() => {
    if (scores.length < MIN_SESSIONS_FOR_TREND) return null;

    const latest = scores[scores.length - 1]!;
    const previous = scores[scores.length - 2]!;
    const average = Math.round(
      scores.reduce((total, score) => total + score, 0) / scores.length,
    );
    const points = scores
      .map((score, index) => {
        const point = pointForScore(score, index, scores.length);
        return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(" ");
    const firstPoint = pointForScore(scores[0]!, 0, scores.length);
    const lastPoint = pointForScore(latest, scores.length - 1, scores.length);

    return {
      latest,
      average,
      trend: latest - previous,
      points,
      areaPoints: `${firstPoint.x.toFixed(1)},${GRAPH_H - GRAPH_PAD} ${points} ${lastPoint.x.toFixed(1)},${GRAPH_H - GRAPH_PAD}`,
      lastPoint,
    };
  }, [scores]);

  if (!summary) return null;

  const isImproving = summary.trend >= 0;
  const TrendIcon = isImproving ? TrendingUp : TrendingDown;

  return (
    <div
      className="w-full min-w-[17rem] rounded-xl bg-background/45 px-3 py-2.5 shadow-[var(--shadow-sm)] ring-1 ring-border/60 backdrop-blur-sm sm:w-[22rem]"
      aria-label={`Score trend across ${scores.length} completed sessions`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-[9px]">Practice momentum</p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-bold tabular-nums text-foreground">
              {summary.latest}
            </span>
            <span className="text-[11px] text-muted-foreground">
              latest · {summary.average} avg
            </span>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums",
            isImproving ? "text-success" : "text-error",
          )}
        >
          <TrendIcon className="size-3.5" />
          {summary.trend > 0 ? "+" : ""}
          {summary.trend}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
        className="mt-1.5 h-11 w-full overflow-visible"
        role="img"
        aria-label={`Latest score ${summary.latest}; ${isImproving ? "up" : "down"} ${Math.abs(summary.trend)} points from the previous session`}
      >
        <defs>
          <linearGradient id="score-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={summary.areaPoints} fill="url(#score-trend-fill)" />
        <polyline
          points={summary.points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={summary.lastPoint.x}
          cy={summary.lastPoint.y}
          r="3.5"
          fill={scoreColor(summary.latest)}
          stroke="var(--background)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
