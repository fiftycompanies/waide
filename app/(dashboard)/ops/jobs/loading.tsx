import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
