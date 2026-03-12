import { Skeleton } from "@/components/atoms/skeleton";

export default function TemplateLoading() {
  return (
    <div className="container-app py-8 space-y-5">
      <Skeleton className="h-4 w-36" />

      <div className="rounded-2xl border border-border">
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-5 sm:p-6 space-y-3 lg:border-r lg:border-border/50">
            <Skeleton className="h-5 w-32 rounded-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-xl shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <Skeleton className="h-7 w-72" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-2 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-7 rounded-md" />
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 lg:min-w-[240px] lg:max-w-[280px]">
            <div className="grid grid-cols-2 gap-2.5">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="space-y-1.5 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="size-3.5 rounded" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-2xl border border-border p-6 space-y-3">
          <div className="flex items-center gap-2.5 mb-2 pb-3 border-b border-border/50">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-4 ${i === 2 ? "w-3/4" : "w-full"}`}
            />
          ))}
          <div className="h-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={`p2-${i}`}
              className={`h-4 ${i === 3 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-5 w-20 rounded-full" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 py-2">
                <Skeleton className="h-3 w-4 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
