import type { ReactNode } from "react";

/**
 * Reusable empty-state placeholder used across dashboard, explore, feedback,
 * and session pages. Renders a centred icon, title, description, and optional
 * action inside a dashed-border card with a subtle brand gradient overlay.
 */
export function EmptyState({
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
