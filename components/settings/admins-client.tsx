"use client";

import { useState, useTransition } from "react";
import { Plus, ShieldCheck, Trash2, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  createAdminUser,
  toggleAdminStatus,
  updateAdminRole,
  deleteAdminUser,
  type AdminUser,
} from "@/lib/actions/admin-actions";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "슈퍼 어드민",
  admin: "어드민",
  viewer: "뷰어",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-amber-500/10 text-amber-700 border-amber-200",
  admin: "bg-violet-500/10 text-violet-700 border-violet-200",
  viewer: "bg-slate-500/10 text-slate-700 border-slate-200",
};

interface AdminsClientProps {
  admins: AdminUser[];
  currentAdminId: string;
}

export function AdminsClient({ admins: initialAdmins, currentAdminId }: AdminsClientProps) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [isPending, startTransition] = useTransition();

  // 생성 폼 상태
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "admin" as "admin" | "viewer",
  });

  // 삭제 확인 상태
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  function handleCreateChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    startTransition(async () => {
      const result = await createAdminUser(createForm);
      if (result.success) {
        toast.success("어드민이 생성되었습니다.");
        setShowCreateForm(false);
        setCreateForm({ username: "", password: "", displayName: "", role: "admin" });
        // 목록 갱신 (간단히 page reload 대신 낙관적 추가)
        window.location.reload();
      } else {
        setCreateError(result.error ?? "생성 실패");
      }
    });
  }

  function handleToggle(admin: AdminUser) {
    startTransition(async () => {
      const result = await toggleAdminStatus(admin.id, !admin.is_active);
      if (result.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, is_active: !a.is_active } : a))
        );
        toast.success(admin.is_active ? "비활성화했습니다." : "활성화했습니다.");
      } else {
        toast.error(result.error ?? "변경 실패");
      }
    });
  }

  function handleRoleChange(adminId: string, role: "super_admin" | "admin" | "viewer") {
    startTransition(async () => {
      const result = await updateAdminRole(adminId, role);
      if (result.success) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === adminId ? { ...a, role } : a))
        );
        toast.success("역할이 변경되었습니다.");
      } else {
        toast.error(result.error ?? "변경 실패");
      }
    });
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    const target = admins.find((a) => a.id === deleteTargetId);
    if (!target || deleteConfirm !== target.username) return;

    startTransition(async () => {
      const result = await deleteAdminUser(deleteTargetId);
      if (result.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== deleteTargetId));
        toast.success("어드민이 삭제되었습니다.");
        setDeleteTargetId(null);
        setDeleteConfirm("");
      } else {
        toast.error(result.error ?? "삭제 실패");
      }
    });
  }

  const deleteTarget = admins.find((a) => a.id === deleteTargetId);

  return (
    <div className="space-y-4">
      {/* 어드민 목록 */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            어드민 목록 ({admins.length}명)
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowCreateForm((v) => !v)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            어드민 추가
          </Button>
        </CardHeader>

        {/* 생성 폼 */}
        {showCreateForm && (
          <div className="px-6 pb-4">
            <form
              onSubmit={handleCreate}
              className="rounded-lg border border-dashed border-amber-300 bg-amber-50/30 p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-amber-800">새 어드민 추가</p>
              {createError && (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">아이디 *</Label>
                  <Input
                    name="username"
                    value={createForm.username}
                    onChange={handleCreateChange}
                    placeholder="admin2"
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">표시 이름</Label>
                  <Input
                    name="displayName"
                    value={createForm.displayName}
                    onChange={handleCreateChange}
                    placeholder="홍길동"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">비밀번호 (8자+) *</Label>
                  <Input
                    name="password"
                    type="password"
                    value={createForm.password}
                    onChange={handleCreateChange}
                    required
                    minLength={8}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">역할</Label>
                  <select
                    name="role"
                    value={createForm.role}
                    onChange={handleCreateChange}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="admin">어드민</option>
                    <option value="viewer">뷰어</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs">
                  {isPending ? "생성 중..." : "생성"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => { setShowCreateForm(false); setCreateError(null); }}>
                  취소
                </Button>
              </div>
            </form>
          </div>
        )}

        <CardContent className="pt-0">
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  admin.is_active ? "border-border/40 bg-background" : "border-border/20 bg-muted/30 opacity-60"
                }`}
              >
                {/* 아바타 이니셜 */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-400 text-white text-xs font-bold shrink-0">
                  {(admin.display_name || admin.username).charAt(0).toUpperCase()}
                </div>

                {/* 이름/아이디 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {admin.display_name || admin.username}
                    {admin.id === currentAdminId && (
                      <span className="ml-2 text-xs text-muted-foreground">(나)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">@{admin.username}</p>
                </div>

                {/* 역할 셀렉트 */}
                {admin.id !== currentAdminId ? (
                  <div className="relative">
                    <select
                      value={admin.role}
                      onChange={(e) =>
                        handleRoleChange(admin.id, e.target.value as "super_admin" | "admin" | "viewer")
                      }
                      disabled={isPending}
                      className={`appearance-none text-xs px-2 py-1 pr-6 rounded-full border font-medium cursor-pointer ${ROLE_COLORS[admin.role] ?? ""}`}
                    >
                      <option value="super_admin">슈퍼 어드민</option>
                      <option value="admin">어드민</option>
                      <option value="viewer">뷰어</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                  </div>
                ) : (
                  <Badge className={`text-xs ${ROLE_COLORS[admin.role] ?? ""}`}>
                    {ROLE_LABELS[admin.role] ?? admin.role}
                  </Badge>
                )}

                {/* 마지막 로그인 */}
                <span className="text-xs text-muted-foreground hidden md:block shrink-0">
                  {admin.last_login_at
                    ? new Date(admin.last_login_at).toLocaleDateString("ko-KR")
                    : "미로그인"}
                </span>

                {/* 활성/비활성 토글 */}
                {admin.id !== currentAdminId && (
                  <button
                    onClick={() => handleToggle(admin)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title={admin.is_active ? "비활성화" : "활성화"}
                  >
                    {admin.is_active ? (
                      <ToggleRight className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                )}

                {/* 삭제 */}
                {admin.id !== currentAdminId && (
                  <button
                    onClick={() => { setDeleteTargetId(admin.id); setDeleteConfirm(""); }}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-red-600">어드민 삭제</h2>
            <p className="text-sm text-muted-foreground">
              <strong>{deleteTarget.display_name || deleteTarget.username}</strong> 어드민을 삭제합니다.
              확인을 위해 아이디 <strong className="text-foreground">{deleteTarget.username}</strong>을 입력하세요.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget.username}
              className="border-red-300 focus-visible:ring-red-400"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirm !== deleteTarget.username || isPending}
                className="flex-1"
              >
                {isPending ? "삭제 중..." : "삭제"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setDeleteTargetId(null); setDeleteConfirm(""); }}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
