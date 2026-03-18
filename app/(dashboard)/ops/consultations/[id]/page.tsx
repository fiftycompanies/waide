"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getConsultationDetail,
  updateConsultationStatus,
  addConsultationNote,
  updateConsultationContact,
  assignConsultationAgent,
  updateConsultationFollowUp,
  getConsultationAgentsList,
} from "@/lib/actions/consultation-crm-actions";
import type { ConsultationDetail, ConsultationNote } from "@/lib/actions/consultation-crm-actions";

// ── 상태 뱃지 ──

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "대기", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  contacted: { label: "연락완료", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  consulting: { label: "상담중", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  contracted: { label: "계약", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  converted: { label: "전환", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  closed: { label: "종료", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

const NOTE_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  comment: { icon: "💬", color: "border-blue-200 bg-blue-50/50" },
  system: { icon: "⚙️", color: "border-gray-200 bg-gray-50/50" },
  status_change: { icon: "🔄", color: "border-amber-200 bg-amber-50/50" },
  follow_up: { icon: "📅", color: "border-purple-200 bg-purple-50/50" },
};

// ═══════════════════════════════════════════
// Detail Page
// ═══════════════════════════════════════════

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [detail, setDetail] = useState<ConsultationDetail | null>(null);
  const [agents, setAgents] = useState<Array<{ ref_code: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 연락처 편집
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "" });

  // 후속 일정
  const [followUpInput, setFollowUpInput] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [detailResult, agentsList] = await Promise.all([
      getConsultationDetail(id),
      getConsultationAgentsList(),
    ]);
    setDetail(detailResult);
    setAgents(agentsList);
    if (detailResult) {
      setContactForm({
        name: detailResult.contact_name,
        phone: detailResult.contact_phone,
        email: detailResult.contact_email ?? "",
      });
      setFollowUpInput(detailResult.follow_up_date?.split("T")[0] ?? "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (newStatus: string) => {
    if (!detail) return;
    setDetail({ ...detail, status: newStatus });
    await updateConsultationStatus(id, newStatus);
    fetchData();
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || submitting) return;
    setSubmitting(true);
    await addConsultationNote(id, "어드민", noteText);
    setNoteText("");
    setSubmitting(false);
    fetchData();
  };

  const handleSaveContact = async () => {
    await updateConsultationContact(id, {
      contact_name: contactForm.name,
      contact_phone: contactForm.phone,
      contact_email: contactForm.email || undefined,
    });
    setEditingContact(false);
    fetchData();
  };

  const handleAssignAgent = async (ref: string | null) => {
    await assignConsultationAgent(id, ref);
    fetchData();
  };

  const handleSetFollowUp = async () => {
    await updateConsultationFollowUp(id, followUpInput || null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-muted-foreground">상담 정보를 찾을 수 없습니다</p>
        <button onClick={() => router.push("/ops/consultations")} className="mt-4 text-sm text-primary hover:underline">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending;

  return (
    <div className="p-6 space-y-6">
      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/ops/consultations" className="text-sm text-muted-foreground hover:text-foreground">
              ← 상담 목록
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {detail.brand_name ?? "상담 상세"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(detail.created_at)} 신청
            {detail.marketing_score !== null && (
              <span className={`ml-2 font-semibold ${
                detail.marketing_score >= 70 ? "text-green-600" : detail.marketing_score >= 50 ? "text-yellow-600" : "text-red-600"
              }`}>
                마케팅 점수: {detail.marketing_score}
              </span>
            )}
          </p>
        </div>

        {/* 상태 드롭다운 */}
        <div className="flex items-center gap-3">
          <select
            value={detail.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`h-9 rounded-lg border px-3 text-sm font-medium ${cfg.color}`}
          >
            {Object.entries(STATUS_CONFIG)
              .filter(([k]) => k !== "converted")
              .map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 왼쪽: 상담 정보 + 활동 기록 ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 상담 내용 */}
          {detail.message && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2">상담 메시지</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.message}</p>
            </div>
          )}

          {/* 관심 항목 */}
          {detail.interested_items.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">관심 마케팅 항목</h3>
              <div className="flex flex-wrap gap-2">
                {detail.interested_items.map((item, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 활동 기록 */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">활동 기록</h3>

            {/* 메모 입력 */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="메모를 입력하세요..."
                className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleAddNote(); }}
              />
              <button
                onClick={handleAddNote}
                disabled={submitting || !noteText.trim()}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                추가
              </button>
            </div>

            {/* 타임라인 */}
            <div className="space-y-3">
              {detail.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">아직 활동 기록이 없습니다</p>
              ) : (
                detail.notes.map((note: ConsultationNote) => {
                  const typeCfg = NOTE_TYPE_CONFIG[note.type ?? "comment"] ?? NOTE_TYPE_CONFIG.comment;
                  return (
                    <div
                      key={note.id}
                      className={`border rounded-lg p-3 ${typeCfg.color}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{typeCfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{note.author}</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(note.created_at)}</span>
                          </div>
                          <p className="text-sm mt-0.5">{note.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 사이드바 ── */}
        <div className="space-y-4">

          {/* 연락처 */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">연락처</h3>
              <button
                onClick={() => setEditingContact(!editingContact)}
                className="text-xs text-primary hover:underline"
              >
                {editingContact ? "취소" : "수정"}
              </button>
            </div>
            {editingContact ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="이름"
                  className="w-full h-8 rounded border bg-background px-2 text-sm"
                />
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="전화번호"
                  className="w-full h-8 rounded border bg-background px-2 text-sm"
                />
                <input
                  type="text"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="이메일"
                  className="w-full h-8 rounded border bg-background px-2 text-sm"
                />
                <button
                  onClick={handleSaveContact}
                  className="w-full h-8 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">이름</span>
                  <p className="font-medium">{detail.contact_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">전화번호</span>
                  <p className="font-medium">{detail.contact_phone}</p>
                </div>
                {detail.contact_email && (
                  <div>
                    <span className="text-muted-foreground text-xs">이메일</span>
                    <p className="font-medium">{detail.contact_email}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 담당자 배정 */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">담당자</h3>
            <select
              value={detail.assigned_to ?? ""}
              onChange={(e) => handleAssignAgent(e.target.value || null)}
              className="w-full h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">미배정</option>
              {agents.map((a) => (
                <option key={a.ref_code} value={a.ref_code}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* 후속 일정 */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">후속 일정</h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm"
              />
              <button
                onClick={handleSetFollowUp}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
              >
                설정
              </button>
            </div>
            {detail.follow_up_date && (
              <p className="text-xs text-muted-foreground mt-2">
                예정: {new Date(detail.follow_up_date).toLocaleDateString("ko-KR")}
              </p>
            )}
          </div>

          {/* 분석 연결 */}
          {detail.analysis_id && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">분석 연결</h3>
              <div className="space-y-2 text-sm">
                {detail.analysis_place_name && (
                  <p className="text-muted-foreground">{detail.analysis_place_name}</p>
                )}
                <Link
                  href={`/ops/analysis-logs/${detail.analysis_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  분석 상세 보기 →
                </Link>
              </div>
            </div>
          )}

          {/* 채널 */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-2">유입 채널</h3>
            <p className="text-sm">
              {detail.channel === "web" ? "웹 분석결과" : detail.channel === "dashboard" ? "대시보드" : detail.channel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
