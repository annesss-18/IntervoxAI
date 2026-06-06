import { Skeleton } from "@/components/atoms/skeleton";

export default function CreateLoading() {
  return (
    <div className="container-app py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        {/* Left column — info panel (hidden on mobile, matching page) */}
        <div className="hidden lg:block space-y-5">
          <div className="rounded-2xl border border-border p-6 space-y-4">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column — form */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-1">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 flex-1 rounded-xl" />
              </div>
              <Skeleton className="h-[180px] w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
