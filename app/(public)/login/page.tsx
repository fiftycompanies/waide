"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, AlertCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { unifiedLogin } from "@/lib/actions/auth-actions";
import { createClient } from "@/lib/supabase/client";

// ── 에러 메시지 매핑 ──────────────────────────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  no_client: "계정에 연결된 업체가 없습니다. 관리자에게 문의하세요.",
  no_code: "인증 코드를 받지 못했습니다. 다시 시도해주세요.",
  auth_failed: "소셜 로그인에 실패했습니다. 다시 시도해주세요.",
};

// ── 구글 로고 SVG ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ── 카카오 로고 SVG ───────────────────────────────────────────────────────
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1C4.582 1 1 3.87 1 7.404c0 2.264 1.46 4.252 3.666 5.405l-.932 3.451c-.082.303.265.548.53.374l4.122-2.72c.198.018.4.03.614.03 4.418 0 8-2.87 8-6.54C17 3.87 13.418 1 9 1z" fill="#3C1E1E"/>
    </svg>
  );
}

// ── 통합 로그인 폼 ────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";
  const urlError = searchParams.get("error") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(ERROR_MESSAGES[urlError] || "");
  const [isPending, startTransition] = useTransition();
  const [oauthLoading, setOauthLoading] = useState<"google" | "kakao" | null>(null);

  // ── 이메일/비밀번호 로그인 ──────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await unifiedLogin(email.trim(), password);
        if (!result.success) {
          setError(result.error);
          return;
        }
        let target = redirectTo.startsWith("/") ? redirectTo : result.redirect;
        if (!redirectTo.startsWith("/") && typeof window !== "undefined") {
          const pendingId = localStorage.getItem("pending_analysis_id");
          if (pendingId) {
            localStorage.removeItem("pending_analysis_id");
            target = `/onboarding/refine?analysis_id=${pendingId}`;
          }
        }
        router.push(target);
        router.refresh();
      } catch {
        setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    });
  };

  // ── OAuth 로그인 (구글/카카오) ──────────────────────────────────────────
  const handleOAuth = async (provider: "google" | "kakao") => {
    setError("");
    setOauthLoading(provider);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(null);
      }
      // 성공 시 Supabase가 외부 URL로 리다이렉트하므로 여기서 끝
    } catch {
      setError("소셜 로그인 중 오류가 발생했습니다.");
      setOauthLoading(null);
    }
  };

  const isLoading = isPending || !!oauthLoading;

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo variant="light" size="lg" />
        </div>

        <p className="text-center text-sm text-[#888] mb-6">
          계정에 로그인하세요
        </p>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* 이메일/비밀번호 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-[#888]">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                placeholder="email@example.com"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-[#888]">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> 로그인 중...
              </span>
            ) : (
              "이메일로 로그인"
            )}
          </button>

          <p className="text-center text-sm text-[#555] mt-4">
            계정이 없으신가요? 담당자에게 문의하세요.
          </p>
        </form>

        {/* 구분선 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2a2a2a]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#111111] px-3 text-[#666]">또는</span>
          </div>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-3 border border-gray-200"
          >
            {oauthLoading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Google로 로그인
          </button>

          {/* 카카오 로그인 — 숨김 처리 (삭제 금지, 핸들러 유지) */}
          <button
            type="button"
            onClick={() => handleOAuth("kakao")}
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            style={{ display: "none" }}
          >
            {oauthLoading === "kakao" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KakaoIcon />
            )}
            카카오로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 -mt-[57px]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-[#10b981]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-slate-500/10 to-transparent rounded-full blur-3xl" />
      </div>
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
