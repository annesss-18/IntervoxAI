"use client";

import { useMemo, useState, useCallback } from "react";
import { Container, PageHeader } from "@/components/layout/Container";
import { TemplateCard } from "@/components/organisms/TemplateCard";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { Search, Compass, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateCardData } from "@/types";

interface ExploreClientProps {
  templates: TemplateCardData[];
}

const typeFilters = ["Technical", "System Design", "Behavioral", "HR", "Mixed"];
const levelFilters = ["Junior", "Mid", "Senior", "Staff", "Executive"];

export default function ExploreClient({ templates }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set());

  const toggleFilter = useCallback(
    (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
      const next = new Set(set);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      setter(next);
    },
    [],
  );

  const activeFilterCount = activeTypes.size + activeLevels.size;

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setActiveTypes(new Set());
    setActiveLevels(new Set());
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Search filter: match against role, company, or tech stack
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          t.role?.toLowerCase().includes(q) ||
          t.companyName?.toLowerCase().includes(q) ||
          t.techStack?.some((tech) => tech.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Type filter: OR within the dimension
      if (activeTypes.size > 0 && !activeTypes.has(t.type)) {
        return false;
      }

      // Level filter: OR within the dimension
      if (activeLevels.size > 0 && !activeLevels.has(t.level)) {
        return false;
      }

      return true;
    });
  }, [templates, searchQuery, activeTypes, activeLevels]);

  const hasResults = filteredTemplates.length > 0;

  return (
    <Container>
      <PageHeader
        title="Explore Interviews"
        description="Discover community interview templates by role, stack, company, and difficulty."
      />

      <div className="mb-8 space-y-5 rounded-2xl border border-border bg-card p-5">
        {/* Search + count */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Search by role, company, or tech stack…"
              className="pl-10 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search />}
              iconRight={
                searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                ) : undefined
              }
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <SlidersHorizontal className="size-3" />
              {filteredTemplates.length}
              {searchQuery || activeFilterCount > 0 ? " matched" : " templates"}
            </Badge>
          </div>
        </div>

        {/* Type + Level filters — single row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Type:
          </span>
          {typeFilters.map((type) => {
            const isActive = activeTypes.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  toggleFilter(activeTypes, type, setActiveTypes)
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]"
                    : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                )}
              >
                {type}
              </button>
            );
          })}

          <div className="mx-1 h-4 w-px bg-border/60" />

          <span className="text-xs text-muted-foreground font-medium">
            Level:
          </span>
          {levelFilters.map((level) => {
            const isActive = activeLevels.has(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() =>
                  toggleFilter(activeLevels, level, setActiveLevels)
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "border-secondary/40 bg-secondary/10 text-secondary shadow-[0_0_8px_rgba(var(--secondary-rgb),0.15)]"
                    : "border-border bg-transparent text-muted-foreground hover:border-secondary/30 hover:bg-secondary/5 hover:text-foreground",
                )}
              >
                {level}
              </button>
            );
          })}
        </div>

        {/* Active filter summary / clear all */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
            <span className="text-xs text-muted-foreground">Active:</span>
            {Array.from(activeTypes).map((type) => (
              <Badge
                key={`type-${type}`}
                variant="primary"
                className="gap-1 text-[10px] cursor-pointer hover:opacity-80"
                onClick={() => toggleFilter(activeTypes, type, setActiveTypes)}
              >
                {type}
                <X className="size-2.5" />
              </Badge>
            ))}
            {Array.from(activeLevels).map((level) => (
              <Badge
                key={`level-${level}`}
                variant="secondary"
                className="gap-1 text-[10px] cursor-pointer hover:opacity-80"
                onClick={() =>
                  toggleFilter(activeLevels, level, setActiveLevels)
                }
              >
                {level}
                <X className="size-2.5" />
              </Badge>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-1"
            >
              <X className="size-3" />
              Clear all
            </button>
          </div>
        )}
      </div>

      {hasResults ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template, i) => (
            <div
              key={template.id}
              className={`animate-fade-up fill-both delay-${[50, 100, 150, 200, 250, 300][i % 6]}`}
            >
              <TemplateCard template={template} />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-surface-2/40 py-20 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{ background: "var(--gradient-brand-subtle)" }}
          />
          <div className="relative flex flex-col items-center gap-4 px-8">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
              <Compass className="size-8 text-muted-foreground/50" />
            </div>
            {searchQuery || activeFilterCount > 0 ? (
              <>
                <h3 className="text-lg font-semibold">No matches found</h3>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  No templates match your current filters. Try broadening your
                  search or removing some filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">No templates yet</h3>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Create and publish the first template to start a collaborative
                  interview library.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
