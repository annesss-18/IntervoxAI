"use client";

import { useState, useCallback } from "react";
import type { SessionCardData } from "@/types";
import { SessionCard } from "@/components/organisms/SessionCard";
import { Button } from "@/components/atoms/button";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

type DashboardSessionStatus = "active" | "completed";

interface DashboardSessionListProps {
  initialSessions: SessionCardData[];
  initialCursor: string | null;
  status: DashboardSessionStatus;
  emptyState: React.ReactNode;
}

export function DashboardSessionList({
  initialSessions,
  initialCursor,
  status,
  emptyState,
}: DashboardSessionListProps) {
  const [sessions, setSessions] =
    useState<SessionCardData[]>(initialSessions);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

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

  if (sessions.length === 0 && !cursor) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>

      {cursor && (
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
