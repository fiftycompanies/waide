"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClientPortfolio,
  updateOnboardingChecklist,
  type ClientPortfolio,
} from "@/lib/actions/client-portfolio-actions";
import { createAdminClient } from "@/lib/supabase/service";

// Default checklist for new clients
const DEFAULT_CHECKLIST = [
  { key: "contract", label: "계약 완료", done: false },
  { key: "client_register", label: "클라이언트 등록", done: false },
  { key: "portal_invite", label: "포털 초대 발송", done: false },
  { key: "portal_signup", label: "고객 포털 가입 확인", done: false },
  { key: "keywords", label: "키워드 세팅 (10개)", done: false },
  { key: "first_analysis", label: "첫 분석 완료", done: false },
  { key: "first_content", label: "첫 콘텐츠 발행", done: false },
];

interface OnboardingClient {
  id: string;
  brand_name: string;
  sales_agent_name: string | null;
  plan_name: string | null;
  created_at: string;
  checklist: { key: string; label: string; done: boolean; done_at?: string }[];
}

export default function OnboardingPage() {
  const [clients, setClients] = useState<OnboardingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getClientPortfolio({ status: "onboarding" });
      // Also get all clients that may not have completed onboarding
      const allData = await getClientPortfolio();

      // Filter clients where onboarding is not completed
      const onboardingClients: OnboardingClient[] = allData.clients
        .filter((c) => c.onboarding_status !== "completed" || !c.onboarding_status)
        .slice(0, 20)
        .map((c) => ({
          id: c.id,
          brand_name: c.brand_name,
          sales_agent_name: c.sales_agent_name,
          plan_name: c.plan_name,
          created_at: c.created_at,
          checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
        }));

      setClients(onboardingClients);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const inProgressCount = clients.filter(
    (c) => c.checklist.some((i) => i.done) && !c.checklist.every((i) => i.done),
  ).length;
  const pendingCount = clients.filter((c) => !c.checklist.some((i) => i.done)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">온보딩 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">
          신규 고객의 온보딩 진행 상태를 관리합니다
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">진행중</p>
          <p className="text-2xl font-bold">{inProgressCount}개</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">시작 전</p>
          <p className="text-2xl font-bold">{pendingCount}개</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">전체</p>
          <p className="text-2xl font-bold">{clients.length}개</p>
        </div>
      </div>

      {/* Client Cards */}
      {clients.length > 0 ? (
        <div className="space-y-4">
          {clients.map((client) => (
            <OnboardingCard
              key={client.id}
              client={client}
              onUpdate={(checklist) => {
                setClients((prev) =>
                  prev.map((c) => (c.id === client.id ? { ...c, checklist } : c)),
                );
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Rocket className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">온보딩 대기 중인 고객이 없습니다</p>
        </div>
      )}
    </div>
  );
}

function OnboardingCard({
  client,
  onUpdate,
}: {
  client: OnboardingClient;
  onUpdate: (checklist: OnboardingClient["checklist"]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const doneCount = client.checklist.filter((i) => i.done).length;
  const total = client.checklist.length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;

  const daysSinceContract = Math.floor(
    (Date.now() - new Date(client.created_at).getTime()) / 86400000,
  );

  const toggleItem = (key: string) => {
    const updated = client.checklist.map((i) =>
      i.key === key
        ? { ...i, done: !i.done, done_at: !i.done ? new Date().toISOString() : undefined }
        : i,
    );
    onUpdate(updated);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateOnboardingChecklist(client.id, client.checklist);
      if (result.success) {
        toast.success("저장되었습니다.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{client.brand_name}</h3>
            {client.plan_name && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                {client.plan_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>계약일: {new Date(client.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
            {client.sales_agent_name && <span>담당: {client.sales_agent_name}</span>}
            <span>{daysSinceContract}일 경과</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            저장
          </button>
          <Link
            href={`/ops/clients/${client.id}`}
            className="text-xs text-primary font-medium hover:underline"
          >
            상세 →
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(pct)}%
        </span>
      </div>

      {/* Checklist */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {client.checklist.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.key)}
              className="h-3.5 w-3.5 rounded border"
            />
            <span className={`text-xs ${item.done ? "line-through text-muted-foreground" : ""}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
