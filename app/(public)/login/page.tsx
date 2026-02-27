"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { unifiedLogin } from "@/lib/actions/auth-actions";

// ── 통합 로그인 폼 ────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await unifiedLogin(identifier.trim(), password);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // redirect 파라미터가 있으면 우선, 없으면 역할 기반 기본 경로
      const target = redirect.startsWith("/") ? redirect : result.redirect;
      router.push(target);
      router.refresh();
    });
  };

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-[#888]">아이디 또는 이메일</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                placeholder="admin 또는 email@example.com"
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
            disabled={isPending}
            className="w-full h-11 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> 로그인 중...
              </span>
            ) : (
              "로그인"
            )}
          </button>

          <p className="text-center text-sm text-[#666]">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-[#10b981] hover:underline">
              회원가입
            </Link>
          </p>
        </form>
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
