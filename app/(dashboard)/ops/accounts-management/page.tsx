"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllUsers,
  resetUserPassword,
  updateUserStatus,
  type ManagedUser,
} from "@/lib/actions/user-management-actions";

// ── 역할 라벨/색상 ────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: "슈퍼어드민",
  admin: "어드민",
  sales: "영업",
  client_owner: "고객(소유자)",
  client_member: "고객(멤버)",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin: "bg-purple-100 text-purple-700",
  sales: "bg-blue-100 text-blue-700",
  client_owner: "bg-emerald-100 text-emerald-700",
  client_member: "bg-teal-100 text-teal-700",
};

const FILTER_ROLES = [
  { value: "all", label: "전체" },
  { value: "super_admin", label: "슈퍼어드민" },
  { value: "admin", label: "어드민" },
  { value: "sales", label: "영업" },
  { value: "client_owner", label: "고객(소유자)" },
  { value: "client_member", label: "고객(멤버)" },
];

export default function AccountsManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    getAllUsers({ roleFilter, search })
      .then(({ users: u, total: t }) => {
        setUsers(u);
        setTotal(t);
      })
      .catch(() => {
        toast.error("계정 목록을 불러올 수 없습니다.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, search]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleResetPassword = async (user: ManagedUser) => {
    setResettingId(user.id);
    const result = await resetUserPassword(user.email);
    if (result.success) {
      toast.success(`${user.email}로 비밀번호 초기화 이메일을 발송했습니다.`);
    } else {
      toast.error(result.error || "비밀번호 초기화 실패");
    }
    setResettingId(null);
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    setTogglingId(user.id);
    const result = await updateUserStatus(user.id, user.is_active);
    if (result.success) {
      toast.success(user.is_active ? "계정이 비활성화되었습니다." : "계정이 활성화되었습니다.");
      loadUsers();
    } else {
      toast.error(result.error || "상태 변경 실패");
    }
    setTogglingId(null);
  };

  // 통계
  const activeCount = users.filter((u) => u.is_active).length;
  const clientCount = users.filter((u) => u.role === "client_owner" || u.role === "client_member").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          계정 관리
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          포털 가입 계정을 관리합니다. 비밀번호 초기화, 계정 비활성화 등의 작업을 할 수 있습니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">전체 계정</p>
          <p className="text-xl font-bold mt-1">{total}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">활성 계정</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">{activeCount}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">비활성 계정</p>
          <p className="text-xl font-bold mt-1 text-red-500">{total - activeCount}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">고객 계정</p>
          <p className="text-xl font-bold mt-1">{clientCount}</p>
        </div>
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {FILTER_ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="이메일, 이름 검색..."
              className="h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background w-48 sm:w-64"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            검색
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">등록된 계정이 없습니다</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">이메일</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">이름</th>
                  <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">역할</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">가입일</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden xl:table-cell">마지막 로그인</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">연결된 고객사</th>
                  <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">상태</th>
                  <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/ops/accounts-management/${user.id}`)}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-medium">{user.email}</span>
                    </td>
                    <td className="py-2.5 px-3 hidden md:table-cell">
                      {user.full_name || user.name || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground hidden xl:table-cell">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-xs hidden lg:table-cell">
                      {user.client_name ? (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                          {user.client_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {user.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          활성
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={resettingId === user.id}
                          title="비밀번호 초기화"
                          className="p-1.5 rounded hover:bg-muted disabled:opacity-50 transition-colors"
                        >
                          {resettingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <KeyRound className="h-4 w-4 text-amber-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingId === user.id}
                          title={user.is_active ? "비활성화" : "활성화"}
                          className="p-1.5 rounded hover:bg-muted disabled:opacity-50 transition-colors"
                        >
                          {togglingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.is_active ? (
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-red-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
