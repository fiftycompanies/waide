"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { portalSignOut } from "@/lib/actions/auth-actions";

export function PortalPendingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await portalSignOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full text-center">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex justify-center mb-6">
            <Logo variant="dark" size="lg" />
          </div>

          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
          </div>

          <h1 className="text-lg font-bold text-gray-900 mb-2">
            계정 설정 대기 중
          </h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            관리자가 회원님의 계정에 업체를 연결하면
            <br />
            포털을 이용하실 수 있습니다.
          </p>

          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
