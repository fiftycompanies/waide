import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <FileQuestion className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-sm text-[#999999] mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-medium px-5 py-2.5 text-sm transition-colors"
        >
          <Home className="h-4 w-4" />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
