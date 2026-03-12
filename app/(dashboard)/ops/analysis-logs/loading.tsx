import { Skeleton } from "@/components/ui/skeleton";

export default function AnalysisLogsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
