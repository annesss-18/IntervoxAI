"use client";

import { useState, useCallback } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { SessionCardData } from "@/types";
import { SessionCard } from "@/components/organisms/SessionCard";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

type DashboardSessionStatus = "active" | "completed";

interface DashboardSessionListProps {
  initialSessions: SessionCardData[];
  initialCursor: string | null;
  status: DashboardSessionStatus;
  emptyState: React.ReactNode;
}

const SCORE_OPTIONS = [
  { value: 0, label: "Any score" },
  { value: 60, label: "60+" },
  { value: 70, label: "70+" },
  { value: 80, label: "80+" },
  { value: 90, label: "90+" },
] as const;

export function DashboardSessionList({
  initialSessions,
  initialCursor,
  status,
  emptyState,
}: DashboardSessionListProps) {
  const [sessions, setSessions] = useState<SessionCardData[]>(initialSessions);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  // Filter state — only applied client-side over the already-loaded sessions.
  const [query, setQuery] = useState("");
  const [scoreMin, setScoreMin] = useState(0);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ cursor, status });
      const res = await fetch(`/api/dashboard/sessions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load sessions");

      const data = await res.json();
      setSessions((prev) => [...prev, ...(data.sessions ?? [])]);
      setCursor(data.nextCursor ?? null);
    } catch (error) {
      logger.error("Error loading more sessions:", { status, error });
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, status]);

  // Derived filtered list — runs synchronously on each render.
  const filteredSessions = sessions.filter((s) => {
    const q = query.toLowerCase().trim();
    const matchesText =
      !q ||
      s.role.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q);

    const matchesScore =
      scoreMin === 0 ||
      (typeof s.finalScore === "number" && s.finalScore >= scoreMin);

    return matchesText && matchesScore;
  });

  const hasActiveFilter = query.trim().length > 0 || scoreMin > 0;
  const hasNoData = sessions.length === 0 && !cursor;

  // If we have no data at all, skip the filter bar and show the contextual
  // empty state provided by the parent.
  if (hasNoData) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 sm:max-w-xs">
          <Input
            placeholder="Search by role or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search />}
            iconRight={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              ) : undefined
            }
            className="h-10"
          />
        </div>

        {status === "completed" && (
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
            <select
              value={scoreMin}
              onChange={(e) => setScoreMin(Number(e.target.value))}
              className={cn(
                "h-10 cursor-pointer appearance-none rounded-xl border border-border bg-input/40",
                "px-3 pr-8 text-sm font-medium text-foreground",
                "transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40",
              )}
              style={{ backgroundImage: "none" }}
            >
              {SCORE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setScoreMin(0);
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="size-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {filteredSessions.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2/40 py-12 text-center">
          <div className="flex flex-col items-center gap-3 px-8">
            <p className="text-sm font-semibold">No sessions match your filters</p>
            <p className="text-sm text-muted-foreground">
              Try broadening your search or adjusting the score filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setScoreMin(0);
              }}
              className="text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Clear all filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Load more — only show when not filtering, since the filter operates
          over loaded data and loading more would expand the pool being filtered */}
      {cursor && !hasActiveFilter && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="min-w-[160px]"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </>
  );
}