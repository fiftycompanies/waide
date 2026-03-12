"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  User,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserById,
  updateUser,
  resetUserPassword,
  updateUserStatus,
  getClientsForLinking,
  type UserDetail,
} from "@/lib/actions/user-management-actions";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "슈퍼어드민" },
  { value: "admin", label: "어드민" },
  { value: "sales", label: "영업" },
  { value: "client_owner", label: "고객(소유자)" },
  { value: "client_member", label: "고객(멤버)" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin: "bg-purple-100 text-purple-700",
  sales: "bg-blue-100 text-blue-700",
  client_owner: "bg-emerald-100 text-emerald-700",
  client_member: "bg-teal-100 text-teal-700",
};

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  // Form state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    Promise.all([
      getUserById(userId),
      getClientsForLinking(),
    ]).then(([userResult, clientsList]) => {
      if (userResult.user) {
        setUser(userResult.user);
        setFullName(userResult.user.full_name || userResult.user.name || "");
        setRole(userResult.user.role);
        setClientId(userResult.user.client_id || "");
      } else {
        toast.error(userResult.error || "사용자를 찾을 수 없습니다.");
      }
      setClients(clientsList);
      setLoading(false);
    });
  }, [userId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const result = await updateUser(userId, {
      full_name: fullName.trim() || undefined,
      role,
      client_id: clientId || null,
    });
    if (result.success) {
      toast.success("계정 정보가 수정되었습니다.");
      // Refresh user data
      const { user: updated } = await getUserById(userId);
      if (updated) setUser(updated);
    } else {
      toast.error(result.error || "수정 실패");
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!user) return;
    setResetting(true);
    const result = await resetUserPassword(user.email);
    if (result.success) {
      toast.success(`${user.email}로 비밀번호 초기화 이메일을 발송했습니다.`);
    } else {
      toast.error(result.error || "비밀번호 초기화 실패");
    }
    setResetting(false);
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setToggling(true);
    const result = await updateUserStatus(user.id, user.is_active);
    if (result.success) {
      toast.success(user.is_active ? "계정이 비활성화되었습니다." : "계정이 활성화되었습니다.");
      const { user: updated } = await getUserById(userId);
      if (updated) setUser(updated);
    } else {
      toast.error(result.error || "상태 변경 실패");
    }
    setToggling(false);
  };

  const isDirty =
    user &&
    (fullName !== (user.full_name || user.name || "") ||
      role !== user.role ||
      clientId !== (user.client_id || ""));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/ops/accounts-management")}
          className="mt-4 text-sm text-primary hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/ops/accounts-management")}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            계정 상세
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            user.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {user.is_active ? "활성" : "비활성"}
        </span>
      </div>

      {/* 기본 정보 카드 */}
      <div className="border rounded-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          기본 정보
        </h2>

        {/* 이메일 (읽기전용) */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            이메일
          </label>
          <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{user.email}</span>
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            이름
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="이름 입력"
          />
        </div>

        {/* 역할 */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            역할
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                ROLE_COLORS[role] || "bg-gray-100 text-gray-600"
              }`}
            >
              {ROLE_OPTIONS.find((r) => r.value === role)?.label || role}
            </span>
          </div>
        </div>
      </div>

      {/* 고객사 연결 카드 */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          연결된 고객사
        </h2>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">연결 없음</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {user.client_name && (
          <p className="text-xs text-muted-foreground">
            현재 연결: <span className="font-medium text-foreground">{user.client_name}</span>
          </p>
        )}
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        저장
      </button>

      {/* 계정 관리 카드 */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          계정 관리
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4 text-amber-600" />
            )}
            비밀번호 초기화 이메일 발송
          </button>

          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 ${
              user.is_active
                ? "hover:bg-red-50 hover:border-red-200 text-red-600"
                : "hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600"
            }`}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user.is_active ? (
              <ToggleLeft className="h-4 w-4" />
            ) : (
              <ToggleRight className="h-4 w-4" />
            )}
            {user.is_active ? "계정 비활성화" : "계정 활성화"}
          </button>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">계정 메타 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">가입일:</span>{" "}
            <span>{new Date(user.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">마지막 로그인:</span>{" "}
            <span>
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleDateString("ko-KR")
                : "-"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">계정 ID:</span>{" "}
            <span className="font-mono text-xs">{user.id}</span>
          </div>
          {user.auth_id && (
            <div>
              <span className="text-muted-foreground">Auth ID:</span>{" "}
              <span className="font-mono text-xs">{user.auth_id}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
