import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ServiceCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden rounded-3xl border-slate-200/80 bg-white">
      {/* Image Skeleton */}
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Content Skeleton */}
      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>

        <Skeleton className="h-5 w-4/5 rounded-md" />
        <Skeleton className="h-3.5 w-1/2 rounded-md" />

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-14 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
      </div>
    </Card>
  );
}
