"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  Building2,
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  Key,
  Loader2,
  Save,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClientDetail,
  updateOnboardingChecklist,
  type ClientDetail,
} from "@/lib/actions/client-portfolio-actions";

// ── Tab button ─────────────────────────────────────────────────────────────

function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ client }: { client: ClientDetail }) {
  const scoreAreas = [
    { key: "review_reputation", label: "리뷰", max: 20 },
    { key: "naver_keyword", label: "키워드", max: 25 },
    { key: "google_keyword", label: "구글", max: 15 },
    { key: "image_quality", label: "이미지", max: 10 },
    { key: "online_channels", label: "채널", max: 15 },
    { key: "seo_aeo_readiness", label: "SEO", max: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Client Info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm">고객 정보</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">브랜드:</span>{" "}
              <span className="font-medium">{client.brand_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">상태:</span>{" "}
              <span className={`font-medium ${client.at_risk ? "text-amber-600" : "text-emerald-600"}`}>
                {client.at_risk ? "At Risk" : client.subscription?.status === "active" ? "Active" : client.subscription?.status || "미구독"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">플랜:</span>{" "}
              <span className="font-medium">{client.subscription?.plan_name || "없음"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">가입일:</span>{" "}
              {new Date(client.created_at).toLocaleDateString("ko-KR")}
            </div>
            {client.contact_phone && (
              <div>
                <span className="text-muted-foreground">연락처:</span> {client.contact_phone}
              </div>
            )}
            {client.contact_email && (
              <div>
                <span className="text-muted-foreground">이메일:</span> {client.contact_email}
              </div>
            )}
            {client.sales_agent_name && (
              <div>
                <span className="text-muted-foreground">담당:</span>{" "}
                <span className="font-medium">{client.sales_agent_name}</span>
              </div>
            )}
            {client.last_portal_login && (
              <div>
                <span className="text-muted-foreground">포털 접속:</span>{" "}
                {new Date(client.last_portal_login).toLocaleDateString("ko-KR")}
              </div>
            )}
          </div>

          {client.at_risk && client.risk_reasons.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">{client.risk_reasons.join(" · ")}</p>
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            마케팅 점수: {client.marketing_score ?? "--"}/100
          </h3>
          <div className="space-y-2">
            {scoreAreas.map(({ key, label, max }) => {
              const area = client.score_breakdown[key];
              const score = area?.score ?? 0;
              const areaMax = area?.max ?? max;
              const pct = areaMax > 0 ? (score / areaMax) * 100 : 0;
              const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";

              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{score}/{areaMax}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Keywords */}
      {client.top_keywords.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">핵심 키워드 TOP {client.top_keywords.length}</h3>
          <div className="space-y-1.5">
            {client.top_keywords.map((k, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-medium">{k.keyword}</span>
                <span className="text-muted-foreground">네이버 {k.rank ?? "--"}위</span>
                {k.change != null && k.change !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs ${k.change > 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {k.change < 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(k.change)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Summary */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-3">이번달 콘텐츠</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">발행:</span>{" "}
            <span className="font-bold text-emerald-600">{client.content_published}건</span>
          </div>
          <div>
            <span className="text-muted-foreground">작성중:</span>{" "}
            <span className="font-bold">{client.content_draft}건</span>
          </div>
          <div>
            <span className="text-muted-foreground">승인대기:</span>{" "}
            <span className="font-bold">{client.content_scheduled}건</span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      {client.recent_activities.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">최근 활동</h3>
          <div className="space-y-2">
            {client.recent_activities.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                  {new Date(a.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </span>
                <p className="text-sm">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Website / GSC */}
      {client.website_url && (
        <div className="border rounded-lg p-4 text-sm">
          <h3 className="font-semibold text-sm mb-2">웹사이트</h3>
          <a href={client.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {client.website_url}
          </a>
        </div>
      )}
    </div>
  );
}

// ── Subscription Tab ──────────────────────────────────────────────────────

function SubscriptionTab({ client }: { client: ClientDetail }) {
  const sub = client.subscription;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentHistory = Array.isArray((sub?.notes as any)) ? (sub?.notes as { date: string; amount: number; memo: string }[]) : [];

  if (!sub) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">구독 정보가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">구독 정보</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">플랜:</span>{" "}
            <span className="font-medium">{sub.plan_name || "기본"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">상태:</span>{" "}
            <span className={`font-medium ${sub.status === "active" ? "text-emerald-600" : "text-red-500"}`}>
              {sub.status === "active" ? "활성" : sub.status}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">MRR:</span>{" "}
            <span className="font-bold">₩{sub.mrr.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">결제방식:</span>{" "}
            {sub.payment_method || "미설정"}
          </div>
          <div>
            <span className="text-muted-foreground">시작일:</span>{" "}
            {new Date(sub.started_at).toLocaleDateString("ko-KR")}
          </div>
          {sub.expires_at && (
            <div>
              <span className="text-muted-foreground">만료일:</span>{" "}
              <span className={(() => {
                const d = Math.floor((new Date(sub.expires_at).getTime() - Date.now()) / 86400000);
                return d <= 30 ? "text-red-500 font-medium" : "";
              })()}>
                {new Date(sub.expires_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
          )}
        </div>
      </div>

      {paymentHistory.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">결제 이력</h3>
          <div className="space-y-2">
            {paymentHistory.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <span className="text-muted-foreground">{p.date}</span>
                <span className="font-medium">₩{p.amount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">{p.memo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Onboarding Tab ────────────────────────────────────────────────────────

function OnboardingTab({ client }: { client: ClientDetail }) {
  const [checklist, setChecklist] = useState(client.onboarding_checklist);
  const [isPending, startTransition] = useTransition();

  const defaultChecklist: { key: string; label: string; done: boolean; done_at?: string }[] = [
    { key: "contract", label: "계약 완료", done: false },
    { key: "client_register", label: "클라이언트 등록", done: false },
    { key: "portal_invite", label: "포털 초대 발송", done: false },
    { key: "portal_signup", label: "고객 포털 가입 확인", done: false },
    { key: "keywords", label: "키워드 세팅 (10개)", done: false },
    { key: "first_analysis", label: "첫 분석 완료", done: false },
    { key: "first_content", label: "첫 콘텐츠 발행", done: false },
  ];

  const items = checklist.length > 0 ? checklist : defaultChecklist;
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  const toggleItem = (key: string) => {
    const updated = items.map((i) =>
      i.key === key ? { ...i, done: !i.done, done_at: !i.done ? new Date().toISOString() : undefined } : i,
    );
    setChecklist(updated);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateOnboardingChecklist(client.id, items);
      if (result.success) {
        toast.success("온보딩 체크리스트가 저장되었습니다.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">온보딩 체크리스트</h3>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          저장
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {doneCount}/{items.length} ({Math.round(pct)}%)
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.key)}
              className="h-4 w-4 rounded border"
            />
            <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "font-medium"}`}>
              {item.label}
            </span>
            {item.done_at && (
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(item.done_at).toLocaleDateString("ko-KR")}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type TabKey = "overview" | "keywords" | "contents" | "analyses" | "subscription" | "onboarding";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    getClientDetail(clientId).then((data) => {
      setClient(data);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>고객을 찾을 수 없습니다</p>
        <Link href="/ops/clients" className="text-primary hover:underline text-sm mt-2 inline-block">
          목록으로 →
        </Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "개요", icon: Building2 },
    { key: "keywords", label: "키워드", icon: Key },
    { key: "contents", label: "콘텐츠", icon: FileText },
    { key: "analyses", label: "분석이력", icon: BarChart2 },
    { key: "subscription", label: "구독/결제", icon: CreditCard },
    { key: "onboarding", label: "온보딩", icon: CheckSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/ops/clients" className="text-sm text-muted-foreground hover:text-foreground">
              고객 포트폴리오
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-2xl font-bold">{client.brand_name}</h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {client.subscription && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                client.subscription.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
              }`}>
                {client.subscription.status === "active" ? "Active" : client.subscription.status}
              </span>
            )}
            {client.subscription?.plan_name && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {client.subscription.plan_name}
              </span>
            )}
            {client.at_risk && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                ⚠️ At Risk
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b pb-2">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab client={client} />}
      {activeTab === "keywords" && (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">키워드 관리 페이지로 이동하세요</p>
          <Link href={`/keywords?clientId=${client.id}`} className="text-primary text-sm hover:underline mt-1 inline-block">
            키워드 관리 →
          </Link>
        </div>
      )}
      {activeTab === "contents" && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">콘텐츠 관리 페이지로 이동하세요</p>
          <Link href={`/ops/contents?clientId=${client.id}`} className="text-primary text-sm hover:underline mt-1 inline-block">
            콘텐츠 관리 →
          </Link>
        </div>
      )}
      {activeTab === "analyses" && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">분석 로그 페이지로 이동하세요</p>
          <Link href={`/ops/analysis-logs?clientId=${client.id}`} className="text-primary text-sm hover:underline mt-1 inline-block">
            분석 로그 →
          </Link>
        </div>
      )}
      {activeTab === "subscription" && <SubscriptionTab client={client} />}
      {activeTab === "onboarding" && <OnboardingTab client={client} />}
    </div>
  );
}
