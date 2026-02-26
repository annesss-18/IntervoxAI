"use client";

import { useMemo, useState } from "react";
import { Container, PageHeader } from "@/components/layout/Container";
import { TemplateCard } from "@/components/organisms/TemplateCard";
import { Input } from "@/components/atoms/input";
import { Badge } from "@/components/atoms/badge";
import { Search, Compass, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateCardData } from "@/types";

interface ExploreClientProps {
  templates: TemplateCardData[];
}

const quickFilters = [
  { label: "Frontend", color: "primary" },
  { label: "Backend", color: "secondary" },
  { label: "System Design", color: "accent" },
  { label: "Behavioral", color: "primary" },
  { label: "Senior", color: "secondary" },
  { label: "React", color: "accent" },
];

export default function ExploreClient({ templates }: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase().trim();
    return templates.filter(
      (t) =>
        t.role?.toLowerCase().includes(q) ||
        t.companyName?.toLowerCase().includes(q) ||
        t.techStack?.some((tech) => tech.toLowerCase().includes(q)) ||
        t.type?.toLowerCase().includes(q) ||
        t.level?.toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

  const hasResults = filteredTemplates.length > 0;

  return (
    <Container>
      <PageHeader
        title="Explore Interviews"
        description="Find ready-to-run interview templates by role, stack, company, and difficulty."
      />

      <div className="mb-8 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Search by role, company, stack, or level…"
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
              <Filter className="size-3" />
              {filteredTemplates.length}
              {searchQuery ? " matched" : " templates"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Quick filters:
          </span>
          {quickFilters.map((filter) => {
            const isActive =
              searchQuery.toLowerCase() === filter.label.toLowerCase();
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setSearchQuery(isActive ? "" : filter.label)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            );
          })}
          {searchQuery &&
            !quickFilters.some(
              (f) => f.label.toLowerCase() === searchQuery.toLowerCase(),
            ) && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <X className="size-3" />
                Clear
              </button>
            )}
        </div>
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
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold">No matches found</h3>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  No templates matched &ldquo;{searchQuery}&rdquo;. Try a
                  broader keyword — role type, stack name, or experience level.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                  Clear search
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
