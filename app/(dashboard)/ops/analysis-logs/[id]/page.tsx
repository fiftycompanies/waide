"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  getAnalysisLogDetail,
  updateLeadStatus,
  addAnalysisNote,
  updateAnalysisContact,
  getSalesAgentsList,
  getClientsList,
  assignSalesAgent,
  assignToClient,
} from "@/lib/actions/analysis-log-actions";
import type { AnalysisLogDetail, AnalysisNote } from "@/lib/actions/analysis-log-actions";

// ── Status config ──
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "신규", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  contacted: { label: "연락완료", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  consulting: { label: "상담중", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  contracted: { label: "계약완료", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  active: { label: "관리중", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  churned: { label: "이탈", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">-</span>;
  const color = score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return <span className={`text-3xl font-bold ${color}`}>{score}<span className="text-base font-normal text-muted-foreground">/100</span></span>;
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://web-five-gold-12.vercel.app";
}

// ═════════════════════════════════════
// Tab components
// ═════════════════════════════════════

function AnalysisTab({ detail }: { detail: AnalysisLogDetail }) {
  const bi = detail.basic_info ?? {};
  const ka = detail.keyword_analysis;
  const cs = detail.content_strategy;

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-3">기본 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">업종</p>
            <p className="font-medium">{detail.category || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">주소</p>
            <p className="font-medium">{detail.address || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">전화</p>
            <p className="font-medium">{(bi as Record<string, unknown>).phone as string || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">영업시간</p>
            <p className="font-medium">{(bi as Record<string, unknown>).businessHours as string || "-"}</p>
          </div>
        </div>
      </div>

      {/* 키워드 분석 */}
      {ka && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-3">키워드 분석</h3>
          {Array.isArray((ka as Record<string, unknown>).keywords) && (
            <div className="flex flex-wrap gap-2">
              {((ka as Record<string, unknown>).keywords as Array<Record<string, unknown>>).map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs">
                  <span className="font-medium">{kw.keyword as string}</span>
                  {kw.monthlySearchVolume ? (
                    <span className="text-muted-foreground">({String(kw.monthlySearchVolume)})</span>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 콘텐츠 전략 */}
      {cs && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-3">콘텐츠 전략</h3>
          {Array.isArray((cs as Record<string, unknown>).improvements) && (
            <ul className="space-y-2">
              {((cs as Record<string, unknown>).improvements as Array<Record<string, unknown>>).map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    (imp.priority as string) === "high" ? "bg-red-500" :
                    (imp.priority as string) === "medium" ? "bg-yellow-500" : "bg-green-500"
                  }`} />
                  <div>
                    <p className="font-medium">{imp.title as string}</p>
                    <p className="text-xs text-muted-foreground">{imp.description as string}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 이미지 분석 */}
      {detail.image_analysis && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-3">이미지 분석</h3>
          <p className="text-sm text-muted-foreground">
            수집된 이미지: {((detail.image_analysis as Record<string, unknown>).collectedUrls as string[])?.length ?? 0}장
          </p>
          {(detail.image_analysis as Record<string, unknown>).aiAnalysis ? (
            <p className="text-sm mt-2 whitespace-pre-wrap">
              {String(((detail.image_analysis as Record<string, unknown>).aiAnalysis as Record<string, unknown>).summary ?? "")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SeoAuditTab({ seoAudit }: { seoAudit: Record<string, unknown> | null }) {
  if (!seoAudit) return <EmptyTab message="SEO 진단 데이터가 없습니다." />;
  const items = (seoAudit.items ?? seoAudit.audit_items ?? []) as Array<Record<string, unknown>>;
  const score = seoAudit.total_score as number ?? null;

  return (
    <div className="space-y-4">
      {score !== null && (
        <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
          <div className={`text-3xl font-bold ${score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
            {score}<span className="text-base font-normal text-muted-foreground">/100</span>
          </div>
          <div>
            <p className="font-semibold">SEO 결격 사유 진단</p>
            <p className="text-xs text-muted-foreground">
              {items.filter((it) => it.status === "fail" || it.status === "warning").length}개 항목 개선 필요
            </p>
          </div>
        </div>
      )}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-3 px-4 font-medium">항목</th>
              <th className="text-center py-3 px-2 font-medium">상태</th>
              <th className="text-left py-3 px-4 font-medium">설명</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 px-4 font-medium">{item.name as string}</td>
                <td className="py-3 px-2 text-center">
                  {item.status === "pass" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">통과</span>
                  ) : item.status === "warning" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">주의</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">실패</span>
                  )}
                </td>
                <td className="py-3 px-4 text-muted-foreground text-xs">{item.detail as string ?? item.description as string}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeywordRankingsTab({ rankings }: { rankings: Array<Record<string, unknown>> | null }) {
  if (!rankings || rankings.length === 0) return <EmptyTab message="키워드 순위 데이터가 없습니다." />;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left py-3 px-4 font-medium">키워드</th>
            <th className="text-center py-3 px-2 font-medium">순위</th>
            <th className="text-left py-3 px-4 font-medium">노출 제목</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((kw, i) => {
            const rank = kw.rank as number | null;
            return (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 px-4 font-medium">{kw.keyword as string}</td>
                <td className="py-3 px-2 text-center">
                  {rank ? (
                    <span className={`font-bold ${rank <= 3 ? "text-green-600" : rank <= 10 ? "text-yellow-600" : "text-red-600"}`}>
                      {rank}위
                    </span>
                  ) : (
                    <span className="text-muted-foreground">미노출</span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[300px]">
                  {(kw.title as string) || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 활동 기록 탭 (Task 2: 상담이력 + 코멘트 통합) ──

interface ActivityItem {
  id: string;
  type: "comment" | "system" | "consultation" | "status_change";
  icon: string;
  author: string;
  text: string;
  created_at: string;
}

function ActivityTab({
  notes,
  consultations,
  onAdd,
}: {
  notes: AnalysisNote[];
  consultations: AnalysisLogDetail["consultations"];
  onAdd: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      await onAdd(text.trim());
      setText("");
    });
  };

  // 모든 활동을 하나의 타임라인으로 합침
  const activities: ActivityItem[] = [];

  // notes → activity items
  for (const note of notes) {
    const noteType = note.type;
    let type: ActivityItem["type"] = "comment";
    let icon = "\uD83D\uDC64"; // 👤
    if (noteType === "system" || note.author === "시스템") {
      type = "system";
      icon = "\uD83E\uDD16"; // 🤖
    } else if (noteType === "status_change") {
      type = "status_change";
      icon = "\uD83D\uDD04"; // 🔄
    } else if (noteType === "consultation") {
      type = "consultation";
      icon = "\uD83D\uDCE9"; // 📩
    }
    activities.push({
      id: note.id,
      type,
      icon,
      author: note.author,
      text: note.text,
      created_at: note.created_at,
    });
  }

  // consultations → activity items
  for (const c of consultations) {
    activities.push({
      id: `consultation-${c.id}`,
      type: "consultation",
      icon: "\uD83D\uDCE9", // 📩
      author: "상담 신청",
      text: `${c.contact_name} (${c.contact_phone}) 상담 신청${c.message ? `\n"${c.message}"` : ""}`,
      created_at: c.created_at,
    });
  }

  // 시간순 정렬 (최신 위)
  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 중복 제거 (같은 상담 신청이 notes에도 있을 수 있음)
  const seen = new Set<string>();
  const uniqueActivities = activities.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const typeStyles: Record<string, string> = {
    comment: "bg-blue-100 text-blue-600",
    system: "bg-gray-100 text-gray-600",
    consultation: "bg-emerald-100 text-emerald-600",
    status_change: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="코멘트를 입력하세요..."
          className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "저장중..." : "등록"}
        </button>
      </form>

      {/* Timeline */}
      {uniqueActivities.length === 0 ? (
        <EmptyTab message="아직 활동 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {uniqueActivities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${typeStyles[activity.type] ?? typeStyles.comment}`}>
                {activity.icon}
              </div>
              <div className="flex-1 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{activity.author}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTimeFull(activity.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{activity.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

// ═════════════════════════════════════
// Main Page
// ═════════════════════════════════════

const TABS = [
  { key: "analysis", label: "분석 결과" },
  { key: "seo", label: "SEO 진단" },
  { key: "keywords", label: "키워드 순위" },
  { key: "activity", label: "활동 기록" },
] as const;

export default function AnalysisLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [detail, setDetail] = useState<AnalysisLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("analysis");
  const [statusOpen, setStatusOpen] = useState(false);

  // Contact editing
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ contact_name: "", contact_phone: "", contact_email: "" });
  const [isPending, startTransition] = useTransition();

  // Sales agent & client dropdowns
  const [agents, setAgents] = useState<Array<{ ref_code: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; brand_name: string; status: string }>>([]);

  const fetchDetail = useCallback(async () => {
    const [data, agentsList, clientsList] = await Promise.all([
      getAnalysisLogDetail(id),
      getSalesAgentsList(),
      getClientsList(),
    ]);
    if (data) {
      setDetail(data);
      setContactForm({
        contact_name: data.contact_name ?? "",
        contact_phone: data.contact_phone ?? "",
        contact_email: data.contact_email ?? "",
      });
    }
    setAgents(agentsList);
    setClients(clientsList);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleStatusChange = async (newStatus: string) => {
    if (!detail) return;
    setDetail({ ...detail, lead_status: newStatus });
    setStatusOpen(false);
    await updateLeadStatus(id, newStatus);
  };

  const handleSaveContact = () => {
    startTransition(async () => {
      await updateAnalysisContact(id, contactForm);
      setEditingContact(false);
      await fetchDetail();
    });
  };

  const handleAssignSalesAgent = async (salesRef: string | null) => {
    if (!detail) return;
    const agentName = salesRef ? (agents.find(a => a.ref_code === salesRef)?.name ?? salesRef) : null;
    setDetail({ ...detail, sales_ref: salesRef, sales_agent_name: agentName });
    await assignSalesAgent(id, salesRef);
  };

  const handleAssignClient = async (clientId: string | null) => {
    if (!detail) return;
    setDetail({ ...detail, client_id: clientId });
    await assignToClient(id, clientId);
    await fetchDetail();
  };

  const handleAddNote = async (text: string) => {
    await addAnalysisNote(id, "관리자", text);
    await fetchDetail();
  };

  const handleCopyResultLink = () => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/analysis/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("분석 결과 링크가 복사되었습니다");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">분석 로그를 찾을 수 없습니다.</p>
        <button onClick={() => router.push("/ops/analysis-logs")} className="text-sm text-primary hover:underline">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[detail.lead_status] ?? STATUS_CONFIG.new;
  const activityCount = detail.notes.length + detail.consultations.length;

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/ops/analysis-logs")} className="text-muted-foreground hover:text-foreground text-sm">
          &larr; 목록
        </button>
        <h1 className="text-2xl font-bold">{detail.place_name}</h1>
        <span className="text-sm text-muted-foreground">{detail.category}</span>
      </div>

      {/* ── Top summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 점수 + 상태 + 영업사원 + 브랜드 계정 */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <ScoreBadge score={detail.marketing_score} />
            <div className="relative">
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer hover:shadow-sm ${statusCfg.bg} ${statusCfg.color}`}
              >
                {statusCfg.label} <span className="text-[10px]">&#9662;</span>
              </button>
              {statusOpen && (
                <div className="absolute z-50 mt-1 right-0 bg-white border rounded-lg shadow-lg py-1 min-w-[110px]">
                  {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${c.color} ${key === detail.lead_status ? "font-bold" : ""}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">영업사원</span>
              <select
                value={detail.sales_ref ?? ""}
                onChange={(e) => handleAssignSalesAgent(e.target.value || null)}
                className="text-sm font-medium bg-transparent border-0 text-right cursor-pointer hover:text-primary"
              >
                <option value="">미배정</option>
                {agents.map(a => (
                  <option key={a.ref_code} value={a.ref_code}>{a.name} ({a.ref_code})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">브랜드 계정</span>
              <select
                value={detail.client_id ?? ""}
                onChange={(e) => handleAssignClient(e.target.value || null)}
                className="text-sm font-medium bg-transparent border-0 text-right cursor-pointer hover:text-primary max-w-[180px] truncate"
              >
                <option value="">미할당</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.brand_name} ({c.status})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">조회수</span>
              <span className="font-medium">{detail.view_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">분석일</span>
              <span className="font-medium">{formatDate(detail.analyzed_at)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: 연락처 */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">연락처</h3>
            {!editingContact && (
              <button
                onClick={() => setEditingContact(true)}
                className="text-xs text-primary hover:underline"
              >
                수정
              </button>
            )}
          </div>
          {editingContact ? (
            <div className="space-y-2">
              <input
                value={contactForm.contact_name}
                onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                placeholder="이름"
                className="w-full h-8 px-2 rounded border bg-background text-sm"
              />
              <input
                value={contactForm.contact_phone}
                onChange={(e) => setContactForm({ ...contactForm, contact_phone: e.target.value })}
                placeholder="전화번호"
                className="w-full h-8 px-2 rounded border bg-background text-sm"
              />
              <input
                value={contactForm.contact_email}
                onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })}
                placeholder="이메일"
                className="w-full h-8 px-2 rounded border bg-background text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveContact}
                  disabled={isPending}
                  className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                >
                  {isPending ? "저장중..." : "저장"}
                </button>
                <button
                  onClick={() => setEditingContact(false)}
                  className="px-3 py-1 rounded border text-xs"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">이름</span>
                <span className="font-medium">{detail.contact_name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">전화</span>
                <span className="font-medium">{detail.contact_phone || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="font-medium">{detail.contact_email || "-"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: 링크 */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">분석 결과 링크</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded truncate">
                {getBaseUrl()}/analysis/{id}
              </code>
              <button
                onClick={handleCopyResultLink}
                className="shrink-0 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                복사
              </button>
            </div>
            <div className="pt-3 border-t">
              <a
                href={detail.input_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline break-all"
              >
                원본: {detail.input_url}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.key === "activity" && activityCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
                  {activityCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div>
        {activeTab === "analysis" && <AnalysisTab detail={detail} />}
        {activeTab === "seo" && <SeoAuditTab seoAudit={detail.seo_audit} />}
        {activeTab === "keywords" && <KeywordRankingsTab rankings={detail.keyword_rankings} />}
        {activeTab === "activity" && <ActivityTab notes={detail.notes} consultations={detail.consultations} onAdd={handleAddNote} />}
      </div>
    </div>
  );
}
