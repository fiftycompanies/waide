"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coins, ArrowUpCircle, ArrowDownCircle, Settings, Search, Gift, Loader2 } from "lucide-react";
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
import type { ClientPointSummary, PointTransaction } from "@/lib/actions/point-actions";
import {
  grantPoints,
  revokePoints,
  updatePointSettings,
} from "@/lib/actions/point-actions";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PointsPageClientProps {
  clientPoints: ClientPointSummary[];
  transactions: PointTransaction[];
  settings: Array<{
    id: string;
    setting_key: string;
    setting_value: number;
    description: string | null;
  }>;
}

type TabType = "balances" | "history" | "settings";

const TYPE_LABELS: Record<string, { text: string; color: string }> = {
  grant: { text: "부여", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  spend: { text: "사용", color: "bg-blue-100 text-blue-700 border-blue-200" },
  revoke: { text: "회수", color: "bg-red-100 text-red-700 border-red-200" },
  signup_bonus: { text: "가입", color: "bg-violet-100 text-violet-700 border-violet-200" },
};

const HISTORY_FILTERS = [
  { label: "전체", value: "" },
  { label: "부여", value: "grant" },
  { label: "사용", value: "spend" },
  { label: "회수", value: "revoke" },
  { label: "가입보너스", value: "signup_bonus" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function PointsPageClient({ clientPoints, transactions, settings }: PointsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>("balances");
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [modalMode, setModalMode] = useState<"grant" | "revoke" | null>(null);
  const [modalClient, setModalClient] = useState<ClientPointSummary | null>(null);
  const [modalAmount, setModalAmount] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // 설정 상태
  const signupBonusSetting = settings.find((s) => s.setting_key === "signup_bonus");
  const costPerContentSetting = settings.find((s) => s.setting_key === "cost_per_content");
  const [signupBonus, setSignupBonus] = useState(String(signupBonusSetting?.setting_value ?? 3));
  const [costPerContent, setCostPerContent] = useState(String(costPerContentSetting?.setting_value ?? 1));

  // 검색 필터
  const filteredPoints = clientPoints.filter((p) =>
    !search || p.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter((t) =>
    (!historyFilter || t.type === historyFilter) &&
    (!search || (t.client_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  function openModal(client: ClientPointSummary, mode: "grant" | "revoke") {
    setModalClient(client);
    setModalMode(mode);
    setModalAmount("");
    setModalDescription("");
  }

  function handleModalSubmit() {
    if (!modalClient || !modalMode) return;
    const amount = parseInt(modalAmount);
    if (!amount || amount <= 0) {
      toast.error("수량을 입력해주세요");
      return;
    }
    if (!modalDescription.trim()) {
      toast.error("사유를 입력해주세요");
      return;
    }

    startTransition(async () => {
      // admin user id — 간단히 처리 (실제로는 세션에서 가져와야 함)
      const adminId = "system";
      const fn = modalMode === "grant" ? grantPoints : revokePoints;
      const result = await fn(modalClient.client_id, amount, modalDescription.trim(), adminId);
      if (result.success) {
        toast.success(modalMode === "grant" ? `${amount} 포인트 부여 완료` : `${amount} 포인트 회수 완료`);
        setModalMode(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "처리 실패");
      }
    });
  }

  function handleSettingsSave() {
    const sb = parseInt(signupBonus);
    const cpc = parseInt(costPerContent);
    if (isNaN(sb) || sb < 0) { toast.error("가입 보너스 값이 올바르지 않습니다"); return; }
    if (isNaN(cpc) || cpc < 1) { toast.error("콘텐츠당 포인트는 1 이상이어야 합니다"); return; }

    startTransition(async () => {
      const result = await updatePointSettings([
        { key: "signup_bonus", value: sb },
        { key: "cost_per_content", value: cpc },
      ]);
      if (result.success) {
        toast.success("설정이 저장되었습니다");
        router.refresh();
      } else {
        toast.error(result.error ?? "저장 실패");
      }
    });
  }

  const tabs: Array<{ key: TabType; label: string; icon: React.ElementType }> = [
    { key: "balances", label: "고객별 잔액", icon: Coins },
    { key: "history", label: "거래 이력", icon: ArrowUpCircle },
    { key: "settings", label: "설정", icon: Settings },
  ];

  return (
    <>
      {/* 탭 */}
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setSearch(""); }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 검색 */}
      {activeTab !== "settings" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="고객명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      )}

      {/* ═══ Tab 1: 고객별 잔액 ═══ */}
      {activeTab === "balances" && (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">고객</th>
                <th className="px-4 py-3 text-right font-medium">잔액</th>
                <th className="px-4 py-3 text-right font-medium">적립</th>
                <th className="px-4 py-3 text-right font-medium">사용</th>
                <th className="px-4 py-3 text-center font-medium">최근 사용일</th>
                <th className="px-4 py-3 text-center font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    포인트 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                filteredPoints.map((p) => (
                  <tr key={p.client_id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.client_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${p.balance > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {p.balance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.total_earned}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.total_spent}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {p.last_used_at
                        ? new Date(p.last_used_at).toLocaleDateString("ko-KR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(p, "grant")}
                          className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <ArrowUpCircle className="h-3 w-3" />
                          부여
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(p, "revoke")}
                          className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <ArrowDownCircle className="h-3 w-3" />
                          회수
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Tab 2: 거래 이력 ═══ */}
      {activeTab === "history" && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {HISTORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setHistoryFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  historyFilter === f.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">일시</th>
                  <th className="px-4 py-3 text-left font-medium">고객</th>
                  <th className="px-4 py-3 text-center font-medium">유형</th>
                  <th className="px-4 py-3 text-right font-medium">수량</th>
                  <th className="px-4 py-3 text-left font-medium">사유</th>
                  <th className="px-4 py-3 text-center font-medium">처리자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      거래 이력이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const typeInfo = TYPE_LABELS[tx.type] || { text: tx.type, color: "" };
                    return (
                      <tr key={tx.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-sm">{tx.client_name}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>
                            {typeInfo.text}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tx.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {tx.granted_by_name || (tx.type === "spend" ? "—" : "시스템")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ Tab 3: 설정 ═══ */}
      {activeTab === "settings" && (
        <div className="max-w-lg rounded-lg border border-border/60 p-6 space-y-6">
          <h3 className="font-semibold">포인트 정책 설정</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-violet-500" />
                가입 시 무료 포인트
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={signupBonus}
                  onChange={(e) => setSignupBonus(e.target.value)}
                  className="w-24"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">건 (콘텐츠 무료 생성 가능)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                콘텐츠 1건당 차감 포인트
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={costPerContent}
                  onChange={(e) => setCostPerContent(e.target.value)}
                  className="w-24"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">포인트</span>
              </div>
            </div>
          </div>

          <Button onClick={handleSettingsSave} disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            설정 저장
          </Button>
        </div>
      )}

      {/* ═══ 부여/회수 모달 ═══ */}
      <Dialog open={!!modalMode} onOpenChange={(v) => { if (!v) setModalMode(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              포인트 {modalMode === "grant" ? "부여" : "회수"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">고객: </span>
              <span className="font-medium">{modalClient?.client_name}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">현재 잔액: </span>
              <span className="font-semibold">{modalClient?.balance}</span>
            </div>
            <div className="space-y-1.5">
              <Label>{modalMode === "grant" ? "부여" : "회수"} 수량</Label>
              <Input
                type="number"
                placeholder="예: 10"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label>사유</Label>
              <Input
                placeholder={
                  modalMode === "grant"
                    ? "예: 계좌이체 10건 확인"
                    : "예: 오류 발생 회수"
                }
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)} disabled={isPending}>
              취소
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={isPending}
              className={modalMode === "grant" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isPending ? "처리 중..." : modalMode === "grant" ? "부여하기" : "회수하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
