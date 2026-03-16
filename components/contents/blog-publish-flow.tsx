"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Pen,
  Store,
  ImageIcon,
  Hash,
  Sparkles,
  Send,
  Copy,
  Check,
  Loader2,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import {
  createPublishingAccount,
  saveGeneratedContent,
} from "@/lib/actions/publishing-account-actions";
import type { PublishingAccount } from "@/lib/actions/publishing-account-actions";

// ── Types ────────────────────────────────────────────────────
interface BrandAnalysis {
  id: string;
  basic_info: Record<string, unknown> | null;
  content_strategy: Record<string, unknown> | null;
  keyword_analysis: Record<string, unknown> | null;
  analysis_result: Record<string, unknown> | null;
  place_id: string | null;
}

interface CrawledImage {
  url: string;
  phash: string;
  width: number;
  height: number;
}

interface BlogPublishFlowProps {
  clientId: string;
  brandAnalysis: BrandAnalysis | null;
  publishingAccounts: PublishingAccount[];
  activeKeywords: Array<{ keyword: string; id: string }>;
}

type ContentType = "blog_info" | "blog_review" | "blog_list";

const STEPS = [
  { label: "유형 선택", icon: FileText },
  { label: "브리프", icon: Pen },
  { label: "매장 정보", icon: Store },
  { label: "이미지", icon: ImageIcon },
  { label: "키워드", icon: Hash },
  { label: "콘텐츠 생성", icon: Sparkles },
  { label: "발행 채널", icon: Send },
  { label: "완료", icon: Check },
];

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export function BlogPublishFlow({
  clientId,
  brandAnalysis,
  publishingAccounts: initialAccounts,
  activeKeywords,
}: BlogPublishFlowProps) {
  const [step, setStep] = useState(0);
  const [contentType, setContentType] = useState<ContentType>("blog_info");
  const [brief, setBrief] = useState("");
  const [brandInfo, setBrandInfo] = useState(() => {
    const bi = brandAnalysis?.basic_info || {};
    return {
      name: (bi.name as string) || "",
      category: (bi.category as string) || "",
      region: (bi.region as string) || (bi.address as string) || "",
      description: (bi.description as string) || "",
    };
  });
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [crawledImages, setCrawledImages] = useState<CrawledImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [mainKeyword, setMainKeyword] = useState("");
  const [mainKeywordId, setMainKeywordId] = useState<string | null>(null);
  const [subKeywords, setSubKeywords] = useState<string[]>([]);
  const [subKeywordInput, setSubKeywordInput] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishingAccounts, setPublishingAccounts] = useState(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialAccounts.find((a) => a.is_default)?.id || ""
  );
  const [metaDescription, setMetaDescription] = useState("");
  const [publishUrl, setPublishUrl] = useState("");
  const [savedContentId, setSavedContentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // 브리프 자동 생성
  useEffect(() => {
    if (brandAnalysis?.content_strategy) {
      const cs = brandAnalysis.content_strategy;
      const brandA = cs.brand_analysis as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (brandA?.strengths)
        parts.push(`강점: ${String(brandA.strengths)}`);
      if (brandA?.target_audience)
        parts.push(`타겟: ${String(brandA.target_audience)}`);
      if (brandA?.tone) parts.push(`톤앤매너: ${String(brandA.tone)}`);
      if (parts.length > 0 && !brief) {
        setBrief(parts.join("\n"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandAnalysis]);

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case 0: return true; // content type always selected
      case 1: return brief.trim().length > 0;
      case 2: return brandInfo.name.trim().length > 0;
      case 3: return true; // images optional
      case 4: return mainKeyword.trim().length > 0;
      case 5: return generatedContent.length > 0;
      case 6: return true; // publishing account optional
      default: return true;
    }
  }, [step, brief, brandInfo.name, mainKeyword, generatedContent]);

  const handleNext = () => {
    if (step < STEPS.length - 1 && canGoNext()) {
      setStep(step + 1);
    }
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // ── Image crawling ──
  const handleCrawlImages = async () => {
    if (!brandAnalysis?.place_id) return;
    setImageLoading(true);
    try {
      const res = await fetch("/api/vps/image?action=crawl-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: brandAnalysis.place_id,
          max_images: 12,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCrawledImages(data.images || []);
      }
    } catch (err) {
      console.error("Image crawl failed:", err);
    } finally {
      setImageLoading(false);
    }
  };

  const toggleImage = (url: string) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  // ── Content generation (streaming) ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const res = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          brief,
          brandInfo,
          mainKeyword,
          subKeywords,
          imageUrls: selectedImages,
        }),
      });

      if (!res.ok) {
        throw new Error("Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setGeneratedContent((prev) => prev + parsed.text);
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error("Generation error:", err);
      setGeneratedContent("콘텐츠 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copy to clipboard ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = generatedContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Save content ──
  const handleSave = async () => {
    setSaving(true);
    const titleMatch = generatedContent.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1] || `${mainKeyword} - ${contentType}`;

    const result = await saveGeneratedContent({
      clientId,
      title,
      body: generatedContent,
      mainKeyword,
      subKeywords,
      contentType,
      keywordId: mainKeywordId || undefined,
      metaDescription: metaDescription || undefined,
      publishingAccountId: selectedAccountId || undefined,
      imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      publishedUrl: publishUrl || undefined,
    });

    if (result.success && result.contentId) {
      setSavedContentId(result.contentId);
    }
    setSaving(false);
  };

  // ── Add sub keyword ──
  const addSubKeyword = () => {
    const kw = subKeywordInput.trim();
    if (kw && !subKeywords.includes(kw)) {
      setSubKeywords([...subKeywords, kw]);
      setSubKeywordInput("");
    }
  };

  // ── Add publishing account inline ──
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    platform: "naver",
    accountName: "",
    accountUrl: "",
  });

  const handleAddAccount = async () => {
    if (!newAccountForm.accountName.trim()) return;
    const result = await createPublishingAccount({
      clientId,
      platform: newAccountForm.platform,
      accountName: newAccountForm.accountName,
      accountUrl: newAccountForm.accountUrl || undefined,
      isDefault: publishingAccounts.length === 0,
    });
    if (result.success && result.id) {
      const newAccount: PublishingAccount = {
        id: result.id,
        client_id: clientId,
        platform: newAccountForm.platform,
        account_name: newAccountForm.accountName,
        account_url: newAccountForm.accountUrl || null,
        is_default: publishingAccounts.length === 0,
        is_active: true,
        memo: null,
        created_at: new Date().toISOString(),
      };
      setPublishingAccounts((prev) => [...prev, newAccount]);
      setSelectedAccountId(result.id);
      setShowAddAccount(false);
      setNewAccountForm({ platform: "naver", accountName: "", accountUrl: "" });
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-violet-100 text-violet-700 border border-violet-300"
                  : isDone
                    ? "bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                    : "bg-muted/30 text-muted-foreground/50"
              }`}
            >
              {isDone ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <StepContentType
              value={contentType}
              onChange={setContentType}
            />
          )}
          {step === 1 && (
            <StepBrief value={brief} onChange={setBrief} />
          )}
          {step === 2 && (
            <StepBrandInfo value={brandInfo} onChange={setBrandInfo} />
          )}
          {step === 3 && (
            <StepImages
              placeId={brandAnalysis?.place_id || null}
              crawledImages={crawledImages}
              selectedImages={selectedImages}
              loading={imageLoading}
              onCrawl={handleCrawlImages}
              onToggle={toggleImage}
            />
          )}
          {step === 4 && (
            <StepKeywords
              mainKeyword={mainKeyword}
              onMainChange={(text, id) => {
                setMainKeyword(text);
                setMainKeywordId(id ?? null);
              }}
              subKeywords={subKeywords}
              onSubRemove={(kw) =>
                setSubKeywords(subKeywords.filter((k) => k !== kw))
              }
              subInput={subKeywordInput}
              onSubInputChange={setSubKeywordInput}
              onSubAdd={addSubKeyword}
              activeKeywords={activeKeywords}
            />
          )}
          {step === 5 && (
            <StepGenerate
              content={generatedContent}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              onContentChange={setGeneratedContent}
            />
          )}
          {step === 6 && (
            <StepPublishChannel
              accounts={publishingAccounts}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
              showAdd={showAddAccount}
              onShowAdd={() => setShowAddAccount(true)}
              newForm={newAccountForm}
              onNewFormChange={setNewAccountForm}
              onAddAccount={handleAddAccount}
              onCancelAdd={() => setShowAddAccount(false)}
            />
          )}
          {step === 7 && (
            <StepComplete
              content={generatedContent}
              copied={copied}
              onCopy={handleCopy}
              metaDescription={metaDescription}
              onMetaChange={setMetaDescription}
              publishUrl={publishUrl}
              onPublishUrlChange={setPublishUrl}
              savedContentId={savedContentId}
              saving={saving}
              onSave={handleSave}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>

        {step < STEPS.length - 1 && (
          <Button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="gap-1 bg-violet-600 hover:bg-violet-700"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Step Components
// ═══════════════════════════════════════════════════════════════

function StepContentType({
  value,
  onChange,
}: {
  value: ContentType;
  onChange: (v: ContentType) => void;
}) {
  const types: { key: ContentType; label: string; desc: string }[] = [
    {
      key: "blog_info",
      label: "정보형",
      desc: "키워드 중심 정보 전달, 체크리스트/요약표 포함",
    },
    {
      key: "blog_review",
      label: "후기성",
      desc: "방문 경험 기반, 시간순 서술, 사진 중심",
    },
    {
      key: "blog_list",
      label: "소개성 (추천형)",
      desc: "추천 리스트, 비교표 포함, 선택 가이드",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">콘텐츠 유형 선택</h3>
      <p className="text-sm text-muted-foreground">
        작성할 블로그 콘텐츠의 유형을 선택하세요
      </p>
      <div className="grid gap-3">
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
              value === t.key
                ? "border-violet-500 bg-violet-50"
                : "border-border hover:border-violet-300"
            }`}
          >
            <div
              className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                value === t.key
                  ? "border-violet-600"
                  : "border-muted-foreground/40"
              }`}
            >
              {value === t.key && (
                <div className="h-2 w-2 rounded-full bg-violet-600" />
              )}
            </div>
            <div>
              <p className="font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBrief({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">브리프 작성</h3>
      <p className="text-sm text-muted-foreground">
        콘텐츠 작성 방향, 강조할 포인트, 타겟 독자를 기술하세요.
        브랜드 분석 결과에서 자동으로 채워집니다.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 20~30대 여성 타겟, 깔끔한 인테리어와 시그니처 메뉴를 강조, 방문 후기 형식으로..."
        className="w-full min-h-[160px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
      />
    </div>
  );
}

function StepBrandInfo({
  value,
  onChange,
}: {
  value: { name: string; category: string; region: string; description: string };
  onChange: (v: typeof value) => void;
}) {
  const fields: {
    key: keyof typeof value;
    label: string;
    placeholder: string;
  }[] = [
    { key: "name", label: "매장명", placeholder: "캠핏 글램핑" },
    { key: "category", label: "업종", placeholder: "카페 / 음식점 / 숙박" },
    { key: "region", label: "지역", placeholder: "서울 강남구" },
    {
      key: "description",
      label: "한줄 소개",
      placeholder: "감성 가득한 프라이빗 글램핑",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">매장 정보 확인</h3>
      <p className="text-sm text-muted-foreground">
        브랜드 분석 결과에서 가져온 정보입니다. 필요시 수정하세요.
      </p>
      <div className="grid gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-sm font-medium text-foreground">
              {f.label}
            </label>
            <input
              type="text"
              value={value[f.key]}
              onChange={(e) =>
                onChange({ ...value, [f.key]: e.target.value })
              }
              placeholder={f.placeholder}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepImages({
  placeId,
  crawledImages,
  selectedImages,
  loading,
  onCrawl,
  onToggle,
}: {
  placeId: string | null;
  crawledImages: CrawledImage[];
  selectedImages: string[];
  loading: boolean;
  onCrawl: () => void;
  onToggle: (url: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">이미지 선택</h3>
      <p className="text-sm text-muted-foreground">
        네이버 플레이스에서 이미지를 크롤링하여 선택할 수 있습니다 (선택사항)
      </p>

      {placeId ? (
        <>
          {crawledImages.length === 0 && (
            <Button
              onClick={onCrawl}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {loading ? "크롤링 중..." : "이미지 크롤링"}
            </Button>
          )}

          {crawledImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {crawledImages.map((img) => (
                <button
                  key={img.phash}
                  onClick={() => onToggle(img.url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImages.includes(img.url)
                      ? "border-violet-500 ring-2 ring-violet-300"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {selectedImages.includes(img.url) && (
                    <div className="absolute top-1 right-1 bg-violet-600 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedImages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedImages.length}개 선택됨
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-amber-600">
          브랜드 분석에 플레이스 ID가 없어 이미지 크롤링을 사용할 수 없습니다.
          건너뛰고 다음 단계로 진행하세요.
        </p>
      )}
    </div>
  );
}

function StepKeywords({
  mainKeyword,
  onMainChange,
  subKeywords,
  onSubRemove,
  subInput,
  onSubInputChange,
  onSubAdd,
  activeKeywords,
}: {
  mainKeyword: string;
  onMainChange: (text: string, id?: string) => void;
  subKeywords: string[];
  onSubRemove: (kw: string) => void;
  subInput: string;
  onSubInputChange: (v: string) => void;
  onSubAdd: () => void;
  activeKeywords: Array<{ keyword: string; id: string }>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">키워드 설정</h3>

      {/* 메인 키워드 */}
      <div>
        <label className="text-sm font-medium">메인 키워드</label>
        <input
          type="text"
          value={mainKeyword}
          onChange={(e) => onMainChange(e.target.value)}
          placeholder="예: 강남 카페 추천"
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {activeKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeKeywords.slice(0, 10).map((kw) => (
              <button
                key={kw.id}
                onClick={() => {
                  if (!mainKeyword) {
                    onMainChange(kw.keyword, kw.id);
                  }
                }}
                className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {kw.keyword}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 서브 키워드 */}
      <div>
        <label className="text-sm font-medium">서브 키워드</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={subInput}
            onChange={(e) => onSubInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onSubAdd())}
            placeholder="서브 키워드 입력 후 Enter"
            className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button onClick={onSubAdd} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {subKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {subKeywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                {kw}
                <button onClick={() => onSubRemove(kw)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepGenerate({
  content,
  isGenerating,
  onGenerate,
  onContentChange,
}: {
  content: string;
  isGenerating: boolean;
  onGenerate: () => void;
  onContentChange: (v: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">콘텐츠 생성</h3>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-2 bg-violet-600 hover:bg-violet-700"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? "생성 중..." : content ? "재생성" : "AI 콘텐츠 생성"}
        </Button>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="AI가 생성한 콘텐츠가 여기에 표시됩니다..."
        className="w-full min-h-[400px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        readOnly={isGenerating}
      />

      {content && !isGenerating && (
        <p className="text-xs text-muted-foreground">
          {content.replace(/\s/g, "").length}자 | 수정 가능합니다
        </p>
      )}
    </div>
  );
}

function StepPublishChannel({
  accounts,
  selectedId,
  onSelect,
  showAdd,
  onShowAdd,
  newForm,
  onNewFormChange,
  onAddAccount,
  onCancelAdd,
}: {
  accounts: PublishingAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  showAdd: boolean;
  onShowAdd: () => void;
  newForm: { platform: string; accountName: string; accountUrl: string };
  onNewFormChange: (v: typeof newForm) => void;
  onAddAccount: () => void;
  onCancelAdd: () => void;
}) {
  const platforms = [
    { value: "naver", label: "네이버 블로그" },
    { value: "tistory", label: "티스토리" },
    { value: "wordpress", label: "워드프레스" },
    { value: "brunch", label: "브런치" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">발행 채널 선택</h3>
        {!showAdd && (
          <Button variant="outline" size="sm" onClick={onShowAdd} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            채널 추가
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        콘텐츠를 발행할 블로그/채널을 선택하세요 (선택사항)
      </p>

      {accounts.length > 0 ? (
        <div className="grid gap-2">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => onSelect(acc.id === selectedId ? "" : acc.id)}
              className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                selectedId === acc.id
                  ? "border-violet-500 bg-violet-50"
                  : "border-border hover:border-violet-300"
              }`}
            >
              <div>
                <p className="text-sm font-medium">{acc.account_name}</p>
                <p className="text-xs text-muted-foreground">
                  {acc.platform}
                  {acc.account_url && ` · ${acc.account_url}`}
                </p>
              </div>
              {acc.is_default && (
                <Badge variant="secondary" className="text-xs">
                  기본
                </Badge>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          등록된 발행 채널이 없습니다. 채널을 추가하거나 건너뛰세요.
        </p>
      )}

      {showAdd && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">플랫폼</label>
              <select
                value={newForm.platform}
                onChange={(e) =>
                  onNewFormChange({ ...newForm, platform: e.target.value })
                }
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {platforms.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">계정명</label>
              <input
                type="text"
                value={newForm.accountName}
                onChange={(e) =>
                  onNewFormChange({ ...newForm, accountName: e.target.value })
                }
                placeholder="블로그 계정명"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">블로그 URL (선택)</label>
              <input
                type="text"
                value={newForm.accountUrl}
                onChange={(e) =>
                  onNewFormChange({ ...newForm, accountUrl: e.target.value })
                }
                placeholder="https://blog.naver.com/..."
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onAddAccount} size="sm">
                추가
              </Button>
              <Button onClick={onCancelAdd} size="sm" variant="outline">
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepComplete({
  content,
  copied,
  onCopy,
  metaDescription,
  onMetaChange,
  publishUrl,
  onPublishUrlChange,
  savedContentId,
  saving,
  onSave,
}: {
  content: string;
  copied: boolean;
  onCopy: () => void;
  metaDescription: string;
  onMetaChange: (v: string) => void;
  publishUrl: string;
  onPublishUrlChange: (v: string) => void;
  savedContentId: string | null;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">발행 완료</h3>

      {/* 마크다운 복사 */}
      <div className="flex items-center gap-3">
        <Button onClick={onCopy} variant="outline" className="gap-2">
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "복사 완료!" : "마크다운 복사"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {content.replace(/\s/g, "").length}자
        </span>
      </div>

      {/* 메타 디스크립션 */}
      <div>
        <label className="text-sm font-medium">메타 디스크립션 (선택)</label>
        <textarea
          value={metaDescription}
          onChange={(e) => onMetaChange(e.target.value)}
          placeholder="검색 결과에 표시될 설명 (150자 이내)"
          maxLength={150}
          className="mt-1 w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      {/* 발행 URL 입력 */}
      <div>
        <label className="text-sm font-medium">
          발행 URL (발행 후 입력)
        </label>
        <input
          type="url"
          value={publishUrl}
          onChange={(e) => onPublishUrlChange(e.target.value)}
          placeholder="https://blog.naver.com/..."
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* 저장 */}
      <div className="flex items-center gap-3 pt-2">
        {!savedContentId ? (
          <Button
            onClick={onSave}
            disabled={saving}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {saving ? "저장 중..." : "콘텐츠 저장"}
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"
            >
              <Check className="h-3 w-3" />
              저장 완료
            </Badge>
            <a
              href={`/contents/${savedContentId}`}
              className="inline-flex items-center gap-1 text-sm text-violet-600 hover:underline"
            >
              콘텐츠 상세 보기
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
