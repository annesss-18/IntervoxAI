import { Skeleton } from "@/components/atoms/skeleton";

export default function TemplateLoading() {
  return (
    <div className="container-app py-8 space-y-5">
      <Skeleton className="h-4 w-36" />

      <div className="rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-start gap-5">
          <Skeleton className="size-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-12 w-52 rounded-full shrink-0" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="rounded-2xl border border-border p-6 space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-10 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
