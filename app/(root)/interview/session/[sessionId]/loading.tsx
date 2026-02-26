import { Skeleton } from "@/components/atoms/skeleton";

export default function SessionLoading() {
  return (
    <div className="container-app py-8 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 rounded-2xl shrink-0" />
            <div className="space-y-2.5">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-1.5 pt-0.5">
                <Skeleton className="h-5 w-18 rounded-full" />
                <Skeleton className="h-5 w-22 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl border border-border bg-card"
        style={{ minHeight: "560px" }}
      >
        <div className="flex h-full min-h-[560px] items-center justify-center">
          <div className="w-full max-w-lg space-y-6 text-center px-8">
            <Skeleton className="mx-auto size-20 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="mx-auto h-7 w-48" />
              <Skeleton className="mx-auto h-4 w-72" />
            </div>
            <Skeleton className="mx-auto h-12 w-48 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
