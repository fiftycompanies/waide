"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // ── 세션 확인 (recovery 토큰 유효성) ─────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      // hash fragment 처리 (#access_token=...&type=recovery)
      // Supabase 클라이언트가 자동으로 hash를 파싱하여 세션 설정
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setChecking(false);
    };

    // onAuthStateChange로 PASSWORD_RECOVERY 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setHasSession(true);
          setChecking(false);
        }
      }
    );

    checkSession();
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // ── 비밀번호 변경 처리 ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const isValid = password.length >= 8 && password === confirm;

  // ── 로딩 상태 ───────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
        </div>
      </div>
    );
  }

  // ── 세션 없음 → 로그인 안내 ──────────────────────────────────────
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-[#10b981]/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8">
          <div className="flex justify-center mb-6">
            <Logo variant="light" size="lg" />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            유효하지 않거나 만료된 링크입니다.
          </div>
          <p className="text-center text-sm text-[#888] mb-4">
            비밀번호 재설정 링크가 만료되었습니다.
            <br />
            로그인 페이지에서 다시 요청해주세요.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full h-11 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-white font-semibold text-sm transition-colors"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // ── 완료 ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#10b981]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            비밀번호가 변경되었습니다
          </h2>
          <p className="text-[#888] text-sm">
            대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  // ── 비밀번호 설정 폼 ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-[#10b981]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-slate-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo variant="light" size="lg" />
          </div>

          <h1 className="text-center text-lg font-bold text-white mb-1">
            새 비밀번호 설정
          </h1>
          <p className="text-center text-sm text-[#888] mb-6">
            안전한 비밀번호를 입력해주세요
          </p>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">새 비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="8자 이상 입력"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-red-400">8자 이상 입력해주세요</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full h-11 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 변경 중...
                </span>
              ) : (
                "비밀번호 변경"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
