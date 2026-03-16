"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Phone,
  Clock,
  Globe,
  Star,
  Tag,
  FileText,
  MessageSquare,
  Send,
  Pencil,
  Save,
  X,
  ExternalLink,
  Search,
  Award,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  MessageCircle,
  ClipboardList,
  Camera,
  Image as ImageIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScoreGauge } from "@/components/analysis/ScoreGauge";

// ═══════════════════════════════════════════
// Source Badge Component
// ═══════════════════════════════════════════

const SOURCE_COLORS: Record<string, string> = {
  "행정구역": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "생활권":   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "근교":     "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "관광지":   "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "해시태그": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "브랜드":   "bg-red-500/20 text-red-300 border-red-500/30",
};

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === "-") return <span className="text-xs text-[#666666]">-</span>;
  const cls = SOURCE_COLORS[source] ?? "bg-[#2a2a2a] text-[#a0a0a0] border-[#2a2a2a]";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {source}
    </span>
  );
}

// ═══════════════════════════════════════════
// Consultation Modal
// ═══════════════════════════════════════════

function ConsultationModal({
  analysisId,
  salesRef,
  onClose,
}: {
  analysisId: string;
  salesRef?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.contactPhone) return;
    setSubmitting(true);
    try {
      await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, salesRef: salesRef || undefined, ...form }),
      });
      setDone(true);
    } catch {
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#10b981]/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#10b981]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">신청이 완료되었습니다!</h3>
          <p className="text-[#a0a0a0] mb-6">곧 연락드릴게요 😊</p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-semibold transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">무료 상담 신청</h3>
          <button onClick={onClose} className="text-[#666666] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-[#a0a0a0] mb-1.5 block">이름 <span className="text-red-400">*</span></label>
            <input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full h-11 px-4 rounded-lg bg-[#111111] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[#a0a0a0] mb-1.5 block">전화번호 <span className="text-red-400">*</span></label>
            <input
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full h-11 px-4 rounded-lg bg-[#111111] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
              placeholder="010-0000-0000"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[#a0a0a0] mb-1.5 block">이메일</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full h-11 px-4 rounded-lg bg-[#111111] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-[#a0a0a0] mb-1.5 block">문의 내용</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-[#111111] border border-[#2a2a2a] text-white text-sm min-h-[80px] focus:outline-none focus:border-[#10b981] transition-colors"
              placeholder="궁금한 점이 있으시면 적어주세요"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "전송 중..." : "상담 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab Button
// ═══════════════════════════════════════════

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30"
          : "text-[#666666] hover:text-[#a0a0a0] border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════
// Main Result Page
// ═══════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = any;

export default function AnalysisResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPortal = searchParams.get("from") === "portal";
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConsultation, setShowConsultation] = useState(false);
  const [activeTab, setActiveTab] = useState("review");
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState({
    mainMenu: "",
    strength: "",
    targetCustomer: "",
    additionalKeywords: "",
  });
  const [savingEdits, setSavingEdits] = useState(false);
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [refineData, setRefineData] = useState({
    keywords: [] as string[],
    strengths: "",
    appeal: "",
    target: "",
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [refining, setRefining] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await fetch(`/api/analyze/${id}`);
        if (!resp.ok) { router.replace("/"); return; }
        const result = await resp.json();
        if (result.status === "analyzing" || result.status === "pending") {
          router.replace(`/analysis/loading?url=${encodeURIComponent(result.input_url)}`);
          return;
        }
        if (result.status === "failed") { router.replace("/"); return; }
        setData(result);
        if (result.customer_edits) setEdits(result.customer_edits);
        // 보완 패널 프리필
        const rka = result.keyword_analysis ?? {};
        const rra = result.review_analysis ?? {};
        const existingRefined = result.refined_keywords as string[] | null;
        const mainKws = [rka.main_keyword, rka.secondary_keyword, rka.tertiary_keyword].filter(Boolean);
        setRefineData({
          keywords: existingRefined?.length ? existingRefined : mainKws.slice(0, 5),
          strengths: (result.refined_strengths as string) || (rra.selling_points ?? []).join(", "),
          appeal: (result.refined_appeal as string) || "",
          target: (result.refined_target as string) || "",
        });
      } catch { router.replace("/"); } finally { setLoading(false); }
    };
    fetchData();
  }, [id, router]);

  const handleSaveEdits = async () => {
    setSavingEdits(true);
    try {
      await fetch(`/api/analyze/${id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      setEditMode(false);
    } catch { alert("저장 실패. 다시 시도해주세요."); } finally { setSavingEdits(false); }
  };

  const handleRefine = async () => {
    if (refineData.keywords.length === 0) {
      alert("키워드를 1개 이상 입력해주세요.");
      return;
    }
    setRefining(true);
    try {
      const resp = await fetch(`/api/analyze/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refineData),
      });
      if (!resp.ok) throw new Error("refine failed");
      // 재분석 시작됨 → 로딩 페이지로 이동
      router.push(`/analysis/loading?url=${encodeURIComponent(data?.input_url || "")}&id=${id}`);
    } catch {
      alert("재분석 요청 실패. 다시 시도해주세요.");
    } finally {
      setRefining(false);
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw || refineData.keywords.length >= 5) return;
    if (refineData.keywords.includes(kw)) { setNewKeyword(""); return; }
    setRefineData({ ...refineData, keywords: [...refineData.keywords, kw] });
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setRefineData({ ...refineData, keywords: refineData.keywords.filter((k) => k !== kw) });
  };

  const handleStartProject = async () => {
    // localStorage에 analysis_id 저장 (로그인/가입 플로우 생존)
    if (typeof window !== "undefined") {
      localStorage.setItem("waide_analysis_id", id);
      localStorage.setItem("pending_analysis_id", id);
    }

    // Supabase 세션 체크
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // 로그인된 상태 → 바로 온보딩으로
        router.push(`/onboarding/refine?analysis_id=${id}`);
        return;
      }
    } catch {
      // 세션 확인 실패 → 모달 표시
    }

    // 비로그인 → 모달 표시
    setShowLoginModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-[#10b981]/30 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const bi = data.basic_info ?? {};
  const ka = data.keyword_analysis ?? {};
  const cs = data.content_strategy ?? {};
  const ba = cs.brand_analysis ?? {};
  const ma = data.menu_analysis ?? {};
  const ra = data.review_analysis ?? {};
  const ia = data.image_analysis ?? {};
  const score = data.marketing_score ?? 0;
  const breakdown = cs.score_breakdown ?? {};
  const hasImageAnalysis = (ia.analyzed_count ?? 0) > 0;
  const imageList: Array<{
    url: string;
    description?: string;
    type?: string;
    mood?: string;
    quality_score?: number;
    marketing_usability?: number;
    colors?: string[];
    food_appeal?: number;
    improvement_tip?: string;
  }> = ia.images ?? [];
  const collectedUrls: Array<{ url: string; type?: string }> = ia.collected_urls ?? [];
  // ka.keywords 우선, 비어있으면 current_keywords + recommended_keywords 폴백 (웹사이트 분석 호환)
  const rawKeywords = (ka.keywords ?? []) as Array<{
    keyword: string;
    intent: string;
    priority: string;
    monthlySearch?: number;
    competition?: string;
    source?: string;
  }>;
  const fallbackKeywords: typeof rawKeywords =
    rawKeywords.length > 0
      ? rawKeywords
      : [
          ...((ka.current_keywords ?? []) as string[]).map((kw: string) => ({ keyword: kw, intent: "현재 노출", priority: "high" as const, source: "현재" })),
          ...((ka.recommended_keywords ?? []) as string[]).map((kw: string) => ({ keyword: kw, intent: "추천", priority: "medium" as const, source: "AI 추천" })),
        ];
  const keywords = [...fallbackKeywords].sort(
    (a: { monthlySearch?: number }, b: { monthlySearch?: number }) =>
      (b.monthlySearch ?? 0) - (a.monthlySearch ?? 0)
  );
  const improvements = (cs.improvements ?? []) as string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seoAudit = data.seo_audit as { items: any[]; totalIssues: number; criticalIssues: number; score: number } | null;
  const kwRankings = (data.keyword_rankings ?? []) as Array<{
    keyword: string; searchVolume: number; rank: number | null;
    status: "good" | "warning" | "danger" | "not_found";
  }>;

  const isWebsite = data.url_type === "website";

  // ── 에이전트 체인 결과 (analysis_result JSONB) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysisResult = (data.analysis_result ?? {}) as Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitorAnalysis = analysisResult.competitor_analysis as Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitorRawData = (analysisResult.competitor_raw_data ?? []) as Array<Record<string, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seoComments = analysisResult.seo_comments as Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const improvementPlan = analysisResult.improvement_plan as Record<string, any> | null;

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* ── 포털에서 진입한 경우 복귀 링크 ── */}
        {fromPortal && (
          <button
            onClick={() => router.push("/portal")}
            className="mb-6 flex items-center gap-2 text-sm text-[#10b981] hover:text-[#34d399] transition-colors"
          >
            <span>←</span>
            <span>포털 대시보드로 돌아가기</span>
          </button>
        )}
        {/* ── Section 1: 매장 요약 ── */}
        <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {bi.name || "매장명"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                  {bi.category || "카테고리"}
                </span>
                {bi.region && (
                  <span className="px-3 py-1 rounded-full text-xs text-[#a0a0a0] border border-[#2a2a2a] flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {bi.region}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#a0a0a0]">
                {bi.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#666666]" />
                    <span>{bi.address}</span>
                  </div>
                )}
                {bi.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#666666]" />
                    <span>{bi.phone}</span>
                  </div>
                )}
                {bi.hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#666666]" />
                    <span>{bi.hours}</span>
                  </div>
                )}
                {bi.homepage_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#666666]" />
                    <a href={bi.homepage_url} target="_blank" rel="noreferrer" className="text-[#10b981] hover:underline truncate">
                      홈페이지 <ExternalLink className="inline h-3 w-3 ml-0.5" />
                    </a>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="text-white font-medium">방문자 리뷰 {(bi.visitor_reviews ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-white font-medium">블로그 리뷰 {(bi.blog_reviews ?? 0).toLocaleString()}</span>
                </div>
                {bi.image_count > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4 text-purple-400" />
                    <span className="text-white font-medium">이미지 {bi.image_count.toLocaleString()}장</span>
                  </div>
                )}
                {bi.nearby_competitors > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-red-400" />
                    <span className="text-white font-medium">주변 경쟁업체 {bi.nearby_competitors}곳</span>
                  </div>
                )}
              </div>
              {(bi.facilities ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(bi.facilities as string[]).map((f: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-[#111111] text-[#a0a0a0] border border-[#2a2a2a]">{f}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <p className="text-xs text-[#666666] mb-2">마케팅 종합 점수</p>
              <ScoreGauge score={score} />
              <p className="text-sm text-[#a0a0a0] mt-2">
                {score >= 70 ? "우수한 편이에요!" : score >= 40 ? "개선 여지가 있어요" : "마케팅 강화가 필요해요"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 1.5: 전문가 진단 (SEO + 키워드 순위) ── */}
        {(seoAudit || kwRankings.length > 0) && (
          <div className="mb-8 grid md:grid-cols-2 gap-4">
            {/* SEO 진단 카드 */}
            {seoAudit && (
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-400" />
                  {isWebsite ? "웹사이트 SEO 기술 진단" : "플레이스 SEO 진단"}
                </h3>
                <p className="text-xs text-[#666666] mb-4">
                  진단 점수{" "}
                  <span className={`font-bold ${seoAudit.score >= 70 ? "text-[#10b981]" : seoAudit.score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {seoAudit.score}점
                  </span>
                  {seoAudit.criticalIssues > 0 && <span className="text-red-400 ml-2">결격 {seoAudit.criticalIssues}건</span>}
                  {seoAudit.totalIssues > 0 && <span className="text-amber-400 ml-2">개선 {seoAudit.totalIssues}건</span>}
                </p>
                <div className="space-y-2">
                  {seoAudit.items.map((item: { label: string; value: string; status: string; detail: string }, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111111] border border-[#2a2a2a]">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${
                        item.status === "good" ? "bg-[#10b981]" :
                        item.status === "warning" ? "bg-amber-400" :
                        item.status === "danger" ? "bg-red-500" : "bg-[#666666]"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#a0a0a0]">{item.label}</span>
                          <span className={`text-xs font-medium ${
                            item.status === "good" ? "text-[#10b981]" :
                            item.status === "warning" ? "text-amber-400" :
                            item.status === "danger" ? "text-red-400" : "text-[#666666]"
                          }`}>{item.value}</span>
                        </div>
                        <p className="text-[10px] text-[#666666] truncate">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 키워드 순위 카드 */}
            {kwRankings.length > 0 && (
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-400" />
                  키워드 순위 현황
                </h3>
                <p className="text-xs text-[#666666] mb-4">네이버 로컬 검색 기준 TOP 3</p>
                <div className="space-y-3">
                  {kwRankings.map((kw, i) => {
                    const rankColor = kw.status === "good" ? "text-[#10b981]" :
                      kw.status === "warning" ? "text-amber-400" :
                      kw.status === "danger" ? "text-red-400" : "text-[#666666]";
                    return (
                      <div key={i} className="p-3 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-white font-medium">{kw.keyword}</span>
                          <span className={`text-lg font-bold ${rankColor}`}>
                            {kw.rank !== null ? `${kw.rank}위` : "미노출"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#666666]">월간 검색량 {(kw.searchVolume ?? 0).toLocaleString()}</span>
                          <span className={`font-medium ${rankColor}`}>
                            {kw.rank !== null && kw.rank <= 5 ? "상위 노출" :
                             kw.rank !== null && kw.rank <= 20 ? "노출 중" :
                             kw.rank !== null ? "하위 노출" : "50위 밖"}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              kw.status === "good" ? "bg-[#10b981]" :
                              kw.status === "warning" ? "bg-amber-400" :
                              kw.status === "danger" ? "bg-red-500" : "bg-[#666666]"
                            }`}
                            style={{ width: `${kw.rank !== null ? Math.max(5, 100 - (kw.rank - 1) * 2) : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SNS/채널 부족 시 블로그/홈페이지 유도 배너 ── */}
        {seoAudit && (() => {
          const snsItem = seoAudit.items.find((item: { label: string; status: string }) =>
            item.label === "SNS/채널 연동"
          );
          const snsStatus = snsItem?.status;
          if (snsStatus === "danger" || snsStatus === "warning") {
            return (
              <div className="mb-8 p-5 bg-[#10b981]/5 border border-[#10b981]/20 rounded-2xl">
                <p className="text-sm text-[#10b981] font-semibold mb-1">
                  자체 블로그 또는 홈페이지가 필요합니다
                </p>
                <p className="text-xs text-[#a0a0a0] mb-3">
                  네이버 플레이스만으로는 검색 노출에 한계가 있습니다. 자체 블로그나 홈페이지를 통해 SEO를 강화하면 키워드 노출이 크게 향상됩니다.
                </p>
                <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                  <p className="text-xs text-[#10b981] font-medium">
                    Waide에서 고퀄리티 블로그 & 홈페이지를 제작해 드립니다
                  </p>
                  <p className="text-[10px] text-[#a0a0a0] mt-1">
                    자체 온라인 채널이 없으면 플레이스 순위 경쟁에서 불리합니다. 블로그와 홈페이지로 검색 노출을 3배 이상 늘릴 수 있습니다.
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ── Website: 브랜드 분석 + 키워드 전략 + 개선 액션플랜 ── */}
        {isWebsite && ba && (
          <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              브랜드 분석
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {ba.tone && (
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                  <p className="text-xs text-[#666666] mb-1">브랜드 톤</p>
                  <p className="text-sm text-white font-medium">{ba.tone.style}</p>
                  {ba.tone.personality && <p className="text-xs text-[#a0a0a0] mt-1">{ba.tone.personality}</p>}
                </div>
              )}
              {ba.target_audience && (
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                  <p className="text-xs text-[#666666] mb-1">타겟 고객</p>
                  <p className="text-sm text-white font-medium">{ba.target_audience.primary}</p>
                  {ba.target_audience.search_intent && <p className="text-xs text-[#a0a0a0] mt-1">검색 의도: {ba.target_audience.search_intent}</p>}
                </div>
              )}
              {ba.usp && (ba.usp as string[]).length > 0 && (
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                  <p className="text-xs text-[#666666] mb-2">차별화 포인트 (USP)</p>
                  <div className="space-y-1">
                    {(ba.usp as string[]).map((u: string, i: number) => (
                      <p key={i} className="text-sm text-[#a0a0a0] flex items-start gap-2">
                        <span className="text-[#10b981] mt-0.5 shrink-0">•</span>
                        {u}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {ba.content_angles && (ba.content_angles as string[]).length > 0 && (
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                  <p className="text-xs text-[#666666] mb-2">콘텐츠 방향</p>
                  <div className="space-y-1">
                    {(ba.content_angles as string[]).map((a: string, i: number) => (
                      <p key={i} className="text-sm text-[#a0a0a0] flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        {a}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {ba.target_audience?.pain_points && (ba.target_audience.pain_points as string[]).length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-amber-400 mb-2 font-medium">고객 고충 포인트</p>
                <div className="flex flex-wrap gap-2">
                  {(ba.target_audience.pain_points as string[]).map((p: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Website: 개선 액션플랜 ── */}
        {isWebsite && improvements.length > 0 && (
          <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              개선 액션플랜
            </h3>
            <div className="space-y-2">
              {improvements.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#111111] border border-[#2a2a2a] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <p className="text-sm text-[#a0a0a0]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 2: 심층 분석 (Custom Tabs) — 네이버 플레이스만 ── */}
        {!isWebsite && <div className="mb-8">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            <TabButton active={activeTab === "review"} onClick={() => setActiveTab("review")}>리뷰 분석</TabButton>
            <TabButton active={activeTab === "menu"} onClick={() => setActiveTab("menu")}>메뉴/가격</TabButton>
            <TabButton active={activeTab === "image"} onClick={() => setActiveTab("image")}>이미지 분석</TabButton>
            <TabButton active={activeTab === "score"} onClick={() => setActiveTab("score")}>점수 상세</TabButton>
          </div>

          {activeTab === "review" && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#10b981]" />
                고객 강점 TOP
              </h3>
              <div className="space-y-3">
                {(ra.selling_points ?? []).map((point: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] text-xs font-bold">{i + 1}</div>
                    <span className="text-[#a0a0a0]">{point}</span>
                  </div>
                ))}
              </div>
              {(ra.usp ?? []).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-[#666666] mb-3">USP (핵심 차별화)</h4>
                  <div className="flex flex-wrap gap-2">
                    {(ra.usp ?? []).map((u: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs border border-[#10b981]/30 text-[#10b981]">{u}</span>
                    ))}
                  </div>
                </div>
              )}
              {(ra.review_keywords ?? []).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-[#666666] mb-3">리뷰 키워드 TOP {(ra.review_keywords as Array<{ keyword: string; count: number }>).length}</h4>
                  <div className="flex flex-wrap gap-2">
                    {(ra.review_keywords as Array<{ keyword: string; count: number }>).map((rk, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {rk.keyword} <span className="text-blue-400/60 ml-0.5">{rk.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "menu" && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-400" />
                시그니처 메뉴/상품
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {(ma.signature_products ?? []).map((item: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">{item}</span>
                ))}
              </div>
              {ma.price_position && (
                <div>
                  <h4 className="text-sm text-[#666666] mb-1">가격 포지셔닝</h4>
                  <p className="text-white">{ma.price_position}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "image" && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#10b981]" />
                이미지 분석
              </h3>

              {hasImageAnalysis ? (
                <>
                  {/* 종합 분석 카드 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-[#111111] border border-[#2a2a2a] text-center">
                      <p className="text-[10px] text-[#666666] mb-1">총 이미지</p>
                      <p className="text-lg font-bold text-white">{ia.total_images ?? 0}<span className="text-xs text-[#666666]">장</span></p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#111111] border border-[#2a2a2a] text-center">
                      <p className="text-[10px] text-[#666666] mb-1">분위기</p>
                      <p className="text-base font-semibold text-[#10b981]">{ia.dominant_mood || "-"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#111111] border border-[#2a2a2a] text-center">
                      <p className="text-[10px] text-[#666666] mb-1">평균 품질</p>
                      <p className="text-lg font-bold text-white">{(ia.avg_quality ?? 0).toFixed(1)}<span className="text-xs text-[#666666]">/10</span></p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#111111] border border-[#2a2a2a] text-center">
                      <p className="text-[10px] text-[#666666] mb-1">마케팅 활용도</p>
                      <p className="text-lg font-bold text-white">{(ia.avg_marketing_usability ?? 0).toFixed(1)}<span className="text-xs text-[#666666]">/10</span></p>
                    </div>
                  </div>

                  {/* 컬러 팔레트 */}
                  {(ia.color_palette ?? []).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm text-[#666666] mb-2 flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5" /> 주요 컬러톤
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(ia.color_palette as string[]).map((color: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-full text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 이미지 갤러리 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {imageList.map((img, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-[#2a2a2a] aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.description || `이미지 ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                img.type === "food" ? "border-amber-500/30 text-amber-400 bg-amber-500/10" :
                                img.type === "interior" ? "border-blue-500/30 text-blue-300 bg-blue-500/10" :
                                img.type === "exterior" ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" :
                                "border-[#2a2a2a] text-[#a0a0a0] bg-[#2a2a2a]"
                              }`}>
                                {img.type === "food" ? "음식" : img.type === "interior" ? "내부" : img.type === "exterior" ? "외부" : img.type === "menu" ? "메뉴" : img.type === "view" ? "전망" : img.type ?? "기타"}
                              </span>
                              {img.mood && <span className="text-[10px] text-[#a0a0a0]">{img.mood}</span>}
                            </div>
                            <p className="text-xs text-[#a0a0a0] line-clamp-2">{img.description}</p>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white">품질 <span className="text-[#10b981] font-bold">{img.quality_score}/10</span></span>
                            <span className="text-white">활용도 <span className="text-[#10b981] font-bold">{img.marketing_usability}/10</span></span>
                            {img.food_appeal && <span className="text-white">식욕 <span className="text-amber-400 font-bold">{img.food_appeal}/10</span></span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 개선 팁 */}
                  {(ia.improvement_tips ?? []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#10b981] mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> 이미지 개선 팁
                      </h4>
                      <div className="space-y-2">
                        {(ia.improvement_tips as string[]).map((tip: string, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-[#10b981]/5 border border-[#10b981]/10 flex items-start gap-2">
                            <span className="text-[#10b981] font-bold text-sm shrink-0">{i + 1}.</span>
                            <span className="text-sm text-[#a0a0a0]">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : collectedUrls.length > 0 ? (
                <>
                  <p className="text-[#a0a0a0] text-sm mb-4">
                    수집된 이미지 {ia.total_images ?? collectedUrls.length}장 중 미리보기입니다.
                    이미지 AI 분석을 활성화하면 품질 점수와 마케팅 활용도를 확인할 수 있어요.
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {collectedUrls.slice(0, 8).map((img, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-[#2a2a2a] aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`이미지 ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 rounded-xl bg-[#10b981]/5 border border-[#10b981]/10 text-center">
                    <ImageIcon className="h-6 w-6 text-[#10b981] mx-auto mb-2" />
                    <p className="text-sm text-[#a0a0a0]">
                      이미지 AI 분석을 활성화하면 더 정확한 마케팅 점수를 받을 수 있어요
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <ImageIcon className="h-10 w-10 text-[#666666] mx-auto mb-3" />
                  {ia.collection_failed ? (
                    <>
                      <p className="text-[#a0a0a0] text-sm mb-1">플레이스에 등록된 이미지가 없어요</p>
                      <p className="text-[#666666] text-xs">매장 사진을 네이버 플레이스에 등록하면 이미지 분석이 가능해요</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[#a0a0a0] text-sm mb-1">이미지를 수집하지 못했어요</p>
                      <p className="text-[#666666] text-xs">일시적인 오류일 수 있어요. 다시 분석하면 이미지를 가져올 수 있어요</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "score" && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-[#10b981]" />
                마케팅 점수 6개 영역 분석
              </h3>
              <div className="space-y-4">
                {[
                  { key: "review_reputation", label: "네이버 리뷰/평판", icon: "⭐" },
                  { key: "naver_keyword", label: "네이버 키워드 노출", icon: "🔍" },
                  { key: "google_keyword", label: "구글 키워드 노출", icon: "🌐" },
                  { key: "image_quality", label: "이미지 품질", icon: "📸" },
                  { key: "online_channels", label: "온라인 채널 완성도", icon: "📱" },
                  { key: "seo_aeo_readiness", label: "SEO/AEO 준비도", icon: "📊" },
                ].map(({ key, label, icon }) => {
                  const item = breakdown[key] ?? { score: 0, max: 0, details: "" };
                  const maxVal = item.max || 25;
                  const pct = maxVal > 0 ? (item.score / maxVal) * 100 : 0;
                  const isFuture = maxVal === 15 && item.score === 0 && (item.details ?? "").includes("예정");
                  const barColor = isFuture ? "bg-[#2a2a2a]" : pct >= 80 ? "bg-[#10b981]" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
                  // 네이버 키워드 노출 서브 점수
                  const hasSubScores = key === "naver_keyword" && item.place_score !== undefined;
                  return (
                    <div key={key} className={isFuture ? "opacity-40" : ""}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-[#a0a0a0]">{icon} {label}</span>
                        <span className="text-white font-medium">{isFuture ? "측정 예정" : `${item.score}/${maxVal}`}</span>
                      </div>
                      <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${isFuture ? 0 : pct}%` }} />
                      </div>
                      {hasSubScores ? (
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-xs text-[#666666]">
                            📍 플레이스 <span className="text-[#a0a0a0]">{item.place_score}/{item.place_max}</span>
                          </span>
                          <span className="text-xs text-[#666666]">
                            📝 블로그 <span className="text-[#a0a0a0]">{item.blog_score}/{item.blog_max}</span>
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-[#666666] mt-1">{isFuture ? "측정 예정" : (item.details ?? item.detail ?? "")}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {improvements.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-medium text-[#10b981] flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    개선하면 점수가 올라가요
                  </h4>
                  {improvements.slice(0, 5).map((tip: string, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-[#10b981]/5 border border-[#10b981]/10 flex items-start gap-3">
                      <span className="text-[#10b981] font-bold shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="text-sm text-[#a0a0a0]">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>}

        {/* ── Section 3: 키워드 분석 ── */}
        <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-400" />
            키워드 분석
          </h3>

          {/* Main keywords */}
          <div className="flex flex-wrap gap-3 mb-6">
            {ka.main_keyword && (
              <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[10px] text-blue-300">메인</span>
                <p className="text-lg font-bold text-blue-400">{ka.main_keyword}</p>
              </div>
            )}
            {ka.secondary_keyword && (
              <div className="px-4 py-2 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                <span className="text-[10px] text-[#666666]">2차</span>
                <p className="text-base font-medium text-[#a0a0a0]">{ka.secondary_keyword}</p>
              </div>
            )}
            {ka.tertiary_keyword && (
              <div className="px-4 py-2 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                <span className="text-[10px] text-[#666666]">3차</span>
                <p className="text-base font-medium text-[#a0a0a0]">{ka.tertiary_keyword}</p>
              </div>
            )}
          </div>

          {/* Keyword table / empty state */}
          {keywords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2a] text-[#666666]">
                      <th className="text-left py-3 px-2">키워드</th>
                      <th className="text-left py-3 px-2">검색 의도</th>
                      <th className="text-center py-3 px-2">월간 검색량</th>
                      <th className="text-center py-3 px-2">경쟁도</th>
                      <th className="text-center py-3 px-2">출처</th>
                      <th className="text-center py-3 px-2">우선순위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw, i) => (
                      <tr key={i} className="border-b border-[#2a2a2a]/50 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-2 text-white font-medium">{kw.keyword}</td>
                        <td className="py-3 px-2 text-[#a0a0a0]">{kw.intent}</td>
                        <td className="py-3 px-2 text-center text-[#a0a0a0]">{kw.monthlySearch ? kw.monthlySearch.toLocaleString() : "-"}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${kw.competition === "높음" ? "border-red-500/30 text-red-400" : kw.competition === "중간" ? "border-amber-500/30 text-amber-400" : "border-emerald-500/30 text-emerald-400"}`}>
                            {kw.competition ?? "-"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center"><SourceBadge source={kw.source} /></td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${kw.priority === "high" ? "bg-red-500/10 text-red-400" : kw.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-[#2a2a2a] text-[#666666]"}`}>
                            {kw.priority === "high" ? "높음" : kw.priority === "medium" ? "중간" : "낮음"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tag cloud */}
              <div className="mt-6">
                <h4 className="text-sm text-[#666666] mb-3">키워드 클라우드 (크기 = 검색량)</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  {keywords.map((kw, i) => {
                    const vol = kw.monthlySearch ?? 0;
                    const sz = vol >= 10000 ? "text-xl font-bold px-4 py-2" : vol >= 1000 ? "text-base font-semibold px-3 py-1.5" : vol >= 100 ? "text-sm px-3 py-1" : "text-xs px-2 py-1";
                    const srcCls = SOURCE_COLORS[kw.source ?? ""] ?? "bg-[#222222] text-[#a0a0a0] border-[#2a2a2a]";
                    return (
                      <span
                        key={i}
                        className={`${sz} rounded-full border cursor-default transition-all hover:scale-105 ${srcCls}`}
                        title={`${kw.keyword}\n검색량: ${vol.toLocaleString()}\n경쟁도: ${kw.competition ?? "-"}\n출처: ${kw.source ?? "-"}`}
                      >
                        {kw.keyword}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-[#333333] mx-auto mb-3" />
              <p className="text-[#666666] text-sm">키워드 분석 데이터가 아직 준비되지 않았습니다</p>
              <p className="text-[#444444] text-xs mt-1">프로젝트 시작 후 키워드를 등록하면 상세 분석이 제공됩니다</p>
            </div>
          )}
        </div>

        {/* ── Section 4: AI 콘텐츠 전략 ── */}
        <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            AI 콘텐츠 전략 제안
          </h3>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
              <h4 className="text-sm text-[#666666] mb-2">추천 콘텐츠 타입</h4>
              <div className="flex flex-wrap gap-2">
                {(cs.recommended_content_types ?? []).map((type: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">{type}</span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
              <h4 className="text-sm text-[#666666] mb-2">추천 발행 빈도</h4>
              <p className="text-white font-medium text-lg">{cs.posting_frequency ?? "주 2~3회"}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
              <h4 className="text-sm text-[#666666] mb-2">톤앤매너</h4>
              <p className="text-white font-medium">{ba.tone?.style ?? "-"}</p>
              <p className="text-xs text-[#666666] mt-1">{ba.tone?.personality ?? ""}</p>
            </div>
          </div>

          {cs.competitor_differentiation && (
            <div className="p-4 rounded-xl bg-[#10b981]/5 border border-[#10b981]/10 mb-6">
              <h4 className="text-sm text-[#10b981] mb-2">경쟁사 차별화 전략</h4>
              <p className="text-[#a0a0a0]">{cs.competitor_differentiation}</p>
            </div>
          )}

          <h4 className="text-sm text-[#666666] mb-3">콘텐츠 주제 아이디어</h4>
          <div className="grid md:grid-cols-2 gap-2">
            {(cs.content_angles ?? []).map((angle: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111111] border border-[#2a2a2a]">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">{i + 1}</div>
                <span className="text-[#a0a0a0] text-sm">{angle}</span>
              </div>
            ))}
          </div>

          {(ba.forbidden_terms ?? []).length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <h4 className="text-sm text-red-400 mb-2">콘텐츠 작성 시 주의 (금기 표현)</h4>
              <div className="flex flex-wrap gap-2">
                {(ba.forbidden_terms ?? []).map((term: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs border border-red-500/30 text-red-400">{term}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 5: 고객 보완 ── */}
        <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#666666]" />
              분석 결과를 보완해주세요
            </h3>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 rounded-lg text-sm border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#10b981]/30 transition-colors"
              >
                <Pencil className="inline h-3.5 w-3.5 mr-1" /> 수정하기
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditMode(false)} className="px-3 py-1.5 rounded-lg text-sm text-[#666666] hover:text-white transition-colors">취소</button>
                <button
                  onClick={handleSaveEdits}
                  disabled={savingEdits}
                  className="px-4 py-1.5 rounded-lg text-sm bg-[#10b981] hover:bg-[#34d399] text-white font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="inline h-3.5 w-3.5 mr-1" /> {savingEdits ? "저장 중..." : "저장"}
                </button>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: "mainMenu", label: "우리 매장 주력 메뉴/서비스", placeholder: "예: 숙성 소곱창, 양곱창 세트" },
              { key: "strength", label: "우리의 핵심 강점", placeholder: "예: 당일 손질한 신선한 재료" },
              { key: "targetCustomer", label: "타겟 고객층", placeholder: "예: 30~40대 직장인 회식" },
              { key: "additionalKeywords", label: "추가 공략 키워드", placeholder: "쉼표로 구분 (예: 잠실 맛집, 소곱창 맛집)" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm text-[#666666] mb-1.5 block">{label}</label>
                {editMode ? (
                  <input
                    value={edits[key as keyof typeof edits]}
                    onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-[#111111] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                    placeholder={placeholder}
                  />
                ) : (
                  <p className="text-[#a0a0a0] py-2 min-h-[40px] text-sm">
                    {edits[key as keyof typeof edits] || <span className="text-[#666666]">미입력</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 6: 경쟁사 비교 분석 (에이전트 결과) ── */}
        {!isWebsite && competitorAnalysis && (
          <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-amber-400" />
              경쟁사 비교 분석
            </h3>

            {/* 경쟁사 테이블 */}
            {(competitorAnalysis.competitors ?? competitorRawData)?.length > 0 && (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#666666] border-b border-[#2a2a2a]">
                      <th className="text-left py-2 px-3">순위</th>
                      <th className="text-left py-2 px-3">매장명</th>
                      <th className="text-left py-2 px-3">카테고리</th>
                      <th className="text-left py-2 px-3">강점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(competitorAnalysis.competitors ?? competitorRawData)?.slice(0, 5).map((comp: any, i: number) => (
                      <tr key={i} className="border-b border-[#2a2a2a]/50 hover:bg-[#111111]">
                        <td className="py-2.5 px-3 text-[#a0a0a0]">{comp.position ?? comp.rank ?? i + 1}위</td>
                        <td className="py-2.5 px-3 text-white font-medium">{comp.name}</td>
                        <td className="py-2.5 px-3 text-[#a0a0a0]">{comp.category ?? "-"}</td>
                        <td className="py-2.5 px-3 text-[#a0a0a0] text-xs">
                          {(comp.strengths ?? []).slice(0, 2).join(", ") || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 내 포지션 */}
            {competitorAnalysis.our_position && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                  <h4 className="text-sm text-[#10b981] mb-2">우리의 강점</h4>
                  <ul className="space-y-1">
                    {(competitorAnalysis.our_position.competitive_advantages ?? []).map((adv: string, i: number) => (
                      <li key={i} className="text-sm text-[#a0a0a0] flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981] mt-0.5 shrink-0" />
                        {adv}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                  <h4 className="text-sm text-amber-400 mb-2">보강 필요</h4>
                  <ul className="space-y-1">
                    {(competitorAnalysis.our_position.gaps_to_close ?? []).map((gap: string, i: number) => (
                      <li key={i} className="text-sm text-[#a0a0a0] flex items-start gap-2">
                        <ArrowRight className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {competitorAnalysis.differentiation_strategy && (
              <div className="mt-4 p-4 rounded-xl bg-[#10b981]/5 border border-[#10b981]/10">
                <h4 className="text-sm text-[#10b981] mb-1">차별화 전략</h4>
                <p className="text-sm text-[#a0a0a0]">{competitorAnalysis.differentiation_strategy}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Section 7: AI SEO 진단 코멘트 (에이전트 결과) ── */}
        {!isWebsite && seoComments && (
          <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Search className="h-5 w-5 text-blue-400" />
              AI SEO 진단 코멘트
            </h3>
            {seoComments.overall_diagnosis && (
              <p className="text-sm text-[#a0a0a0] mb-4">{seoComments.overall_diagnosis}</p>
            )}

            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(seoComments.priority_actions ?? []).map((action: any, i: number) => {
                const statusColor = action.status === "pass" ? "text-[#10b981]" : action.status === "warning" ? "text-amber-400" : "text-red-400";
                const statusIcon = action.status === "pass" ? "✅" : action.status === "warning" ? "⚠️" : "❌";
                return (
                  <div key={i} className="p-4 rounded-xl bg-[#111111] border border-[#2a2a2a]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span>{statusIcon}</span>
                      <span className={`text-sm font-medium ${statusColor}`}>{action.item}</span>
                      {action.difficulty && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          action.difficulty === "easy" ? "border-[#10b981]/30 text-[#10b981]" :
                          action.difficulty === "medium" ? "border-amber-500/30 text-amber-400" :
                          "border-red-500/30 text-red-400"
                        }`}>
                          {action.difficulty === "easy" ? "쉬움" : action.difficulty === "medium" ? "보통" : "어려움"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#a0a0a0] mb-1">{action.comment}</p>
                    {action.expected_impact && (
                      <p className="text-xs text-[#666666]">기대 효과: {action.expected_impact}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {(seoComments.industry_specific_tips ?? []).length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <h4 className="text-sm text-blue-400 mb-2">업종 특화 팁</h4>
                <ul className="space-y-1">
                  {(seoComments.industry_specific_tips ?? []).map((tip: string, i: number) => (
                    <li key={i} className="text-sm text-[#a0a0a0] flex items-start gap-2">
                      <Lightbulb className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Section 8: 개선 액션플랜 (에이전트 결과) ── */}
        {!isWebsite && improvementPlan && (
          <div className="mb-8 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              개선 액션플랜
            </h3>
            {improvementPlan.priority_summary && (
              <p className="text-sm text-[#a0a0a0] mb-4">{improvementPlan.priority_summary}</p>
            )}

            {improvementPlan.roadmap && (
              <div className="space-y-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(["week1", "month1", "month3"] as const).map((period) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const items = (improvementPlan.roadmap?.[period] ?? []) as any[];
                  if (items.length === 0) return null;
                  const periodLabel = period === "week1" ? "1주 내" : period === "month1" ? "1개월" : "3개월";
                  const periodColor = period === "week1" ? "text-[#10b981]" : period === "month1" ? "text-blue-400" : "text-purple-400";
                  return (
                    <div key={period}>
                      <h4 className={`text-sm font-medium ${periodColor} mb-2`}>{periodLabel} 액션</h4>
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {items.map((item: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-[#111111] border border-[#2a2a2a] flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              period === "week1" ? "bg-[#10b981]/10 text-[#10b981]" :
                              period === "month1" ? "bg-blue-500/10 text-blue-400" :
                              "bg-purple-500/10 text-purple-400"
                            }`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium">{item.action}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {item.expected_score_gain && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981]">
                                    +{item.expected_score_gain}점
                                  </span>
                                )}
                                {item.effort && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                    item.effort === "low" ? "border-[#10b981]/30 text-[#10b981]" :
                                    item.effort === "medium" ? "border-amber-500/30 text-amber-400" :
                                    "border-red-500/30 text-red-400"
                                  }`}>
                                    {item.effort === "low" ? "간단" : item.effort === "medium" ? "보통" : "높음"}
                                  </span>
                                )}
                                {item.cost && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#2a2a2a] text-[#666666]">
                                    {item.cost}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(improvementPlan.expected_total_gain || improvementPlan.target_score) && (
              <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                <p className="text-sm text-amber-400 font-medium">
                  {improvementPlan.expected_total_gain
                    ? `3개월 후 예상: ${improvementPlan.expected_total_gain}`
                    : `목표 점수: ${improvementPlan.target_score}점`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            후킹 메시지 + 보완하기
           ════════════════════════════════════════════════════════ */}
        <div className="mb-8 rounded-2xl border border-[#10b981]/20 bg-gradient-to-b from-[#10b981]/10 to-[#1a1a1a] p-8 md:p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3 leading-tight">
            지금 시작하지 않으면,<br className="md:hidden" /> 고객은 경쟁 매장으로 갑니다
          </h3>
          <p className="text-[#a0a0a0] mb-2 text-base md:text-lg">
            AI가 발견한 <span className="text-[#10b981] font-semibold">{keywords.length}개 키워드</span>로
            매주 자동 블로그 발행 — 상위노출까지
          </p>
          <p className="text-[#666666] text-sm mb-6">
            분석 결과를 보완하면 더 정확한 전략을 수립합니다
          </p>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setShowRefinePanel(!showRefinePanel)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white hover:border-[#10b981]/30 transition-colors"
            >
              <Pencil className="h-4 w-4 text-[#10b981]" />
              <span className="text-sm font-medium">{showRefinePanel ? "보완 닫기" : "보완하기"}</span>
            </button>
          </div>

          {/* 보완 패널 */}
          {showRefinePanel && (
            <div className="mt-6 text-left rounded-xl border border-[#2a2a2a] bg-[#111111] p-6 space-y-5">
              <p className="text-sm text-[#a0a0a0]">
                AI 분석을 보완할 정보를 입력하면 더 정확한 결과를 얻을 수 있습니다
              </p>

              {/* 키워드 태그 */}
              <div>
                <label className="text-sm text-[#a0a0a0] mb-2 block font-medium">
                  공략 키워드 <span className="text-[#666666]">(최대 5개)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {refineData.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30"
                    >
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {refineData.keywords.length < 5 && (
                  <div className="flex gap-2">
                    <input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                      placeholder="키워드 입력 후 Enter"
                      className="flex-1 h-9 px-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                    />
                    <button
                      onClick={addKeyword}
                      className="px-3 h-9 rounded-lg bg-[#2a2a2a] text-[#a0a0a0] hover:text-white text-sm transition-colors"
                    >
                      추가
                    </button>
                  </div>
                )}
              </div>

              {/* 강점 */}
              <div>
                <label className="text-sm text-[#a0a0a0] mb-2 block font-medium">우리 매장의 강점</label>
                <textarea
                  value={refineData.strengths}
                  onChange={(e) => setRefineData({ ...refineData, strengths: e.target.value })}
                  placeholder="예: 직접 로스팅한 스페셜티 원두, 매일 만드는 수제 디저트"
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm min-h-[60px] focus:outline-none focus:border-[#10b981] transition-colors resize-none"
                />
              </div>

              {/* 어필 포인트 */}
              <div>
                <label className="text-sm text-[#a0a0a0] mb-2 block font-medium">어필 포인트</label>
                <textarea
                  value={refineData.appeal}
                  onChange={(e) => setRefineData({ ...refineData, appeal: e.target.value })}
                  placeholder="예: 인스타 감성 인테리어, 넓은 주차장, 반려동물 동반 가능"
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm min-h-[60px] focus:outline-none focus:border-[#10b981] transition-colors resize-none"
                />
              </div>

              {/* 타겟 고객 */}
              <div>
                <label className="text-sm text-[#a0a0a0] mb-2 block font-medium">타겟 고객</label>
                <textarea
                  value={refineData.target}
                  onChange={(e) => setRefineData({ ...refineData, target: e.target.value })}
                  placeholder="예: 20~30대 직장인, 데이트 커플, 반려견 동반 가족"
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm min-h-[60px] focus:outline-none focus:border-[#10b981] transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleRefine}
                disabled={refining}
                className="w-full h-11 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-semibold transition-colors disabled:opacity-50"
              >
                {refining ? "재분석 중..." : "재분석하기"}
              </button>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            CTA Section A: 3-Step Process
           ════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white text-center mb-2">
            이 문제, 어떻게 해결할까요?
          </h3>
          <p className="text-[#666666] text-center mb-8 text-sm">
            3단계로 온라인 마케팅을 자동화하세요
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: 1, icon: "📊", title: "분석 완료", desc: "AI가 매장의 온라인 현황을 진단했어요", done: true },
              { step: 2, icon: "🎯", title: "맞춤 키워드 전략 수립", desc: "공략 키워드와 콘텐츠 방향을 설계합니다", done: false },
              { step: 3, icon: "✍️", title: "AI 콘텐츠 자동 발행", desc: "블로그 글을 자동 작성하고 상위노출까지", done: false },
            ].map((item) => (
              <div
                key={item.step}
                className={`relative p-6 rounded-2xl border text-center ${
                  item.done
                    ? "border-[#10b981]/30 bg-[#10b981]/5"
                    : "border-[#2a2a2a] bg-[#1a1a1a]"
                }`}
              >
                {item.done && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-[#10b981]" />
                  </div>
                )}
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="text-xs text-[#666666] mb-1">Step {item.step}</div>
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-[#a0a0a0]">{item.desc}</p>
                {item.done && (
                  <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs bg-[#10b981]/10 text-[#10b981] font-medium">
                    ✅ 지금 여기!
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            CTA Section B: Reviews
           ════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white text-center mb-6">
            사장님들의 후기
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { stars: 5, text: "키워드 분석만 보고도 뭘 해야 하는지 바로 알겠더라고요", biz: "송파 곱창집" },
              { stars: 5, text: "대행사 비용의 1/10로 더 좋은 결과가 나와요", biz: "가평 펜션" },
              { stars: 5, text: "매주 자동으로 블로그 글이 올라가니 편해요", biz: "강남 미용실" },
            ].map((review, i) => (
              <div key={i} className="p-5 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: review.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#a0a0a0] mb-3 leading-relaxed">&ldquo;{review.text}&rdquo;</p>
                <p className="text-xs text-[#666666]">— {review.biz}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            CTA Section B-2: 블로그 자동 작성 유도
           ════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-[#10b981]/5 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-bold text-white mb-2">
                  분석 결과 기반 블로그 콘텐츠를 AI가 자동으로 작성해 드려요
                </h3>
                <p className="text-sm text-[#a0a0a0]">
                  키워드 선정부터 SEO 최적화 글 작성까지, 분석에서 발견한 기회를 콘텐츠로 바로 연결하세요.
                </p>
              </div>
              <button
                onClick={handleStartProject}
                className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-semibold transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                블로그 작성 시작하기
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            CTA Section C: Contact
           ════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="rounded-2xl border border-[#10b981]/20 bg-gradient-to-b from-[#10b981]/5 to-[#1a1a1a] p-8 md:p-12 text-center">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              마케팅 점수를 올리고 싶다면
            </h3>
            {/* SNS 채널 부족 시 블로그/홈페이지 강조 */}
            {seoAudit && seoAudit.items.some((item: { label: string; status: string }) =>
              item.label === "SNS/채널 연동" && (item.status === "danger" || item.status === "warning")
            ) ? (
              <div className="mb-6">
                <p className="text-[#a0a0a0] mb-3">
                  블로그/홈페이지 제작으로 검색 노출을 극대화하세요
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 mb-4">
                  <span className="text-sm text-[#10b981] font-medium">블로그/홈페이지 무료 제작 이벤트 진행 중</span>
                </div>
              </div>
            ) : (
              <p className="text-[#a0a0a0] mb-8">
                Waide 전문가가 맞춤 전략을 안내해드려요
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="tel:02-0000-0000"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white hover:border-[#10b981]/30 transition-colors w-full sm:w-auto justify-center"
              >
                <PhoneCall className="h-4 w-4 text-[#10b981]" />
                <span className="text-sm font-medium">전화 상담</span>
              </a>
              <a
                href="https://pf.kakao.com/_placeholder"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white hover:border-[#10b981]/30 transition-colors w-full sm:w-auto justify-center"
              >
                <MessageCircle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">카카오톡 상담</span>
              </a>
              <button
                onClick={() => setShowConsultation(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-medium transition-colors w-full sm:w-auto justify-center"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm">무료 상담 신청</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Modal */}
      {showConsultation && (
        <ConsultationModal
          analysisId={id}
          salesRef={data.sales_ref}
          onClose={() => setShowConsultation(false)}
        />
      )}

      {/* Floating CTA Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={handleStartProject}
          className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#10b981] hover:bg-[#34d399] text-white font-bold shadow-lg shadow-[#10b981]/30 transition-all hover:scale-105 text-base"
        >
          <Sparkles className="h-5 w-5" />
          마케팅 지금 시작하기
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {/* 로그인/회원가입 모달 */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              마케팅을 시작하려면 로그인이 필요해요
            </DialogTitle>
            <DialogDescription className="text-[#888]">
              로그인하면 분석 결과를 기반으로 맞춤 마케팅 프로젝트를 만들 수 있어요
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => {
                const redirect = encodeURIComponent(`/onboarding/refine?analysis_id=${id}`);
                router.push(`/login?redirect=${redirect}`);
              }}
              className="w-full h-12 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-white font-semibold transition-colors"
            >
              로그인
            </button>
            <button
              onClick={() => {
                const redirect = encodeURIComponent(`/onboarding/refine?analysis_id=${id}`);
                router.push(`/signup?redirect=${redirect}`);
              }}
              className="w-full h-12 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-white font-semibold border border-[#3a3a3a] transition-colors"
            >
              회원가입
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
