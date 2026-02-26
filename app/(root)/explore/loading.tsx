import { Skeleton } from "@/components/atoms/skeleton";

export default function ExploreLoading() {
  return (
    <div className="container-app py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="rounded-2xl border border-border p-5 space-y-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-13 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-8 rounded-full" />
              <Skeleton className="h-5 w-8 rounded-full" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
