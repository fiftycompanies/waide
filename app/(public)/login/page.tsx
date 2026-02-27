"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { portalSignIn } from "@/lib/actions/auth-actions";
import { adminLogin } from "@/lib/actions/admin-actions";

// ── 고객 로그인 폼 ────────────────────────────────────────────────────────
function CustomerLoginForm({ redirect: redirectTo }: { redirect: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await portalSignIn(email, password);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // 역할에 따라 리다이렉트
      if (result.role === "client_owner" || result.role === "client_member") {
        router.push(redirectTo.startsWith("/portal") ? redirectTo : "/portal");
      } else {
        router.push(redirectTo.startsWith("/ops") ? redirectTo : "/ops/dashboard");
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm text-[#888]">이메일</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
            placeholder="email@example.com"
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
  );
}

// ── 어드민 로그인 폼 (기존 로직 유지) ────────────────────────────────────
function AdminLoginForm() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    startTransition(async () => {
      const result = await adminLogin(null, formData);
      if (result?.error) {
        setError(result.error);
      }
      // adminLogin handles redirect internally
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm text-[#888]">아이디</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
          <input
            name="username"
            type="text"
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="admin"
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
            name="password"
            type="password"
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> 로그인 중...
          </span>
        ) : (
          "어드민 로그인"
        )}
      </button>
    </form>
  );
}

// ── 통합 로그인 페이지 ────────────────────────────────────────────────────
function LoginContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "admin" ? "admin" : "customer";
  const redirect = searchParams.get("redirect") || "/portal";
  const [mode, setMode] = useState<"customer" | "admin">(initialMode);

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo variant="light" size="lg" />
        </div>

        {/* Mode tabs */}
        <div className="flex mb-6 rounded-lg bg-[#1a1a1a] p-1">
          <button
            onClick={() => setMode("customer")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "customer"
                ? "bg-[#10b981] text-white"
                : "text-[#888] hover:text-white"
            }`}
          >
            고객 로그인
          </button>
          <button
            onClick={() => setMode("admin")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "admin"
                ? "bg-amber-500 text-slate-900"
                : "text-[#888] hover:text-white"
            }`}
          >
            어드민
          </button>
        </div>

        {/* Form */}
        {mode === "customer" ? (
          <CustomerLoginForm redirect={redirect} />
        ) : (
          <AdminLoginForm />
        )}
      </div>
    </div>
  );
}

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
        <LoginContent />
      </Suspense>
    </div>
  );
}
