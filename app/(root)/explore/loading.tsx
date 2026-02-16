import { Skeleton } from "@/components/atoms/skeleton";

export default function ExploreLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Search/filter bar skeleton */}
      <div className="mb-6 flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Template cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-4 h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
