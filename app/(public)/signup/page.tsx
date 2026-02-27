"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, User, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { portalSignUp, getInvitationByToken } from "@/lib/actions/auth-actions";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invitation, setInvitation] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

  // 초대 토큰 확인
  useEffect(() => {
    if (!inviteToken) return;
    getInvitationByToken(inviteToken).then((data) => {
      setInvitation(data);
      if (data?.email) {
        setForm((prev) => ({ ...prev, email: data.email }));
      }
      setInviteLoading(false);
    });
  }, [inviteToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (form.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    startTransition(async () => {
      const result = await portalSignUp(
        form.email,
        form.password,
        form.name,
        form.phone || undefined,
        inviteToken || undefined,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.needsEmailConfirm) {
        setSuccess("이메일로 인증 링크를 보냈습니다. 이메일을 확인해주세요.");
        return;
      }

      // 자동 로그인 후 포털로 이동
      router.push("/portal");
      router.refresh();
    });
  };

  if (inviteLoading) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <Logo variant="light" size="lg" />
        </div>

        <h2 className="text-center text-lg font-semibold text-white mb-2">
          회원가입
        </h2>

        {/* 초대 정보 */}
        {invitation && (
          <div className="mb-4 p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30">
            <p className="text-sm text-[#10b981] font-medium text-center">
              {invitation.client_name
                ? `${invitation.client_name} 팀에 초대되었습니다`
                : "Waide에 초대되었습니다"}
            </p>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-[#10b981]" />
            <p className="text-sm text-[#ccc] text-center">{success}</p>
            <Link href="/login" className="text-sm text-[#10b981] hover:underline">
              로그인 페이지로 이동
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">이름 *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="홍길동"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">이메일 *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="email@example.com"
                  readOnly={!!invitation?.email}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">비밀번호 *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="6자 이상"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#888]">비밀번호 확인 *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="비밀번호 재입력"
                  minLength={6}
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
                  <Loader2 className="h-4 w-4 animate-spin" /> 가입 중...
                </span>
              ) : (
                "회원가입"
              )}
            </button>

            <p className="text-center text-sm text-[#666]">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-[#10b981] hover:underline">
                로그인
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 -mt-[57px]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-[#10b981]/10 to-transparent rounded-full blur-3xl" />
      </div>
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
          </div>
        }
      >
        <SignupContent />
      </Suspense>
    </div>
  );
}
