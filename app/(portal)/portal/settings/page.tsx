"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save, User, Phone, Shield, AlertCircle } from "lucide-react";
import { getPortalSettings } from "@/lib/actions/portal-actions";
import { updateUserProfile, changeUserPassword } from "@/lib/actions/auth-actions";
import { toast } from "sonner";

interface SettingsData {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    created_at: string;
  } | null;
  subscription: {
    status: string;
    mrr: number;
    started_at: string;
    expires_at: string | null;
    products: { name: string; features: unknown[] } | null;
  } | null;
  salesAgent: { name: string; phone: string; email: string } | null;
}

export default function PortalSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const el = document.querySelector("meta[name='portal-client-id']");
    const clientId = el?.getAttribute("content") || "";
    const userEl = document.querySelector("meta[name='portal-user-id']");
    const userId = userEl?.getAttribute("content") || "";

    if (clientId && userId) {
      getPortalSettings(userId, clientId).then((d) => {
        setData(d as SettingsData);
        if (d.user) {
          setProfileForm({
            name: d.user.name || "",
            phone: d.user.phone || "",
          });
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleProfileSave = () => {
    if (!data?.user) return;
    startTransition(async () => {
      const result = await updateUserProfile(data.user!.id, {
        name: profileForm.name,
        phone: profileForm.phone || undefined,
      });
      if (result.success) {
        toast.success("프로필이 저장되었습니다.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePasswordChange = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    startTransition(async () => {
      const result = await changeUserPassword(pwForm.newPassword);
      if (result.success) {
        toast.success("비밀번호가 변경되었습니다.");
        setPwForm({ newPassword: "", confirmPassword: "" });
      } else {
        toast.error(result.error);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">계정 정보를 관리하세요</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">프로필</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">이메일</label>
            <input
              value={data?.user?.email || ""}
              readOnly
              className="w-full h-10 px-3 rounded-lg border bg-gray-50 text-sm text-gray-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">이름</label>
            <input
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, name: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">전화번호</label>
            <input
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
              placeholder="010-0000-0000"
            />
          </div>
          <button
            onClick={handleProfileSave}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          비밀번호 변경
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              새 비밀번호
            </label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, newPassword: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
              placeholder="6자 이상"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              비밀번호 확인
            </label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirmPassword: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
              placeholder="비밀번호 재입력"
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
          >
            비밀번호 변경
          </button>
        </div>
      </div>

      {/* Subscription info (read-only) */}
      {data?.subscription && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            구독 정보
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">플랜</p>
              <p className="font-medium text-gray-900">
                {data.subscription.products?.name || "기본"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">상태</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                {data.subscription.status === "active" ? "활성" : data.subscription.status}
              </span>
            </div>
            <div>
              <p className="text-gray-500">시작일</p>
              <p className="text-gray-900">
                {new Date(data.subscription.started_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
            {data.subscription.expires_at && (
              <div>
                <p className="text-gray-500">만료일</p>
                <p className="text-gray-900">
                  {new Date(data.subscription.expires_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manager */}
      {data?.salesAgent && (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            담당 매니저
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{data.salesAgent.name}</p>
              <p className="text-xs text-gray-500">
                {data.salesAgent.phone || data.salesAgent.email || ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
