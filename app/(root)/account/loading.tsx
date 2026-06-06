import { Skeleton } from "@/components/atoms/skeleton";

export default function AccountLoading() {
  return (
    <div className="container-app py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border p-6 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>

        <div className="rounded-2xl border border-border p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}
