"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Star, Loader2, CheckCircle2, XCircle, ExternalLink, Globe } from "lucide-react";
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
import type { BlogAccount, HomepageBlogStatus } from "@/lib/actions/blog-account-actions";
import {
  createBlogAccount,
  updateBlogAccount,
  deleteBlogAccount,
  registerHomepageBlogAccount,
} from "@/lib/actions/blog-account-actions";
import {
  testBlogConnection,
  createApiKeyAccount,
  setDefaultAccount,
} from "@/lib/actions/publish-actions";
import type { AccountGrade } from "@/lib/actions/recommendation-actions";
import { BrandBadge } from "@/components/ui/brand-badge";
import { BrandFilter } from "@/components/ui/brand-filter";
import { useRouter, useSearchParams } from "next/navigation";

// ── 상수 ──────────────────────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  naver:     "네이버 블로그",
  tistory:   "티스토리",
  wordpress: "워드프레스",
  medium:    "미디엄",
};

const PLATFORM_ICONS: Record<string, string> = {
  naver:     "🟢",
  tistory:   "🟠",
  wordpress: "🔵",
  medium:    "⚫",
};

const SCORE_COLORS: Record<string, string> = {
  최적:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  준최적: "bg-blue-100 text-blue-700 border-blue-200",
  저품질: "bg-red-100 text-red-700 border-red-200",
  미확인: "bg-gray-100 text-gray-500 border-gray-200",
};

const AUTH_LABELS: Record<string, string> = {
  manual: "수동",
  oauth:  "OAuth",
  api_key: "API키",
};

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ── 기존 계정 추가/수정 다이얼로그 (네이버 등 수동 등록용) ──────────────────
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
          <DialogTitle>{isEdit ? "계정 수정" : "수동 계정 추가 (네이버 등)"}</DialogTitle>
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
              <option value="brunch">브런치</option>
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

// ── API 계정 연동 다이얼로그 (WordPress API / Medium Token) ──
interface ApiAccountDialogProps {
  clientId: string;
  open: boolean;
  onClose: () => void;
}

function ApiAccountDialog({ clientId, open, onClose }: ApiAccountDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [platform, setPlatform] = useState<"wordpress" | "medium">("wordpress");
  const [testResult, setTestResult] = useState<{ success: boolean; info?: string; error?: string } | null>(null);

  // WordPress fields
  const [wpUrl, setWpUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpPassword, setWpPassword] = useState("");
  const [wpName, setWpName] = useState("");

  // Medium fields
  const [mediumToken, setMediumToken] = useState("");
  const [mediumName, setMediumName] = useState("");

  function resetFields() {
    setTestResult(null);
    setWpUrl(""); setWpUsername(""); setWpPassword(""); setWpName("");
    setMediumToken(""); setMediumName("");
  }

  function handleTest() {
    startTransition(async () => {
      setTestResult(null);
      let result;

      if (platform === "wordpress") {
        result = await testBlogConnection({
          platform: "wordpress",
          blogUrl: wpUrl,
          apiKey: wpUsername,
          apiSecret: wpPassword,
        });
      } else if (platform === "medium") {
        result = await testBlogConnection({
          platform: "medium",
          apiKey: mediumToken,
        });
      } else {
        return;
      }

      setTestResult(result);
      if (result.success) {
        toast.success(result.info || "연동 성공!");
      } else {
        toast.error(result.error || "연동 실패");
      }
    });
  }

  function handleSave() {
    startTransition(async () => {
      let result;

      if (platform === "wordpress") {
        if (!wpUrl || !wpUsername || !wpPassword) {
          toast.error("모든 필드를 입력해주세요.");
          return;
        }
        result = await createApiKeyAccount({
          clientId,
          platform: "wordpress",
          accountName: wpName || wpUrl.replace(/https?:\/\//, "").replace(/\/$/, ""),
          blogUrl: wpUrl,
          apiKey: wpUsername,
          apiSecret: wpPassword,
        });
      } else if (platform === "medium") {
        if (!mediumToken) {
          toast.error("Integration Token을 입력해주세요.");
          return;
        }
        result = await createApiKeyAccount({
          clientId,
          platform: "medium",
          accountName: mediumName || "Medium",
          apiKey: mediumToken,
        });
      } else {
        return;
      }

      if (result?.success) {
        toast.success("계정이 연동되었습니다.");
        onClose();
        resetFields();
        router.refresh();
      } else {
        toast.error(result?.error ?? "연동 실패");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetFields(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>블로그 계정 연동</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* 플랫폼 선택 */}
          <div className="space-y-1.5">
            <Label>플랫폼 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["wordpress", "medium"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPlatform(p); setTestResult(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    platform === p
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-border hover:border-violet-200 text-muted-foreground"
                  }`}
                >
                  <span>{PLATFORM_ICONS[p]}</span>
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              네이버·티스토리는 API를 지원하지 않아 수동 발행만 가능합니다.
            </p>
          </div>

          {/* WordPress API Key */}
          {platform === "wordpress" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>계정 이름 (표시용)</Label>
                <Input
                  placeholder="예: 회사 블로그"
                  value={wpName}
                  onChange={(e) => setWpName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>사이트 URL *</Label>
                <Input
                  placeholder="https://myblog.com"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>사용자명 *</Label>
                <Input
                  placeholder="admin"
                  value={wpUsername}
                  onChange={(e) => setWpUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>앱 비밀번호 *</Label>
                <Input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={wpPassword}
                  onChange={(e) => setWpPassword(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  WordPress 관리자 &gt; 사용자 &gt; 프로필 &gt; 앱 비밀번호에서 생성
                </p>
              </div>
            </div>
          )}

          {/* Medium Token */}
          {platform === "medium" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>계정 이름 (표시용)</Label>
                <Input
                  placeholder="예: Medium"
                  value={mediumName}
                  onChange={(e) => setMediumName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Integration Token *</Label>
                <Input
                  type="password"
                  placeholder="토큰을 입력하세요"
                  value={mediumToken}
                  onChange={(e) => setMediumToken(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Medium &gt; Settings &gt; Security and apps &gt; Integration tokens에서 발급
                </p>
              </div>
            </div>
          )}

          {/* 연동 테스트 결과 */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              testResult.success
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.success ? testResult.info : testResult.error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { onClose(); resetFields(); }} disabled={isPending}>
            취소
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            연동 테스트
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isPending ? "처리 중..." : "저장"}
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
  homepageBlogStatus?: HomepageBlogStatus;
}

export function BlogAccountsClient({ accounts, accountGrades = [], clientId, homepageBlogStatus }: BlogAccountsClientProps) {
  const isAllMode = !clientId;
  const gradeMap = new Map(accountGrades.map((g) => [g.account_id, g]));
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [apiAddOpen, setApiAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BlogAccount | null>(null);

  // URL 파라미터로 연동 결과 표시
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "tistory_connected") {
      toast.success("Tistory 계정이 연동되었습니다!");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        tistory_no_code: "Tistory 인증 코드를 받지 못했습니다.",
        tistory_no_client: "클라이언트 정보가 없습니다. 다시 시도해주세요.",
        tistory_not_configured: "Tistory API 키가 설정되지 않았습니다.",
        tistory_token_failed: "Tistory 토큰 발급에 실패했습니다.",
        tistory_blog_info_failed: "Tistory 블로그 정보 조회에 실패했습니다.",
        tistory_save_failed: "Tistory 계정 저장에 실패했습니다.",
        tistory_callback_error: "Tistory 연동 중 오류가 발생했습니다.",
      };
      toast.error(errorMessages[error] || `연동 오류: ${error}`);
    }
  }, [searchParams]);

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

  function handleSetDefault(acc: BlogAccount) {
    if (!clientId) return;
    startTransition(async () => {
      const result = await setDefaultAccount(acc.id, clientId);
      if (result.success) {
        toast.success(`${acc.account_name}을(를) 기본 계정으로 설정했습니다.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "설정 실패");
      }
    });
  }

  function handleConnectHomepageBlog() {
    if (!clientId) return;
    startTransition(async () => {
      const result = await registerHomepageBlogAccount(clientId);
      if (result.success) {
        toast.success("홈페이지 블로그가 연결되었습니다.");
        router.refresh();
      } else {
        toast.error(result.error ?? "연결 실패");
      }
    });
  }

  return (
    <>
      {/* 홈페이지 블로그 카드 */}
      {homepageBlogStatus?.hasHomepage && homepageBlogStatus.isLive && !isAllMode && (
        <div className="rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium text-sm">홈페이지 블로그</p>
                <p className="text-xs text-muted-foreground">
                  {homepageBlogStatus.subdomain
                    ? `${homepageBlogStatus.subdomain}.waide.kr/blog`
                    : "홈페이지 블로그"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {homepageBlogStatus.blogConnected ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  자동 발행 활성화됨
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectHomepageBlog}
                  disabled={isPending}
                  className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  연결
                </Button>
              )}
              {homepageBlogStatus.deploymentUrl && (
                <a
                  href={`${homepageBlogStatus.deploymentUrl}/blog`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-800"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddOpen(true)}
              className="gap-1.5 h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              수동 등록
            </Button>
            <Button
              size="sm"
              onClick={() => setApiAddOpen(true)}
              className="gap-1.5 h-8 bg-violet-600 hover:bg-violet-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              API 연동
            </Button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      {displayedAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">등록된 블로그 계정이 없습니다</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            [API 연동]으로 WordPress/Medium을 연결하거나, [수동 등록]으로 네이버/티스토리 계정을 추가하세요.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
                {isAllMode && <th className="px-4 py-3 text-left">브랜드</th>}
                <th className="px-4 py-3 text-left">계정명</th>
                <th className="px-4 py-3 text-center">플랫폼</th>
                <th className="px-4 py-3 text-center">등급</th>
                <th className="px-4 py-3 text-center">점수</th>
                <th className="px-4 py-3 text-left">블로그URL</th>
                <th className="px-4 py-3 text-center">인증</th>
                <th className="px-4 py-3 text-center">기본</th>
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
                  <td className="px-4 py-3 text-center text-xs">
                    <span className="whitespace-nowrap">
                      {PLATFORM_ICONS[acc.platform] ?? ""} {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                    </span>
                  </td>
                  {/* 등급 배지 */}
                  <td className="px-4 py-3 text-center">
                    {grade ? (
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold ${GRADE_COLORS[grade.grade] ?? ""}`}>
                        {grade.grade}
                      </span>
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
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {AUTH_LABELS[acc.auth_type ?? "manual"] ?? acc.auth_type}
                      </Badge>
                      {(acc.platform === "naver" || acc.platform === "tistory") && (acc.auth_type ?? "manual") === "manual" && (
                        <Badge variant="outline" className="text-[9px] px-1 border-amber-200 bg-amber-50 text-amber-600">
                          수동 발행
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {acc.is_default ? (
                      <Star className="h-4 w-4 text-amber-500 mx-auto fill-amber-500" />
                    ) : (
                      <button
                        onClick={() => handleSetDefault(acc)}
                        disabled={isPending || isAllMode}
                        className="text-muted-foreground/40 hover:text-amber-500 transition-colors disabled:opacity-30"
                        title="기본 계정으로 설정"
                      >
                        <Star className="h-4 w-4 mx-auto" />
                      </button>
                    )}
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
        <>
          <AccountDialog clientId={clientId} open={addOpen} onClose={() => setAddOpen(false)} />
          <ApiAccountDialog clientId={clientId} open={apiAddOpen} onClose={() => setApiAddOpen(false)} />
        </>
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
