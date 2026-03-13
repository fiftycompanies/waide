"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  AlertTriangle,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  CreditCard,
  Download,
  Edit3,
  FileBarChart,
  FileText,
  Key,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Microscope,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Unlink,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClientDetail,
  updateOnboardingChecklist,
  type ClientDetail,
} from "@/lib/actions/client-portfolio-actions";
import {
  runBrandAnalysis,
  getAnalysisStatus,
  getBrandAnalysis,
  refreshBrandAnalysis,
  type BrandAnalysisRow,
} from "@/lib/actions/analysis-brand-actions";
import {
  updatePersona,
  addManualStrength,
  removeManualStrength,
  regeneratePersona,
  type BrandPersona,
} from "@/lib/actions/persona-actions";
import {
  getClientRankings,
  triggerClientSerpCheck,
  type ClientRankingSummary,
} from "@/lib/actions/keyword-actions";
import {
  getReportSettings,
  updateReportSettings,
  getReportDeliveries,
  generateAndSendReport,
  resendReport,
  type ReportSettings,
  type ReportDelivery,
} from "@/lib/actions/report-actions";
import {
  getLinkedAccount,
  linkClientAccount,
  unlinkClientAccount,
  inviteClientUser,
  type LinkedAccount,
} from "@/lib/actions/client-account-actions";
import { BrandAnalysisModal } from "@/components/onboarding/brand-analysis-modal";

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

function OverviewTab({ client, onRefresh }: { client: ClientDetail; onRefresh: () => void }) {
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // 분석 상태 폴링
  useEffect(() => {
    if (!analysisId || !analysisRunning) return;
    const interval = setInterval(async () => {
      const result = await getAnalysisStatus(analysisId);
      setAnalysisStatus(result.status);
      if (result.status === "completed") {
        setAnalysisRunning(false);
        toast.success(`분석 완료! 마케팅 점수: ${result.marketing_score ?? "-"}점`);
        onRefresh();
      } else if (result.status === "failed") {
        setAnalysisRunning(false);
        toast.error(result.error || "분석 실패");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [analysisId, analysisRunning, onRefresh]);

  const handleStartAnalysis = async () => {
    if (!analysisUrl.trim()) {
      toast.error("네이버 플레이스 URL을 입력해주세요");
      return;
    }
    setAnalysisRunning(true);
    setAnalysisStatus("pending");
    const result = await runBrandAnalysis(client.id, analysisUrl.trim());
    if (result.success && result.analysisId) {
      setAnalysisId(result.analysisId);
      toast.success("분석이 시작되었습니다. 완료까지 30초~1분 소요됩니다.");
    } else {
      setAnalysisRunning(false);
      setAnalysisStatus(null);
      toast.error(result.error || "분석 시작 실패");
    }
  };

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

      {/* Analysis Execution */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">마케팅 분석 실행</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          네이버 플레이스 URL을 입력하면 마케팅 점수 분석 + AI 페르소나가 자동 생성됩니다.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={analysisUrl}
            onChange={(e) => setAnalysisUrl(e.target.value)}
            placeholder="https://naver.me/... 또는 https://m.place.naver.com/..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background"
            disabled={analysisRunning}
          />
          <button
            onClick={handleStartAnalysis}
            disabled={analysisRunning || !analysisUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 shrink-0"
          >
            {analysisRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {analysisRunning ? "분석 중..." : "분석 시작"}
          </button>
        </div>
        {analysisRunning && analysisStatus && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">
              {analysisStatus === "pending" && "분석 대기 중..."}
              {analysisStatus === "analyzing" && "데이터 수집 및 분석 중..."}
            </span>
          </div>
        )}
        {!analysisRunning && analysisStatus === "completed" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700">분석 완료! 페르소나 탭에서 AI 생성 결과를 확인하세요.</span>
          </div>
        )}
      </div>
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

// ── Persona Tab ──────────────────────────────────────────────────────────

function PersonaTab({ client, onRefresh }: { client: ClientDetail; onRefresh: () => void }) {
  const persona = client.brand_persona as BrandPersona | null;
  const [isRegenerating, startRegenerate] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<BrandPersona>>({});
  const [isSaving, startSave] = useTransition();
  const [newStrength, setNewStrength] = useState("");
  const [isAddingStrength, startAddStrength] = useTransition();

  const handleRegenerate = () => {
    startRegenerate(async () => {
      const result = await regeneratePersona(client.id);
      if (result.success) {
        toast.success("페르소나가 재생성되었습니다.");
        onRefresh();
      } else {
        toast.error(result.error || "재생성 실패");
      }
    });
  };

  const handleSaveEdit = () => {
    startSave(async () => {
      const result = await updatePersona(client.id, editValues);
      if (result.success) {
        toast.success("페르소나가 수정되었습니다.");
        setIsEditing(false);
        setEditValues({});
        onRefresh();
      } else {
        toast.error(result.error || "저장 실패");
      }
    });
  };

  const handleAddStrength = () => {
    if (!newStrength.trim()) return;
    startAddStrength(async () => {
      const result = await addManualStrength(client.id, newStrength.trim());
      if (result.success) {
        toast.success("강점이 추가되었습니다.");
        setNewStrength("");
        onRefresh();
      } else {
        toast.error(result.error || "추가 실패");
      }
    });
  };

  const handleRemoveStrength = (index: number) => {
    startAddStrength(async () => {
      const result = await removeManualStrength(client.id, index);
      if (result.success) {
        onRefresh();
      } else {
        toast.error(result.error || "삭제 실패");
      }
    });
  };

  // 빈 상태
  if (!persona) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm mb-3">아직 페르소나가 생성되지 않았습니다</p>
        <p className="text-xs mb-2">아래 버튼으로 기본 페르소나를 생성할 수 있습니다.</p>
        <p className="text-xs mb-4 text-muted-foreground/60">개요 탭에서 분석을 먼저 실행하면 더 정확한 AI 페르소나가 자동 생성됩니다.</p>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isRegenerating ? "생성 중..." : "페르소나 생성"}
        </button>
      </div>
    );
  }

  // 편집 모드 헬퍼
  const renderField = (label: string, key: keyof BrandPersona, value: string | undefined) => {
    if (isEditing) {
      return (
        <div>
          <label className="text-xs text-muted-foreground">{label}</label>
          <textarea
            className="w-full mt-1 p-2 border rounded-lg text-sm bg-background resize-none"
            rows={2}
            defaultValue={value || ""}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      );
    }
    return (
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="text-sm mt-0.5">{value || "-"}</p>
      </div>
    );
  };

  const renderList = (label: string, items: string[] | undefined) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((item, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs">{item}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-0.5">-</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">브랜드 페르소나</h3>
          {client.persona_updated_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              최종 업데이트: {new Date(client.persona_updated_at).toLocaleDateString("ko-KR")}
              {persona.manually_edited && " (수동 수정됨)"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => { setIsEditing(false); setEditValues({}); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
              >
                <X className="h-3 w-3" />
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                저장
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
              >
                <Edit3 className="h-3 w-3" />
                수정
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {isRegenerating ? "생성 중..." : "재생성"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* One-liner */}
      {persona.one_liner && (
        <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-transparent">
          <p className="text-sm font-medium">&ldquo;{persona.one_liner}&rdquo;</p>
        </div>
      )}

      {/* Core Fields */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">포지셔닝</h4>
          {renderField("포지셔닝", "positioning", persona.positioning)}
          {renderField("타겟 고객", "target_audience", persona.target_audience)}
          {renderField("톤 앤 매너", "tone", persona.tone)}
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">브랜드 스토리</h4>
          {renderField("브랜드 스토리 훅", "brand_story_hook", persona.brand_story_hook)}
          {renderField("비주얼 방향", "visual_direction", persona.visual_direction)}
        </div>
      </div>

      {/* Strengths with add/remove */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">강점</h4>
        {persona.strengths && persona.strengths.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {persona.strengths.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">
                {s}
                <button
                  onClick={() => handleRemoveStrength(i)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">아직 강점이 등록되지 않았습니다</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="강점 추가..."
            value={newStrength}
            onChange={(e) => setNewStrength(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddStrength()}
            className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-background"
          />
          <button
            onClick={handleAddStrength}
            disabled={!newStrength.trim() || isAddingStrength}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {isAddingStrength ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            추가
          </button>
        </div>
      </div>

      {/* Weaknesses */}
      {renderList("약점/개선 영역", persona.weaknesses)}

      {/* Content Strategy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">콘텐츠 방향</h4>
          {renderList("추천 콘텐츠 앵글", persona.content_angles)}
          {renderList("피해야 할 앵글", persona.avoid_angles)}
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">키워드/시즌</h4>
          {renderList("추천 키워드", persona.recommended_keywords)}
          {renderList("시즌별 훅", persona.seasonal_hooks)}
          {renderList("경쟁사 차별점", persona.competitor_differentiators)}
        </div>
      </div>
    </div>
  );
}

// ── Rankings Tab ────────────────────────────────────────────────────────

function RankingsTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ClientRankingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getClientRankings(clientId).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [clientId]);

  const handleCheck = async () => {
    setChecking(true);
    const result = await triggerClientSerpCheck(clientId);
    if (result.success) {
      toast.success(`순위 체크 완료: 네이버 ${result.exposed}개 / 구글 ${result.googleExposed ?? 0}개 노출 (${result.count}개 키워드)`);
      const d = await getClientRankings(clientId);
      setData(d);
    } else {
      toast.error(result.error || "순위 체크 실패");
    }
    setChecking(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">순위 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">순위 현황</h3>
          {data.last_collected_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              마지막 수집: {new Date(data.last_collected_at).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {checking ? "수집 중..." : "순위 체크 실행"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">노출 키워드</p>
          <p className="text-xl font-bold mt-1">
            {data.exposed_keywords}/{data.total_keywords}
          </p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">노출률</p>
          <p className="text-xl font-bold mt-1">{data.exposure_rate}%</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">TOP 3 / TOP 10</p>
          <p className="text-xl font-bold mt-1">{data.top3_count} / {data.top10_count}</p>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">평균 순위</p>
          <p className="text-xl font-bold mt-1">{data.avg_rank ? `${data.avg_rank}위` : "-"}</p>
        </div>
      </div>

      {/* Rankings Table */}
      {data.rankings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">순위 데이터가 없습니다</p>
          <p className="text-xs mt-1">&quot;순위 체크 실행&quot; 버튼을 클릭하세요</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">키워드</th>
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">네이버</th>
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">구글</th>
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">검색량</th>
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">수집일</th>
              </tr>
            </thead>
            <tbody>
              {data.rankings.map((r) => (
                <tr key={r.keyword_id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-medium">{r.keyword}</td>
                  <td className="py-2.5 px-3 text-center">
                    {r.rank_pc != null ? (
                      <span className={`font-bold ${
                        r.rank_pc <= 3 ? "text-emerald-600" :
                        r.rank_pc <= 10 ? "text-blue-600" :
                        r.rank_pc <= 20 ? "text-amber-600" : "text-gray-400"
                      }`}>
                        {r.rank_pc}위
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {r.rank_google != null ? (
                      <span className={`font-bold ${
                        r.rank_google <= 3 ? "text-emerald-600" :
                        r.rank_google <= 10 ? "text-blue-600" :
                        r.rank_google <= 20 ? "text-amber-600" : "text-gray-400"
                      }`}>
                        {r.rank_google}위
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs text-muted-foreground hidden md:table-cell">
                    {r.search_volume > 0 ? r.search_volume.toLocaleString() : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs text-muted-foreground hidden lg:table-cell">
                    {r.last_tracked_at ? new Date(r.last_tracked_at).toLocaleDateString("ko-KR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Report Tab ──────────────────────────────────────────────────────────

function ReportTab({ clientId }: { clientId: string }) {
  const [settings, setSettings] = useState<ReportSettings>({ enabled: false, recipient_email: null });
  const [deliveries, setDeliveries] = useState<ReportDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, startSave] = useTransition();
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    Promise.all([
      getReportSettings(clientId),
      getReportDeliveries(clientId),
    ]).then(([s, d]) => {
      setSettings(s);
      setEmailInput(s.recipient_email || "");
      setDeliveries(d);
      setLoading(false);
    });
  }, [clientId]);

  const handleSaveSettings = () => {
    startSave(async () => {
      const result = await updateReportSettings(clientId, {
        enabled: settings.enabled,
        recipient_email: emailInput.trim() || null,
      });
      if (result.success) {
        setSettings({ enabled: settings.enabled, recipient_email: emailInput.trim() || null });
        toast.success("리포트 설정이 저장되었습니다.");
      } else {
        toast.error(result.error || "저장 실패");
      }
    });
  };

  const handleGenerateAndSend = async () => {
    setSending(true);
    const now = new Date();
    const result = await generateAndSendReport(clientId, now.getFullYear(), now.getMonth() + 1);
    if (result.success) {
      toast.success(result.status === "sent" ? "리포트가 이메일로 발송되었습니다." : "PDF가 생성되었습니다. (이메일 미설정)");
      const d = await getReportDeliveries(clientId);
      setDeliveries(d);
    } else {
      toast.error(result.error || "리포트 생성 실패");
    }
    setSending(false);
  };

  const handlePreview = () => {
    window.open(`/api/portal/report-pdf?clientId=${clientId}`, "_blank");
  };

  const handleResend = async (deliveryId: string) => {
    setResending(deliveryId);
    const result = await resendReport(deliveryId);
    if (result.success) {
      toast.success("리포트가 재발송되었습니다.");
      const d = await getReportDeliveries(clientId);
      setDeliveries(d);
    } else {
      toast.error(result.error || "재발송 실패");
    }
    setResending(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      sent: { label: "발송완료", cls: "bg-emerald-100 text-emerald-700" },
      failed: { label: "실패", cls: "bg-red-100 text-red-700" },
      skipped: { label: "스킵", cls: "bg-gray-100 text-gray-600" },
      pending: { label: "대기", cls: "bg-amber-100 text-amber-700" },
      generating: { label: "생성중", cls: "bg-blue-100 text-blue-700" },
    };
    const b = map[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* 설정 영역 */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm">리포트 설정</h3>

        {/* 토글 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">월간 리포트 자동 발송</p>
            <p className="text-xs text-muted-foreground">매월 1일 자동으로 리포트를 생성하여 이메일로 발송합니다</p>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? "bg-emerald-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 이메일 */}
        <div>
          <label className="text-xs text-muted-foreground">수신 이메일</label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="report@example.com"
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background"
          />
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          저장
        </button>
      </div>

      {/* 수동 발송 영역 */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm">수동 리포트</h3>
        <p className="text-xs text-muted-foreground">리포트 ON/OFF와 관계없이 수동으로 리포트를 생성하고 발송할 수 있습니다.</p>
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            PDF 미리보기
          </button>
          <button
            onClick={handleGenerateAndSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "생성 중..." : "리포트 생성 + 발송"}
          </button>
        </div>
      </div>

      {/* 발송 이력 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-3">발송 이력</h3>
        {deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">발송 이력이 없습니다</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">리포트 월</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">발송일</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden lg:table-cell">수신 이메일</th>
                  <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">상태</th>
                  <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">작업</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-medium">
                      {new Date(d.report_month).toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      {d.email_sent_at ? new Date(d.email_sent_at).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {d.email_to || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center">{statusBadge(d.status)}</td>
                    <td className="py-2.5 px-3 text-center">
                      {d.status === "failed" && (
                        <button
                          onClick={() => handleResend(d.id)}
                          disabled={resending === d.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          {resending === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          재발송
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {deliveries.some((d) => d.error_message) && (
          <div className="mt-3 space-y-1">
            {deliveries.filter((d) => d.error_message).map((d) => (
              <p key={d.id} className="text-xs text-red-500">
                {new Date(d.report_month).toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}: {d.error_message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Account Tab ────────────────────────────────────────────────────────────

function AccountTab({ clientId }: { clientId: string }) {
  const [account, setAccount] = useState<LinkedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const loadAccount = () => {
    setLoading(true);
    setError(null);
    getLinkedAccount(clientId)
      .then((data) => {
        setAccount(data);
      })
      .catch((err) => {
        console.error("[AccountTab] load error:", err);
        setError("계정 정보를 불러올 수 없습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleLink = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await linkClientAccount(clientId, email.trim());
      if (result.success) {
        toast.success("계정이 연결되었습니다.");
        setEmail("");
        loadAccount();
      } else {
        toast.error(result.error ?? "연결 실패");
      }
    });
  };

  const handleUnlink = () => {
    if (!account) return;
    startTransition(async () => {
      const result = await unlinkClientAccount(clientId, account.id);
      if (result.success) {
        toast.success("계정 연결이 해제되었습니다.");
        setAccount(null);
      } else {
        toast.error(result.error ?? "해제 실패");
      }
    });
  };

  const handleInvite = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await inviteClientUser(clientId, email.trim());
      if (result.success) {
        toast.success("초대가 발송되었습니다.");
        setInviteUrl(result.inviteUrl ?? null);
        setEmail("");
      } else {
        toast.error(result.error ?? "초대 실패");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40 text-amber-500" />
        <p className="text-sm">{error}</p>
        <button
          onClick={loadAccount}
          className="mt-3 text-sm text-primary hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          연결된 포털 계정
        </h3>

        {account ? (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                <User className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">{account.name || account.email}</p>
                <p className="text-sm text-muted-foreground">{account.email}</p>
                <p className="text-xs text-muted-foreground">
                  연결일: {new Date(account.created_at).toLocaleDateString("ko-KR")}
                  {account.last_login_at && (
                    <> · 최근 로그인: {new Date(account.last_login_at).toLocaleDateString("ko-KR")}</>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleUnlink}
              disabled={isPending}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <Unlink className="h-4 w-4" />
              연결 해제
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">연결된 포털 계정이 없습니다.</p>

            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 입력"
                className="flex-1 h-9 px-3 text-sm rounded-md border border-input bg-background"
              />
              <button
                onClick={handleLink}
                disabled={isPending || !email.trim()}
                className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "계정 연결"}
              </button>
              <button
                onClick={handleInvite}
                disabled={isPending || !email.trim()}
                className="h-9 px-4 text-sm font-medium rounded-md border border-input hover:bg-muted disabled:opacity-50"
              >
                초대 발송
              </button>
            </div>

            {inviteUrl && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <p className="font-medium text-emerald-700">초대 링크가 생성되었습니다</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate">{inviteUrl}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      toast.success("링크가 복사되었습니다.");
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
                  >
                    복사
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Place Tab ──────────────────────────────────────────────────────────────

interface PlaceStatsRecord {
  measured_at: string;
  visitor_review_count: number | null;
  blog_review_count: number | null;
  bookmark_count: number | null;
}

function PlaceTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<PlaceStatsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/supabase/service").then((mod) => {
      const db = mod.createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)
        .from("place_stats_history")
        .select("measured_at, visitor_review_count, blog_review_count, bookmark_count")
        .eq("client_id", clientId)
        .order("measured_at", { ascending: false })
        .limit(30)
        .then(({ data: rows }: { data: PlaceStatsRecord[] | null }) => {
          setData(rows ?? []);
          setLoading(false);
        });
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">플레이스 통계 데이터가 없습니다</p>
        <p className="text-xs mt-1 text-muted-foreground/70">일간 수집 크론이 실행되면 리뷰수/저장수 이력이 표시됩니다</p>
      </div>
    );
  }

  // 최신(첫 번째) vs 이전(마지막) 비교
  const latest = data[0];
  const oldest = data[data.length - 1];
  const reviewDelta = (latest.visitor_review_count ?? 0) - (oldest.visitor_review_count ?? 0);
  const blogDelta = (latest.blog_review_count ?? 0) - (oldest.blog_review_count ?? 0);
  const bookmarkDelta = (latest.bookmark_count ?? 0) - (oldest.bookmark_count ?? 0);

  // 차트용 오름차순 데이터
  const sorted = [...data].reverse();
  const chartW = 600;
  const chartH = 140;
  const pad = { top: 20, right: 20, bottom: 25, left: 40 };
  const w = chartW - pad.left - pad.right;
  const h = chartH - pad.top - pad.bottom;

  const allVals = sorted.map((d) => d.visitor_review_count ?? 0);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals);
  const range = maxVal - minVal || 1;

  const getX = (i: number) => pad.left + (sorted.length > 1 ? (i / (sorted.length - 1)) * w : w / 2);
  const getY = (v: number) => pad.top + h - ((v - minVal) / range) * h;

  const points = sorted.map((d, i) => `${getX(i)},${getY(d.visitor_review_count ?? 0)}`).join(" ");

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "방문자 리뷰", value: latest.visitor_review_count, delta: reviewDelta },
          { label: "블로그 리뷰", value: latest.blog_review_count, delta: blogDelta },
          { label: "저장수", value: latest.bookmark_count, delta: bookmarkDelta },
        ].map((stat) => (
          <div key={stat.label} className="border rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value ?? "-"}</p>
            {stat.delta !== 0 && (
              <p className={`text-xs mt-0.5 flex items-center justify-center gap-0.5 ${stat.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {stat.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.delta > 0 ? "+" : ""}{stat.delta} ({data.length}일)
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 30-day chart */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-3">방문자 리뷰 추이 (최근 {sorted.length}일)</h3>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-[600px]">
          {/* Grid */}
          {[minVal, Math.round((minVal + maxVal) / 2), maxVal].map((v) => (
            <g key={v}>
              <line x1={pad.left} y1={getY(v)} x2={chartW - pad.right} y2={getY(v)} stroke="#e5e7eb" strokeDasharray="4,4" />
              <text x={pad.left - 6} y={getY(v) + 4} textAnchor="end" className="text-[10px] fill-gray-400">{v}</text>
            </g>
          ))}
          {/* Date labels */}
          {sorted.filter((_, i) => i % Math.max(1, Math.floor(sorted.length / 5)) === 0).map((d) => {
            const idx = sorted.indexOf(d);
            const date = new Date(d.measured_at);
            return (
              <text key={idx} x={getX(idx)} y={chartH - 5} textAnchor="middle" className="text-[10px] fill-gray-400">
                {`${date.getMonth() + 1}/${date.getDate()}`}
              </text>
            );
          })}
          {/* Line */}
          <polyline fill="none" stroke="#8b5cf6" strokeWidth="2" points={points} />
          {/* Dots */}
          {sorted.map((d, i) => (
            <circle key={i} cx={getX(i)} cy={getY(d.visitor_review_count ?? 0)} r="3" fill="white" stroke="#8b5cf6" strokeWidth="1.5" />
          ))}
        </svg>
      </div>

      {/* Data table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">날짜</th>
              <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">방문자 리뷰</th>
              <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">블로그 리뷰</th>
              <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">저장수</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((d) => (
              <tr key={d.measured_at} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2 px-3 text-muted-foreground">{new Date(d.measured_at).toLocaleDateString("ko-KR")}</td>
                <td className="py-2 px-3 text-center font-medium">{d.visitor_review_count ?? "-"}</td>
                <td className="py-2 px-3 text-center font-medium">{d.blog_review_count ?? "-"}</td>
                <td className="py-2 px-3 text-center font-medium">{d.bookmark_count ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Brand Analysis Tab ─────────────────────────────────────────────────────

function BrandAnalysisTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<BrandAnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newAnalysisUrl, setNewAnalysisUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const loadData = () => {
    getBrandAnalysis(clientId).then((d) => {
      setData(d);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // 폴링 (분석 진행 중)
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      const result = await getAnalysisStatus(pollingId);
      if (result.status === "completed") {
        setAnalyzing(false);
        setPollingId(null);
        toast.success(`분석 완료! 마케팅 점수: ${result.marketing_score ?? "-"}점`);
        loadData();
      } else if (result.status === "failed") {
        setAnalyzing(false);
        setPollingId(null);
        toast.error(result.error || "분석 실패");
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingId]);

  const handleRefresh = async () => {
    if (!data) return;
    setRefreshing(true);
    const result = await refreshBrandAnalysis(data.id);
    if (result.success && result.newAnalysisId) {
      setPollingId(result.newAnalysisId);
      setAnalyzing(true);
      toast.success("재분석이 시작되었습니다.");
    } else {
      toast.error(result.error || "재분석 시작 실패");
    }
    setRefreshing(false);
  };

  const handleNewAnalysis = async () => {
    if (!newAnalysisUrl.trim()) return;
    setAnalyzing(true);
    const result = await runBrandAnalysis(clientId, newAnalysisUrl.trim());
    if (result.success && result.analysisId) {
      setPollingId(result.analysisId);
      toast.success("분석이 시작되었습니다.");
      setNewAnalysisUrl("");
    } else {
      setAnalyzing(false);
      toast.error(result.error || "분석 시작 실패");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── 분석 진행 중 상태 ──
  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-bold mb-1">분석 진행 중</h3>
        <p className="text-sm text-muted-foreground">AI가 데이터를 수집하고 분석하고 있습니다. 30초~1분 소요됩니다.</p>
      </div>
    );
  }

  // ── 빈 상태 ──
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Microscope className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-bold mb-1">아직 브랜드 분석이 완료되지 않았습니다</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          네이버 플레이스 URL 또는 홈페이지 URL을 입력하면 AI가 마케팅 분석을 시작합니다.
        </p>
        <div className="flex gap-2 w-full max-w-md">
          <input
            type="url"
            value={newAnalysisUrl}
            onChange={(e) => setNewAnalysisUrl(e.target.value)}
            placeholder="https://naver.me/... 또는 https://your-site.com"
            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-background"
            onKeyDown={(e) => e.key === "Enter" && handleNewAnalysis()}
          />
          <button
            onClick={handleNewAnalysis}
            disabled={!newAnalysisUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 shrink-0"
          >
            <Play className="h-3.5 w-3.5" />
            분석 시작
          </button>
        </div>
      </div>
    );
  }

  // ── 데이터 파싱 ──
  const bi = (data.basic_info ?? {}) as Record<string, unknown>;
  const ka = (data.keyword_analysis ?? {}) as Record<string, unknown>;
  const cs = (data.content_strategy ?? {}) as Record<string, unknown>;
  const ba = (cs.brand_analysis ?? {}) as Record<string, unknown>;
  const tone = (ba.tone ?? {}) as Record<string, unknown>;
  const targetAudience = (ba.target_audience ?? {}) as Record<string, unknown>;
  const usp = (ba.usp ?? []) as string[];
  const contentAngles = (ba.content_angles ?? []) as string[];
  const improvements = (cs.improvements ?? []) as Array<Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywords = (ka.keywords ?? []) as any[];
  const scoreBreakdown = (cs.score_breakdown ?? {}) as Record<string, { score: number; max?: number; details?: string; detail?: string }>;

  const scoreAreas = [
    { key: "review_reputation", label: "리뷰/평판", max: 20, color: "bg-violet-500" },
    { key: "naver_keyword", label: "네이버 키워드", max: 25, color: "bg-blue-500" },
    { key: "google_keyword", label: "구글 키워드", max: 15, color: "bg-red-400" },
    { key: "image_quality", label: "이미지 품질", max: 10, color: "bg-amber-500" },
    { key: "online_channels", label: "온라인 채널", max: 15, color: "bg-emerald-500" },
    { key: "seo_aeo_readiness", label: "SEO/AEO 준비도", max: 15, color: "bg-pink-500" },
  ];

  const totalMax = scoreAreas.reduce((s, a) => s + a.max, 0);
  const scorePct = data.marketing_score != null ? Math.round((data.marketing_score / totalMax) * 100) : 0;
  const scoreColor = scorePct >= 70 ? "text-emerald-600" : scorePct >= 40 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Section 1: Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">브랜드 분석 결과</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bi.name ? `${bi.name}` : ""}
            {data.analyzed_at && ` · 분석일: ${new Date(data.analyzed_at).toLocaleDateString("ko-KR")}`}
            {data.url_type && ` · ${data.url_type === "website" ? "웹사이트" : "네이버 플레이스"}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {refreshing ? "시작 중..." : "재분석"}
        </button>
      </div>

      {/* Section 2: Marketing Score */}
      <div className="border rounded-lg p-5">
        <div className="flex items-center gap-6 mb-4">
          <div className="relative flex items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e5e7eb" strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${scorePct}, 100`}
                className={scoreColor}
              />
            </svg>
            <span className={`absolute text-lg font-bold ${scoreColor}`}>
              {data.marketing_score ?? "-"}
            </span>
          </div>
          <div>
            <h4 className="font-semibold">마케팅 종합 점수</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{totalMax}점 만점 기준</p>
          </div>
        </div>
        <div className="space-y-2">
          {scoreAreas.map(({ key, label, max, color }) => {
            const area = scoreBreakdown[key];
            const score = area?.score ?? 0;
            const areaMax = area?.max ?? max;
            const pct = areaMax > 0 ? (score / areaMax) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium w-12 text-right">{score}/{areaMax}</span>
                </div>
                {(area?.details || area?.detail) && (
                  <p className="text-xs text-muted-foreground ml-[7.5rem] mt-0.5">{area?.details || area?.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Target & Positioning */}
      {(!!targetAudience.primary || !!targetAudience.secondary || !!ba.positioning) && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            타겟 & 포지셔닝
          </h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {!!targetAudience.primary && (
              <div>
                <span className="text-xs text-muted-foreground">주요 타겟</span>
                <p className="text-sm mt-0.5">{String(targetAudience.primary)}</p>
              </div>
            )}
            {!!targetAudience.secondary && (
              <div>
                <span className="text-xs text-muted-foreground">보조 타겟</span>
                <p className="text-sm mt-0.5">{String(targetAudience.secondary)}</p>
              </div>
            )}
          </div>
          {!!ba.positioning && (
            <div>
              <span className="text-xs text-muted-foreground">포지셔닝</span>
              <p className="text-sm mt-0.5">{String(ba.positioning)}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 4: Tone */}
      {(!!tone.style || !!tone.personality || ((tone.example_phrases as string[] | undefined) ?? []).length > 0) && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm">톤 & 보이스</h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {!!tone.style && (
              <div>
                <span className="text-xs text-muted-foreground">스타일</span>
                <p className="text-sm mt-0.5">{String(tone.style)}</p>
              </div>
            )}
            {!!tone.personality && (
              <div>
                <span className="text-xs text-muted-foreground">퍼스널리티</span>
                <p className="text-sm mt-0.5">{String(tone.personality)}</p>
              </div>
            )}
          </div>
          {((tone.example_phrases as string[] | undefined) ?? []).length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">예시 표현</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {((tone.example_phrases as string[]) ?? []).map((phrase, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs">&ldquo;{phrase}&rdquo;</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 5: USP */}
      {usp.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">고유 가치 제안 (USP)</h4>
          <ul className="space-y-1.5">
            {usp.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 6: Content Angles */}
      {contentAngles.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">추천 콘텐츠 앵글</h4>
          <div className="flex flex-wrap gap-2">
            {contentAngles.map((angle, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-100">
                {angle}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 7: Keywords */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm">키워드 분석</h4>
        {!!ka.main_keyword && (
          <p className="text-sm">
            <span className="text-muted-foreground">메인 키워드:</span>{" "}
            <span className="font-medium">{String(ka.main_keyword)}</span>
            {!!ka.secondary_keyword && (
              <span className="text-muted-foreground"> · 서브: {String(ka.secondary_keyword)}</span>
            )}
          </p>
        )}
        {keywords.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">키워드</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">의도</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">우선순위</th>
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 15).map((kw, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{kw.keyword ?? kw}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{kw.intent ?? "-"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        kw.priority === "high" ? "bg-red-100 text-red-700" :
                        kw.priority === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {kw.priority ?? "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">키워드 데이터가 없습니다</p>
        )}
      </div>

      {/* Section 8: Improvements */}
      {improvements.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            개선 포인트
          </h4>
          <div className="space-y-3">
            {improvements.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-1">
                  {!!item.priority && (
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      item.priority === "high" ? "bg-red-100 text-red-700" :
                      item.priority === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {String(item.priority)}
                    </span>
                  )}
                  <span className="text-sm font-medium">{String(item.title ?? item.area ?? item.category ?? `개선사항 ${i + 1}`)}</span>
                </div>
                {!!item.description && (
                  <p className="text-xs text-muted-foreground">{String(item.description)}</p>
                )}
                {!!item.action && (
                  <p className="text-xs text-primary mt-1">→ {String(item.action)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type TabKey = "overview" | "keywords" | "contents" | "analyses" | "brand-analysis" | "persona" | "subscription" | "onboarding" | "rankings" | "reports" | "account" | "place";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

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
        <Link href="/clients" className="text-primary hover:underline text-sm mt-2 inline-block">
          목록으로 →
        </Link>
      </div>
    );
  }

  const refreshClient = () => {
    getClientDetail(clientId).then((data) => {
      if (data) setClient(data);
    });
  };

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "개요", icon: Building2 },
    { key: "keywords", label: "키워드", icon: Key },
    { key: "contents", label: "콘텐츠", icon: FileText },
    { key: "analyses", label: "분석이력", icon: BarChart2 },
    { key: "brand-analysis", label: "브랜드 분석", icon: Microscope },
    { key: "rankings", label: "순위", icon: TrendingUp },
    { key: "persona", label: "페르소나", icon: Sparkles },
    { key: "subscription", label: "구독/결제", icon: CreditCard },
    { key: "onboarding", label: "온보딩", icon: CheckSquare },
    { key: "account", label: "계정", icon: Link2 },
    { key: "reports", label: "리포트", icon: FileBarChart },
    { key: "place", label: "플레이스", icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Breadcrumb items={[
        { label: "고객 포트폴리오", href: "/clients" },
        { label: client.brand_name },
      ]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.brand_name}</h1>
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
        <button
          onClick={() => setShowAnalysisModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          브랜드 추가 분석
        </button>
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
      {activeTab === "overview" && <OverviewTab client={client} onRefresh={refreshClient} />}
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
      {activeTab === "brand-analysis" && <BrandAnalysisTab clientId={client.id} />}
      {activeTab === "rankings" && <RankingsTab clientId={client.id} />}
      {activeTab === "persona" && <PersonaTab client={client} onRefresh={refreshClient} />}
      {activeTab === "subscription" && <SubscriptionTab client={client} />}
      {activeTab === "onboarding" && <OnboardingTab client={client} />}
      {activeTab === "account" && <AccountTab clientId={client.id} />}
      {activeTab === "reports" && <ReportTab clientId={client.id} />}
      {activeTab === "place" && <PlaceTab clientId={client.id} />}

      <BrandAnalysisModal
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        presetClientId={client.id}
      />
    </div>
  );
}
