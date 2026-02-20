import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/actions/ops-actions";

interface JobStatusBadgeProps {
  status: JobStatus;
}

const statusConfig: Record<
  JobStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  PENDING: {
    label: "대기 중",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  IN_PROGRESS: {
    label: "진행 중",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    pulse: true,
  },
  DONE: {
    label: "완료",
    className:
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  FAILED: {
    label: "실패",
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  },
  CANCELLED: {
    label: "취소됨",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100",
  },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <Badge
      variant="outline"
      className={`${config.className} font-medium text-xs ${
        config.pulse ? "animate-pulse" : ""
      }`}
    >
      {config.label}
    </Badge>
  );
}
