import { Skeleton } from "@/components/ui/skeleton";

export default function PortalKeywordsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
