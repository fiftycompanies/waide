"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BlogAccount } from "@/lib/actions/blog-account-actions";
import {
  createBlogAccount,
  updateBlogAccount,
  deleteBlogAccount,
} from "@/lib/actions/blog-account-actions";
import type { AccountGrade } from "@/lib/actions/recommendation-actions";
import { BrandBadge } from "@/components/ui/brand-badge";
import { BrandFilter } from "@/components/ui/brand-filter";
import { useRouter } from "next/navigation";

// ── 상수 ──────────────────────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  naver:     "네이버 블로그",
  tistory:   "티스토리",
  wordpress: "워드프레스",
};

const SCORE_COLORS: Record<string, string> = {
  최적:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  준최적: "bg-blue-100 text-blue-700 border-blue-200",
  저품질: "bg-red-100 text-red-700 border-red-200",
  미확인: "bg-gray-100 text-gray-500 border-gray-200",
};

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ── 계정 추가/수정 다이얼로그 ─────────────────────────────────────────────────
interface AccountDialogProps {
  clientId: string;
  account?: BlogAccount | null;
  open: boolean;
  onClose: () => void;
}

function AccountDialog({ clientId, account, open, onClose }: AccountDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    accountName: account?.account_name ?? "",
    platform:    account?.platform ?? "naver",
    blogUrl:     account?.blog_url ?? "",
    blogScore:   account?.blog_score ?? "미확인",
    fixedIp:     account?.fixed_ip ?? "",
  });

  const isEdit = !!account;

  function handleSubmit() {
    if (!form.accountName.trim()) {
      toast.error("계정명을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const result = isEdit
        ? await updateBlogAccount(account!.id, {
            accountName: form.accountName,
            platform:    form.platform,
            blogUrl:     form.blogUrl,
            blogScore:   form.blogScore,
            fixedIp:     form.fixedIp,
          })
        : await createBlogAccount({
            clientId,
            accountName: form.accountName,
            platform:    form.platform,
            blogUrl:     form.blogUrl,
            blogScore:   form.blogScore,
            fixedIp:     form.fixedIp,
          });

      if (result.success) {
        toast.success(isEdit ? "계정이 수정되었습니다." : "계정이 등록되었습니다.");
        onClose();
        router.refresh();
      } else {
        toast.error(result.error ?? "처리 실패");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "계정 수정" : "블로그 계정 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">계정명 *</Label>
            <Input
              id="acc-name"
              placeholder="예: camfit, wighks6970"
              value={form.accountName}
              onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-platform">플랫폼</Label>
            <select
              id="acc-platform"
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className={selectCls}
            >
              <option value="naver">네이버 블로그</option>
              <option value="tistory">티스토리</option>
              <option value="wordpress">워드프레스</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-url">블로그 URL (선택)</Label>
            <Input
              id="acc-url"
              placeholder="https://blog.naver.com/계정명"
              value={form.blogUrl}
              onChange={(e) => setForm((f) => ({ ...f, blogUrl: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-score">블로그 지수</Label>
              <select
                id="acc-score"
                value={form.blogScore}
                onChange={(e) => setForm((f) => ({ ...f, blogScore: e.target.value }))}
                className={selectCls}
              >
                <option value="최적">최적</option>
                <option value="준최적">준최적</option>
                <option value="저품질">저품질</option>
                <option value="미확인">미확인</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-ip">고정 IP (선택)</Label>
              <Input
                id="acc-ip"
                placeholder="예: 121.182.100.1"
                value={form.fixedIp}
                onChange={(e) => setForm((f) => ({ ...f, fixedIp: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
            {isPending ? "처리 중..." : isEdit ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const GRADE_COLORS: Record<string, string> = {
  S: "bg-violet-100 text-violet-700 border-violet-300",
  A: "bg-blue-100 text-blue-700 border-blue-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-gray-100 text-gray-600 border-gray-200",
};

// ── 메인 클라이언트 컴포넌트 ──────────────────────────────────────────────────
interface BlogAccountsClientProps {
  accounts: BlogAccount[];
  accountGrades?: AccountGrade[];
  clientId: string | null;
}

export function BlogAccountsClient({ accounts, accountGrades = [], clientId }: BlogAccountsClientProps) {
  const isAllMode = !clientId;
  const gradeMap = new Map(accountGrades.map((g) => [g.account_id, g]));
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BlogAccount | null>(null);

  // 브랜드 필터 (전체 모드)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const brandList = useMemo(() => {
    const seen = new Map<string, string>();
    accounts.forEach((a) => {
      if (a.client_id && a.client_name && !seen.has(a.client_id)) {
        seen.set(a.client_id, a.client_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [accounts]);
  const displayedAccounts = isAllMode && selectedBrands.length > 0
    ? accounts.filter((a) => a.client_id && selectedBrands.includes(a.client_id))
    : accounts;

  function handleToggleActive(acc: BlogAccount) {
    startTransition(async () => {
      const result = await updateBlogAccount(acc.id, { isActive: !acc.is_active });
      if (result.success) {
        toast.success(acc.is_active ? "계정이 비활성화되었습니다." : "계정이 활성화되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "변경 실패");
      }
    });
  }

  function handleDelete(acc: BlogAccount) {
    if (!confirm(`"${acc.account_name}" 계정을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const result = await deleteBlogAccount(acc.id);
      if (result.success) {
        toast.success("계정이 삭제되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "삭제 실패");
      }
    });
  }

  return (
    <>
      {/* 브랜드 필터 */}
      {isAllMode && brandList.length > 1 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3">
          <BrandFilter brands={brandList} selected={selectedBrands} onChange={setSelectedBrands} />
        </div>
      )}

      {/* 상단 액션바 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">총 {displayedAccounts.length}개 계정</p>
        {!isAllMode && (
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            계정 추가
          </Button>
        )}
      </div>

      {/* 테이블 */}
      {displayedAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">등록된 블로그 계정이 없습니다</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            [+ 계정 추가] 버튼으로 발행 계정을 등록하세요.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
                {isAllMode && <th className="px-4 py-3 text-left">브랜드</th>}
                <th className="px-4 py-3 text-left">계정명</th>
                <th className="px-4 py-3 text-center">등급</th>
                <th className="px-4 py-3 text-center">점수</th>
                <th className="px-4 py-3 text-center">플랫폼</th>
                <th className="px-4 py-3 text-left">블로그URL</th>
                <th className="px-4 py-3 text-center">블로그지수</th>
                <th className="px-4 py-3 text-center">고정IP</th>
                <th className="px-4 py-3 text-center">상태</th>
                <th className="px-4 py-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayedAccounts.map((acc) => {
                const grade = gradeMap.get(acc.id);
                return (
                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                  {isAllMode && (
                    <td className="px-4 py-3">
                      {acc.client_name ? (
                        <BrandBadge name={acc.client_name} />
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span>{acc.account_name}</span>
                      {grade?.grade_change_reason && grade.previous_grade !== grade.grade && (
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{grade.grade_change_reason}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                  </td>
                  {/* 등급 배지 */}
                  <td className="px-4 py-3 text-center">
                    {grade ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold ${GRADE_COLORS[grade.grade] ?? ""}`}>
                          {grade.grade}
                          {grade.previous_grade && grade.previous_grade !== grade.grade && (
                            <span className="ml-0.5 text-[9px]">
                              {["S","A","B","C"].indexOf(grade.grade) < ["S","A","B","C"].indexOf(grade.previous_grade) ? "↑" : "↓"}
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                  {/* 점수 */}
                  <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">
                    {grade ? grade.account_score.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {acc.blog_url ? (
                      <a
                        href={acc.blog_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:underline truncate max-w-[200px] inline-block"
                      >
                        {acc.blog_url}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {acc.blog_score ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 ${SCORE_COLORS[acc.blog_score] ?? ""}`}
                      >
                        {acc.blog_score}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground font-mono">
                    {acc.fixed_ip ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 ${
                        acc.is_active
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {acc.is_active ? "활성" : "비활성"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditTarget(acc)}
                        title="수정"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(acc)}
                        disabled={isPending}
                        title={acc.is_active ? "비활성화" : "활성화"}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {acc.is_active ? (
                          <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(acc)}
                        title="삭제"
                        className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 다이얼로그 */}
      {clientId && (
        <AccountDialog
          clientId={clientId}
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editTarget && clientId && (
        <AccountDialog
          clientId={clientId}
          account={editTarget}
          open={true}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
