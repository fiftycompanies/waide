"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, AlertCircle, XCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { getInvitationByToken } from "@/lib/actions/auth-actions";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    getInvitationByToken(token).then((data) => {
      if (data) {
        // 유효한 초대 → 회원가입 페이지로 리다이렉트
        router.replace(`/signup?invite=${token}`);
      } else {
        setStatus("invalid");
      }
    });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 -mt-[57px]">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <Logo variant="light" size="lg" />
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
            <p className="text-sm text-[#888]">초대를 확인하는 중...</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <XCircle className="h-12 w-12 text-red-400" />
            <div className="text-center">
              <p className="text-white font-medium mb-1">만료된 초대 링크</p>
              <p className="text-sm text-[#888]">
                이 초대 링크는 만료되었거나 이미 사용되었습니다.
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 text-sm rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#222] transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm rounded-lg bg-[#10b981] text-white hover:bg-[#34d399] transition-colors"
              >
                홈으로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
