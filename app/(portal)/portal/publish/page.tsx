import { Loader2 } from "lucide-react";

export default function PortalPublishPage() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">발행 관리 준비 중...</p>
      </div>
    </div>
  );
}
