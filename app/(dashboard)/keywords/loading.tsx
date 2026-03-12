import { Skeleton } from "@/components/ui/skeleton";

export default function KeywordsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
