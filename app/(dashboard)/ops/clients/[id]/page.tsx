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
  Edit3,
  FileText,
  Key,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
        <p className="text-xs mb-4">분석을 실행하면 AI가 자동으로 브랜드 페르소나를 생성합니다.</p>
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
      toast.success(`순위 체크 완료: ${result.count}개 키워드 중 ${result.exposed}개 노출`);
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
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">PC 순위</th>
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground hidden sm:table-cell">MO 순위</th>
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
                  <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                    {r.rank_mo != null ? (
                      <span className={`font-bold ${
                        r.rank_mo <= 3 ? "text-emerald-600" :
                        r.rank_mo <= 10 ? "text-blue-600" :
                        r.rank_mo <= 20 ? "text-amber-600" : "text-gray-400"
                      }`}>
                        {r.rank_mo}위
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

// ── Main Page ──────────────────────────────────────────────────────────────

type TabKey = "overview" | "keywords" | "contents" | "analyses" | "persona" | "subscription" | "onboarding" | "rankings";

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
    { key: "rankings", label: "순위", icon: TrendingUp },
    { key: "persona", label: "페르소나", icon: Sparkles },
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
      {activeTab === "rankings" && <RankingsTab clientId={client.id} />}
      {activeTab === "persona" && <PersonaTab client={client} onRefresh={refreshClient} />}
      {activeTab === "subscription" && <SubscriptionTab client={client} />}
      {activeTab === "onboarding" && <OnboardingTab client={client} />}
    </div>
  );
}
