"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Upload,
  RefreshCw,
  FileCode,
} from "lucide-react";
import {
  createPublishingAccount,
  saveGeneratedContent,
  updateContentForTracking,
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
  { label: "매장 정보", icon: Store },
  { label: "유형 · 키워드", icon: Hash },
  { label: "브리프", icon: Pen },
  { label: "이미지", icon: ImageIcon },
  { label: "제목 생성", icon: Sparkles },
  { label: "콘텐츠 생성", icon: FileText },
  { label: "발행 · 추적", icon: Send },
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

  // Step 0: Brand Info
  const [brandInfo, setBrandInfo] = useState(() => {
    const bi = brandAnalysis?.basic_info || {};
    const placeId = brandAnalysis?.place_id;
    return {
      name: (bi.name as string) || "",
      naverPlaceUrl: placeId
        ? `https://m.place.naver.com/restaurant/${placeId}/home`
        : (bi.naver_place_url as string) || (bi.place_url as string) || "",
      homepage: (bi.homepage as string) || (bi.website as string) || (bi.website_url as string) || "",
      category: (bi.category as string) || "",
    };
  });

  // Step 1: Type + Keywords
  const [contentType, setContentType] = useState<ContentType>("blog_info");
  const [mainKeyword, setMainKeyword] = useState("");
  const [mainKeywordId, setMainKeywordId] = useState<string | null>(null);
  const [subKeywords, setSubKeywords] = useState<string[]>([]);
  const [subKeywordInput, setSubKeywordInput] = useState("");

  // Step 2: Brief
  const [brief, setBrief] = useState("");

  // Step 3: Images
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [crawledImages, setCrawledImages] = useState<CrawledImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  // Step 4: Titles
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [titlesLoading, setTitlesLoading] = useState(false);

  // Step 5: Content Generation
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addSchemaMarkup, setAddSchemaMarkup] = useState(true);

  // Step 6: Publish + Track
  const [publishingAccounts, setPublishingAccounts] = useState(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialAccounts.find((a) => a.is_default)?.id || ""
  );
  const [publishUrl, setPublishUrl] = useState("");
  const [trackingStarted, setTrackingStarted] = useState(false);
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    platform: "naver",
    accountName: "",
    accountUrl: "",
  });

  // Brief auto-fill from content_strategy
  useEffect(() => {
    if (brandAnalysis?.content_strategy) {
      const cs = brandAnalysis.content_strategy;
      const brandA = cs.brand_analysis as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (brandA?.strengths) parts.push(`강점: ${String(brandA.strengths)}`);
      if (brandA?.target_audience) parts.push(`타겟: ${String(brandA.target_audience)}`);
      if (brandA?.tone) parts.push(`톤앤매너: ${String(brandA.tone)}`);
      if (parts.length > 0 && !brief) {
        setBrief(parts.join("\n"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandAnalysis]);

  // Auto-generate titles on Step 4 entry
  useEffect(() => {
    if (step === 4 && titles.length === 0 && !titlesLoading) {
      handleGenerateTitles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return mainKeyword.trim().length > 0;
      case 2: return brief.trim().length > 0;
      case 3: return true;
      case 4: return editedTitle.trim().length > 0;
      case 5: return generatedContent.length > 0;
      default: return true;
    }
  }, [step, mainKeyword, brief, editedTitle, generatedContent]);

  const handleNext = () => {
    if (step < STEPS.length - 1 && canGoNext()) setStep(step + 1);
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
        body: JSON.stringify({ place_id: brandAnalysis.place_id, max_images: 12 }),
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

  const removeImage = (url: string) => {
    setSelectedImages((prev) => prev.filter((u) => u !== url));
  };

  // ── Image upload ──
  const handleFileUpload = async (files: FileList) => {
    setUploadingCount(files.length);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const base64 = await fileToBase64(file);
        // Step 1: wash image
        const washRes = await fetch("/api/vps/image?action=wash-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_data: base64,
            filename: file.name,
            content_type: file.type,
          }),
        });
        if (!washRes.ok) throw new Error("wash failed");
        const washData = await washRes.json();

        // Step 2: upload image
        const uploadRes = await fetch("/api/vps/image?action=upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_data: washData.washed_data || washData.image_data || base64,
            filename: washData.filename || file.name,
            content_type: file.type,
          }),
        });
        if (!uploadRes.ok) throw new Error("upload failed");
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          setSelectedImages((prev) => [...prev, uploadData.url]);
        }
      } catch (err) {
        console.error("File upload failed:", file.name, err);
      }
    });

    await Promise.all(uploadPromises);
    setUploadingCount(0);
  };

  // ── Title generation ──
  const handleGenerateTitles = async () => {
    setTitlesLoading(true);
    setTitles([]);
    setSelectedTitleIndex(null);
    setEditedTitle("");
    try {
      const res = await fetch("/api/ai/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          placeName: brandInfo.name,
          mainKeyword,
          brief,
        }),
      });
      const data = await res.json();
      if (data.titles?.length > 0) {
        setTitles(data.titles);
      }
    } catch (err) {
      console.error("Title generation failed:", err);
    } finally {
      setTitlesLoading(false);
    }
  };

  // ── Content generation (streaming but display after complete) ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent("");
    setSavedContentId(null);

    try {
      const res = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          brief,
          brandInfo: {
            name: brandInfo.name,
            category: brandInfo.category,
            region: "",
            description: "",
          },
          mainKeyword,
          subKeywords,
          imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
          title: editedTitle,
          addSchemaMarkup,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let accumulated = "";
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
              if (parsed.text) accumulated += parsed.text;
            } catch {
              // skip
            }
          }
        }
      }
      setGeneratedContent(accumulated);
    } catch (err) {
      console.error("Generation error:", err);
      setGeneratedContent("콘텐츠 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copy ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  // ── Save as draft (Step 5) ──
  const handleSave = async () => {
    setSaving(true);
    const result = await saveGeneratedContent({
      clientId,
      title: editedTitle || `${mainKeyword} - ${contentType}`,
      body: generatedContent,
      mainKeyword,
      subKeywords,
      contentType,
      keywordId: mainKeywordId || undefined,
      imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
    });
    if (result.success && result.contentId) {
      setSavedContentId(result.contentId);
    }
    setSaving(false);
  };

  // ── Start tracking (Step 6) ──
  const handleStartTracking = async () => {
    if (!savedContentId || !publishUrl.trim()) return;
    setTrackingSaving(true);
    const result = await updateContentForTracking({
      contentId: savedContentId,
      publishingAccountId: selectedAccountId || undefined,
      publishedUrl: publishUrl,
    });
    if (result.success) {
      setTrackingStarted(true);
    }
    setTrackingSaving(false);
  };

  // ── Sub keyword ──
  const addSubKeyword = () => {
    const kw = subKeywordInput.trim();
    if (kw && !subKeywords.includes(kw)) {
      setSubKeywords([...subKeywords, kw]);
      setSubKeywordInput("");
    }
  };

  // ── Add publishing account ──
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
              {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <StepBrandInfo value={brandInfo} onChange={setBrandInfo} />
          )}
          {step === 1 && (
            <StepTypeKeyword
              contentType={contentType}
              onContentTypeChange={setContentType}
              mainKeyword={mainKeyword}
              onMainChange={(text, id) => {
                setMainKeyword(text);
                setMainKeywordId(id ?? null);
              }}
              subKeywords={subKeywords}
              onSubRemove={(kw) => setSubKeywords(subKeywords.filter((k) => k !== kw))}
              subInput={subKeywordInput}
              onSubInputChange={setSubKeywordInput}
              onSubAdd={addSubKeyword}
              activeKeywords={activeKeywords}
            />
          )}
          {step === 2 && (
            <StepBrief value={brief} onChange={setBrief} />
          )}
          {step === 3 && (
            <StepImages
              placeId={brandAnalysis?.place_id || null}
              crawledImages={crawledImages}
              selectedImages={selectedImages}
              loading={imageLoading}
              uploadingCount={uploadingCount}
              onCrawl={handleCrawlImages}
              onToggle={toggleImage}
              onRemove={removeImage}
              onFileUpload={handleFileUpload}
            />
          )}
          {step === 4 && (
            <StepTitleGeneration
              titles={titles}
              selectedIndex={selectedTitleIndex}
              editedTitle={editedTitle}
              loading={titlesLoading}
              onSelect={(i) => {
                setSelectedTitleIndex(i);
                setEditedTitle(titles[i]);
              }}
              onEditTitle={setEditedTitle}
              onRegenerate={handleGenerateTitles}
            />
          )}
          {step === 5 && (
            <StepContentGeneration
              content={generatedContent}
              isGenerating={isGenerating}
              savedContentId={savedContentId}
              saving={saving}
              copied={copied}
              title={editedTitle}
              contentType={contentType}
              mainKeyword={mainKeyword}
              subKeywords={subKeywords}
              imageCount={selectedImages.length}
              addSchemaMarkup={addSchemaMarkup}
              onSchemaMarkupChange={setAddSchemaMarkup}
              onGenerate={handleGenerate}
              onContentChange={setGeneratedContent}
              onCopy={handleCopy}
              onSave={handleSave}
            />
          )}
          {step === 6 && (
            <StepPublishTrack
              accounts={publishingAccounts}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
              publishUrl={publishUrl}
              onPublishUrlChange={setPublishUrl}
              trackingStarted={trackingStarted}
              trackingSaving={trackingSaving}
              savedContentId={savedContentId}
              onStartTracking={handleStartTracking}
              showAdd={showAddAccount}
              onShowAdd={() => setShowAddAccount(true)}
              newForm={newAccountForm}
              onNewFormChange={setNewAccountForm}
              onAddAccount={handleAddAccount}
              onCancelAdd={() => setShowAddAccount(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {!trackingStarted && (
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
      )}
    </div>
  );
}

// ── Util ──
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ═══════════════════════════════════════════════════════════════
// Step Components
// ═══════════════════════════════════════════════════════════════

// Step 0: 매장 정보 확인
function StepBrandInfo({
  value,
  onChange,
}: {
  value: { name: string; naverPlaceUrl: string; homepage: string; category: string };
  onChange: (v: typeof value) => void;
}) {
  const fields: { key: keyof typeof value; label: string; placeholder: string }[] = [
    { key: "name", label: "업체명", placeholder: "캠핏 글램핑" },
    { key: "naverPlaceUrl", label: "네이버 플레이스 URL", placeholder: "https://m.place.naver.com/..." },
    { key: "homepage", label: "홈페이지", placeholder: "https://example.com" },
    { key: "category", label: "카테고리", placeholder: "카페 / 음식점 / 숙박" },
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
            <label className="text-sm font-medium text-foreground">{f.label}</label>
            <input
              type="text"
              value={value[f.key]}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 1: 콘텐츠 유형 · 키워드
function StepTypeKeyword({
  contentType,
  onContentTypeChange,
  mainKeyword,
  onMainChange,
  subKeywords,
  onSubRemove,
  subInput,
  onSubInputChange,
  onSubAdd,
  activeKeywords,
}: {
  contentType: ContentType;
  onContentTypeChange: (v: ContentType) => void;
  mainKeyword: string;
  onMainChange: (text: string, id?: string) => void;
  subKeywords: string[];
  onSubRemove: (kw: string) => void;
  subInput: string;
  onSubInputChange: (v: string) => void;
  onSubAdd: () => void;
  activeKeywords: Array<{ keyword: string; id: string }>;
}) {
  const types: { key: ContentType; label: string; desc: string }[] = [
    { key: "blog_info", label: "정보형", desc: "키워드 중심 정보 전달, 체크리스트/요약표 포함" },
    { key: "blog_review", label: "후기성", desc: "방문 경험 기반, 시간순 서술, 사진 중심" },
    { key: "blog_list", label: "소개성 (추천형)", desc: "추천 리스트, 비교표 포함, 선택 가이드" },
  ];

  return (
    <div className="space-y-6">
      {/* Content Type */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">콘텐츠 유형 · 키워드</h3>
        <p className="text-sm text-muted-foreground">콘텐츠 유형을 선택하고 키워드를 설정하세요</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {types.map((t) => (
            <button
              key={t.key}
              onClick={() => onContentTypeChange(t.key)}
              className={`flex flex-col items-start gap-1 p-4 rounded-lg border text-left transition-colors ${
                contentType === t.key
                  ? "border-violet-500 bg-violet-50"
                  : "border-border hover:border-violet-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                    contentType === t.key ? "border-violet-600" : "border-muted-foreground/40"
                  }`}
                >
                  {contentType === t.key && <div className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                </div>
                <p className="font-medium text-sm">{t.label}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-4 border-t pt-4">
        {/* Main Keyword Dropdown */}
        <div>
          <label className="text-sm font-medium">메인 키워드</label>
          {activeKeywords.length > 0 ? (
            <select
              value={mainKeyword}
              onChange={(e) => {
                const selected = activeKeywords.find((kw) => kw.keyword === e.target.value);
                onMainChange(e.target.value, selected?.id);
              }}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">키워드를 선택하세요</option>
              {activeKeywords.map((kw) => (
                <option key={kw.id} value={kw.keyword}>
                  {kw.keyword}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={mainKeyword}
              onChange={(e) => onMainChange(e.target.value)}
              placeholder="메인 키워드를 입력하세요"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </div>

        {/* Sub Keywords */}
        <div>
          <label className="text-sm font-medium">서브 키워드</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={subInput}
              onChange={(e) => onSubInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  onSubAdd();
                }
              }}
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
    </div>
  );
}

// Step 2: 브리프 작성
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
        콘텐츠 작성 방향을 기술하세요. 브랜드 분석 결과에서 자동으로 채워집니다.
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

// Step 3: 이미지 선택
function StepImages({
  placeId,
  crawledImages,
  selectedImages,
  loading,
  uploadingCount,
  onCrawl,
  onToggle,
  onRemove,
  onFileUpload,
}: {
  placeId: string | null;
  crawledImages: CrawledImage[];
  selectedImages: string[];
  loading: boolean;
  uploadingCount: number;
  onCrawl: () => void;
  onToggle: (url: string) => void;
  onRemove: (url: string) => void;
  onFileUpload: (files: FileList) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">이미지 선택</h3>
      <p className="text-sm text-muted-foreground">
        플레이스 이미지를 불러오거나 직접 업로드하세요 (선택사항)
      </p>

      {/* Crawl Button */}
      {placeId && crawledImages.length === 0 && (
        <Button onClick={onCrawl} disabled={loading} variant="outline" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {loading ? "이미지 불러오는 중..." : "이미지 불러오기"}
        </Button>
      )}

      {/* Crawled Images Grid */}
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
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {selectedImages.includes(img.url) && (
                <div className="absolute top-1 right-1 bg-violet-600 text-white rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Upload UI */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium">직접 업로드</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileUpload(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingCount > 0}
        >
          {uploadingCount > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploadingCount > 0 ? `${uploadingCount}개 업로드 중...` : "파일 선택"}
        </Button>
      </div>

      {/* Selected Images Thumbnails */}
      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{selectedImages.length}개 선택됨</p>
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((url) => (
              <div key={url} className="relative w-16 h-16 rounded-md overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => onRemove(url)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 4: 제목 생성 및 선택
function StepTitleGeneration({
  titles,
  selectedIndex,
  editedTitle,
  loading,
  onSelect,
  onEditTitle,
  onRegenerate,
}: {
  titles: string[];
  selectedIndex: number | null;
  editedTitle: string;
  loading: boolean;
  onSelect: (i: number) => void;
  onEditTitle: (v: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">제목 생성 및 선택</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
          className="gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          다시 생성
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-muted-foreground">제목을 생성하고 있습니다...</p>
        </div>
      ) : titles.length > 0 ? (
        <div className="grid gap-2">
          {titles.map((title, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                selectedIndex === i
                  ? "border-violet-500 bg-violet-50"
                  : "border-border hover:border-violet-300"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedIndex === i ? "border-violet-600" : "border-muted-foreground/40"
                }`}
              >
                {selectedIndex === i && <div className="h-2 w-2 rounded-full bg-violet-600" />}
              </div>
              <span className="text-sm">{title}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          제목 생성 결과가 없습니다. &quot;다시 생성&quot;을 클릭하세요.
        </p>
      )}

      {/* Editable title input */}
      <div className="pt-2 border-t">
        <label className="text-sm font-medium">제목 직접 수정</label>
        <input
          type="text"
          value={editedTitle}
          onChange={(e) => onEditTitle(e.target.value)}
          placeholder="위에서 선택하거나 직접 입력하세요"
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

// Step 5: 개요 확인 및 콘텐츠 생성
function StepContentGeneration({
  content,
  isGenerating,
  savedContentId,
  saving,
  copied,
  title,
  contentType,
  mainKeyword,
  subKeywords,
  imageCount,
  addSchemaMarkup,
  onSchemaMarkupChange,
  onGenerate,
  onContentChange,
  onCopy,
  onSave,
}: {
  content: string;
  isGenerating: boolean;
  savedContentId: string | null;
  saving: boolean;
  copied: boolean;
  title: string;
  contentType: ContentType;
  mainKeyword: string;
  subKeywords: string[];
  imageCount: number;
  addSchemaMarkup: boolean;
  onSchemaMarkupChange: (v: boolean) => void;
  onGenerate: () => void;
  onContentChange: (v: string) => void;
  onCopy: () => void;
  onSave: () => void;
}) {
  const typeLabel = contentType === "blog_info" ? "정보형" : contentType === "blog_review" ? "후기성" : "소개성";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <h3 className="text-lg font-semibold">개요 확인</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">제목:</span>{" "}
            <span className="font-medium">{title || "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">유형:</span>{" "}
            <span className="font-medium">{typeLabel}</span>
          </div>
          <div>
            <span className="text-muted-foreground">메인 키워드:</span>{" "}
            <span className="font-medium">{mainKeyword || "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">서브 키워드:</span>{" "}
            <span className="font-medium">{subKeywords.length > 0 ? subKeywords.join(", ") : "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">이미지:</span>{" "}
            <span className="font-medium">{imageCount}개</span>
          </div>
        </div>
      </div>

      {/* Schema.org Toggle */}
      {!content && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-violet-600" />
            <div>
              <p className="text-sm font-medium">Schema.org 마크업</p>
              <p className="text-xs text-muted-foreground">구조화된 데이터 (FAQ, Article) 자동 삽입</p>
            </div>
            <Badge variant="outline" className="text-xs">SEO</Badge>
          </div>
          <button
            onClick={() => onSchemaMarkupChange(!addSchemaMarkup)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              addSchemaMarkup ? "bg-violet-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                addSchemaMarkup ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      {/* Generate or Result */}
      {!content && !isGenerating ? (
        <div className="flex justify-center py-8">
          <Button
            onClick={onGenerate}
            size="lg"
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-base px-8 py-6"
          >
            <Sparkles className="h-5 w-5" />
            콘텐츠 생성
          </Button>
        </div>
      ) : isGenerating ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
            <Sparkles className="h-5 w-5 text-violet-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">콘텐츠를 생성하고 있습니다...</p>
            <p className="text-xs text-muted-foreground">잠시만 기다려주세요</p>
          </div>
        </div>
      ) : (
        <>
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={onGenerate} variant="outline" size="sm" className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              재생성
            </Button>
            <Button onClick={onCopy} variant="outline" size="sm" className="gap-1">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "복사 완료!" : "복사"}
            </Button>
            {!savedContentId ? (
              <Button
                onClick={onSave}
                disabled={saving}
                size="sm"
                className="gap-1 bg-violet-600 hover:bg-violet-700"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                {saving ? "저장 중..." : "저장"}
              </Button>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                <Check className="h-3 w-3" />
                저장 완료
              </Badge>
            )}
          </div>

          {/* Content textarea */}
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full min-h-[400px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
          <p className="text-xs text-muted-foreground">
            {content.replace(/\s/g, "").length}자 | 수정 가능합니다
          </p>
        </>
      )}
    </div>
  );
}

// Step 6: 발행 채널 · 추적 시작
function StepPublishTrack({
  accounts,
  selectedId,
  onSelect,
  publishUrl,
  onPublishUrlChange,
  trackingStarted,
  trackingSaving,
  savedContentId,
  onStartTracking,
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
  publishUrl: string;
  onPublishUrlChange: (v: string) => void;
  trackingStarted: boolean;
  trackingSaving: boolean;
  savedContentId: string | null;
  onStartTracking: () => void;
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

  if (trackingStarted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-700">추적이 시작되었습니다!</p>
          <p className="text-sm text-muted-foreground mt-1">
            내일부터 SERP 순위 추적이 시작됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Publishing Channel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">발행 채널 선택</h3>
          {!showAdd && (
            <Button variant="outline" size="sm" onClick={onShowAdd} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              채널 추가
            </Button>
          )}
        </div>

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
                  <Badge variant="secondary" className="text-xs">기본</Badge>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2 text-center">
            등록된 발행 채널이 없습니다.
          </p>
        )}

        {showAdd && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">플랫폼</label>
                <select
                  value={newForm.platform}
                  onChange={(e) => onNewFormChange({ ...newForm, platform: e.target.value })}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {platforms.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">계정명</label>
                <input
                  type="text"
                  value={newForm.accountName}
                  onChange={(e) => onNewFormChange({ ...newForm, accountName: e.target.value })}
                  placeholder="블로그 계정명"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">블로그 URL (선택)</label>
                <input
                  type="text"
                  value={newForm.accountUrl}
                  onChange={(e) => onNewFormChange({ ...newForm, accountUrl: e.target.value })}
                  placeholder="https://blog.naver.com/..."
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onAddAccount} size="sm">추가</Button>
                <Button onClick={onCancelAdd} size="sm" variant="outline">취소</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Publish URL */}
      <div className="border-t pt-4">
        <label className="text-sm font-medium">발행 완료 URL</label>
        <input
          type="url"
          value={publishUrl}
          onChange={(e) => onPublishUrlChange(e.target.value)}
          placeholder="https://blog.naver.com/..."
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">
          블로그에 콘텐츠를 발행한 후 URL을 입력하세요
        </p>
      </div>

      {/* Start Tracking Button */}
      <div className="pt-2">
        <Button
          onClick={onStartTracking}
          disabled={!savedContentId || !publishUrl.trim() || trackingSaving}
          className="w-full gap-2 bg-violet-600 hover:bg-violet-700 py-6 text-base"
          size="lg"
        >
          {trackingSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {trackingSaving ? "처리 중..." : "추적 시작"}
        </Button>
        {!savedContentId && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            콘텐츠를 먼저 저장해주세요 (이전 단계)
          </p>
        )}
      </div>
    </div>
  );
}
