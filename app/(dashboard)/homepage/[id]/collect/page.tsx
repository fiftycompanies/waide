"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Image,
  Loader2,
  Palette,
  Share2,
  FileText,
} from "lucide-react";
import {
  getHomepageMaterial,
  upsertHomepageMaterial,
  type HomepageMaterial,
} from "@/lib/actions/homepage-actions";

// ── Step Config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "기본 정보", icon: Building2, description: "업체명, 연락처, 주소" },
  { id: 2, title: "서비스 정보", icon: FileText, description: "서비스 지역, 유형, 소개" },
  { id: 3, title: "브랜드 자료", icon: Palette, description: "로고, 컬러, SNS 계정" },
  { id: 4, title: "추가 정보", icon: Share2, description: "자격증, 영업시간, FAQ" },
  { id: 5, title: "확인 및 제출", icon: Check, description: "입력 자료 확인" },
];

// ── Step Progress ───────────────────────────────────────────────────────────

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
              currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : currentStep > step.id
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {currentStep > step.id ? (
              <Check className="h-4 w-4" />
            ) : (
              step.id
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 ${currentStep > step.id ? "bg-emerald-500" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Form State ──────────────────────────────────────────────────────────────

interface FormData {
  company_name: string;
  owner_name: string;
  phone: string;
  address: string;
  description: string;
  kakao_link: string;
  service_regions: string[];
  service_types: string[];
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  instagram_url: string;
  youtube_url: string;
  naver_place_url: string;
  naver_blog_url: string;
  certifications: string[];
  operating_hours: string;
  business_number: string;
  faq_items: { q: string; a: string }[];
}

const DEFAULT_FORM: FormData = {
  company_name: "",
  owner_name: "",
  phone: "",
  address: "",
  description: "",
  kakao_link: "",
  service_regions: [],
  service_types: [],
  logo_url: "",
  primary_color: "#2563eb",
  secondary_color: "#10b981",
  instagram_url: "",
  youtube_url: "",
  naver_place_url: "",
  naver_blog_url: "",
  certifications: [],
  operating_hours: "",
  business_number: "",
  faq_items: [],
};

const REGION_OPTIONS = [
  "강남구", "서초구", "송파구", "강동구", "마포구", "용산구", "성동구", "광진구",
  "영등포구", "동작구", "관악구", "서대문구", "은평구", "종로구", "중구", "강서구",
  "양천구", "구로구", "금천구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구",
];

const SERVICE_TYPE_OPTIONS = [
  "아파트 인테리어", "리모델링", "빌라 인테리어", "오피스텔 인테리어",
  "상업공간 인테리어", "사무실 인테리어", "부분 인테리어", "올수리",
];

// ── Main Page ───────────────────────────────────────────────────────────────

export default function CollectMaterialPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Load existing data
  useEffect(() => {
    if (!id) return;
    startTransition(async () => {
      const existing = await getHomepageMaterial(id);
      if (existing) {
        setForm({
          company_name: existing.company_name,
          owner_name: existing.owner_name,
          phone: existing.phone,
          address: existing.address,
          description: existing.description,
          kakao_link: existing.kakao_link || "",
          service_regions: existing.service_regions || [],
          service_types: existing.service_types || [],
          logo_url: existing.logo_url || "",
          primary_color: existing.primary_color || "#2563eb",
          secondary_color: existing.secondary_color || "#10b981",
          instagram_url: existing.instagram_url || "",
          youtube_url: existing.youtube_url || "",
          naver_place_url: existing.naver_place_url || "",
          naver_blog_url: existing.naver_blog_url || "",
          certifications: existing.certifications || [],
          operating_hours: existing.operating_hours || "",
          business_number: existing.business_number || "",
          faq_items: existing.faq_items || [],
        });
      }
      setLoading(false);
    });
  }, [id]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: "service_regions" | "service_types", item: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((v) => v !== item)
        : [...prev[key], item],
    }));
  };

  const addFaqItem = () => {
    setForm((prev) => ({
      ...prev,
      faq_items: [...prev.faq_items, { q: "", a: "" }],
    }));
  };

  const updateFaqItem = (index: number, field: "q" | "a", value: string) => {
    setForm((prev) => ({
      ...prev,
      faq_items: prev.faq_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeFaqItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      faq_items: prev.faq_items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!form.company_name || !form.owner_name || !form.phone || !form.address || !form.description) {
      setError("필수 항목을 모두 입력해주세요");
      setStep(1);
      return;
    }

    startTransition(async () => {
      const result = await upsertHomepageMaterial(id, {
        ...form,
        address_lat: null,
        address_lng: null,
        certifications: form.certifications.length > 0 ? form.certifications : null,
        is_complete: true,
        submitted_at: new Date().toISOString(),
      });

      if (result.success) {
        router.push(`/homepage/${id}`);
      } else {
        setError(result.error || "저장에 실패했습니다");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/homepage/${id}`} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">자료 수집</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {STEPS[step - 1].title} — {STEPS[step - 1].description}
          </p>
        </div>
      </div>

      {/* Step Progress */}
      <StepProgress currentStep={step} />

      {/* Step Content */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <>
            <h2 className="font-semibold text-lg">기본 정보 (필수)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">업체명 *</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="예: OO인테리어"
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">대표자명 *</label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => updateField("owner_name", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">연락처 *</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">주소 *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="서울시 강남구 ..."
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">업체 소개 * (1-2문장)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="강남 지역 10년 경력 인테리어 전문 업체입니다."
                  className="w-full h-20 px-3 py-2 rounded-lg border bg-background text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">카카오톡 상담 링크</label>
                <input
                  type="text"
                  value={form.kakao_link}
                  onChange={(e) => updateField("kakao_link", e.target.value)}
                  placeholder="https://pf.kakao.com/..."
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: 서비스 정보 */}
        {step === 2 && (
          <>
            <h2 className="font-semibold text-lg">서비스 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">서비스 지역 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleArrayItem("service_regions", region)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.service_regions.includes(region)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">서비스 유형 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleArrayItem("service_types", type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.service_types.includes(type)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: 브랜드 자료 */}
        {step === 3 && (
          <>
            <h2 className="font-semibold text-lg">브랜드 자료 (선택)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">로고 URL</label>
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">메인 컬러</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="h-10 w-12 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">보조 컬러</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="h-10 w-12 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.secondary_color}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">인스타그램</label>
                  <input
                    type="text"
                    value={form.instagram_url}
                    onChange={(e) => updateField("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">유튜브</label>
                  <input
                    type="text"
                    value={form.youtube_url}
                    onChange={(e) => updateField("youtube_url", e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">네이버 플레이스</label>
                  <input
                    type="text"
                    value={form.naver_place_url}
                    onChange={(e) => updateField("naver_place_url", e.target.value)}
                    placeholder="https://naver.me/..."
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">네이버 블로그</label>
                  <input
                    type="text"
                    value={form.naver_blog_url}
                    onChange={(e) => updateField("naver_blog_url", e.target.value)}
                    placeholder="https://blog.naver.com/..."
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 4: 추가 정보 */}
        {step === 4 && (
          <>
            <h2 className="font-semibold text-lg">추가 정보 (선택)</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">영업시간</label>
                  <input
                    type="text"
                    value={form.operating_hours}
                    onChange={(e) => updateField("operating_hours", e.target.value)}
                    placeholder="09:00 - 18:00"
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">사업자번호</label>
                  <input
                    type="text"
                    value={form.business_number}
                    onChange={(e) => updateField("business_number", e.target.value)}
                    placeholder="123-45-67890"
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                  />
                </div>
              </div>

              {/* FAQ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">자주 묻는 질문 (FAQ)</label>
                  <button
                    type="button"
                    onClick={addFaqItem}
                    className="text-xs text-primary hover:underline"
                  >
                    + 질문 추가
                  </button>
                </div>
                {form.faq_items.length === 0 && (
                  <p className="text-xs text-muted-foreground">FAQ를 추가하면 홈페이지에 자동 반영됩니다</p>
                )}
                {form.faq_items.map((faq, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">FAQ #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFaqItem(i)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                    <input
                      type="text"
                      value={faq.q}
                      onChange={(e) => updateFaqItem(i, "q", e.target.value)}
                      placeholder="질문"
                      className="w-full h-9 px-3 rounded-lg border bg-background text-sm"
                    />
                    <textarea
                      value={faq.a}
                      onChange={(e) => updateFaqItem(i, "a", e.target.value)}
                      placeholder="답변"
                      className="w-full h-16 px-3 py-2 rounded-lg border bg-background text-sm resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 5: 확인 */}
        {step === 5 && (
          <>
            <h2 className="font-semibold text-lg">입력 자료 확인</h2>
            <div className="space-y-3 text-sm">
              <div className="border-b pb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">기본 정보</p>
                <p>업체명: <strong>{form.company_name}</strong></p>
                <p>대표: <strong>{form.owner_name}</strong> | 연락처: <strong>{form.phone}</strong></p>
                <p>주소: {form.address}</p>
                <p>소개: {form.description}</p>
              </div>
              <div className="border-b pb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">서비스 정보</p>
                <p>지역: {form.service_regions.join(", ") || "미입력"}</p>
                <p>유형: {form.service_types.join(", ") || "미입력"}</p>
              </div>
              <div className="border-b pb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">브랜드</p>
                <div className="flex items-center gap-2">
                  <span>컬러:</span>
                  <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: form.primary_color }} />
                  <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: form.secondary_color }} />
                </div>
                <p>SNS: {[form.instagram_url, form.naver_place_url, form.naver_blog_url].filter(Boolean).length}개 입력</p>
              </div>
              {form.faq_items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">FAQ: {form.faq_items.length}개</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> 이전
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            다음 <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 저장 중...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> 저장 및 제출
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
