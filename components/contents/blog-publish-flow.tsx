"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  Search,
  Globe,
  ArrowRightLeft,
} from "lucide-react";
import {
  createPublishingAccount,
  saveGeneratedContent,
  updateContentForTracking,
} from "@/lib/actions/publishing-account-actions";
import type { PublishingAccount } from "@/lib/actions/publishing-account-actions";
import { buildSearchQuery } from "@/lib/image-gap-analyzer";

// ── Types ────────────────────────────────────────────────────
interface BrandAnalysis {
  id: string;
  basic_info: Record<string, unknown> | null;
  content_strategy: Record<string, unknown> | null;
  keyword_analysis: Record<string, unknown> | null;
  place_id: string | null;
  input_url: string | null;
  url_type: string | null;
}

interface CrawledImage {
  url: string;
  phash: string;
  width: number;
  height: number;
}

interface FreeImage {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  source: "unsplash" | "pexels";
  sourceUrl: string;
  alt: string;
  width: number;
  height: number;
}

interface AutoInsertedImage {
  placeholder: string; // 원래 📷 설명 텍스트
  url: string;
  thumbnail: string;
  source: "unsplash" | "pexels";
  photographer: string;
  sourceUrl: string;
  alt: string;
  searchQuery: string;
}

interface PersonaForPublish {
  one_liner: string;
  positioning: string;
  primary_target: string;
  strengths: string[];
  tone: string;
  content_angles: string[];
  avoid_angles: string[];
  brand_story: string;
  forbidden_content: string;
  awards: string[];
  usp_details: string[];
  pain_points: string[];
  price_position: string;
}

interface OwnerInputForPublish {
  brand_story: string;
  forbidden_content: string;
  awards_certifications: string[];
}

interface PersonaExtras {
  category: string;
  region: string;
  naverPlaceUrl: string;
  homepage: string;
  placeId: string;
}

interface BlogPublishFlowProps {
  clientId: string;
  clientName?: string | null;
  clientWebsiteUrl?: string | null;
  brandAnalysis: BrandAnalysis | null;
  publishingAccounts: PublishingAccount[];
  activeKeywords: Array<{ keyword: string; id: string; monthlySearch?: number }>;
  initialKeywordId?: string;
  initialKeywordName?: string;
  personaData?: PersonaForPublish | null;
  ownerInputData?: OwnerInputForPublish | null;
  personaExtras?: PersonaExtras | null;
}

type ContentType = "blog_info" | "blog_review" | "blog_list";

/** tone 필드가 객체({style, personality})일 수 있으므로 문자열로 안전하게 추출 */
function extractToneStyle(tone: unknown): string {
  if (!tone) return "";
  if (typeof tone === "string") return tone;
  if (typeof tone === "object" && tone !== null) {
    const t = tone as Record<string, unknown>;
    // Claude API가 다양한 키 이름으로 톤 반환 가능 — 다중 폴백
    const direct = (t.style as string) || (t.personality as string) || (t.manner as string) || (t.voice as string) || (t.type as string) || (t.description as string) || "";
    if (direct) return direct;
    // 모든 키 실패 시 첫 번째 비어있지 않은 문자열 값 사용
    const firstStr = Object.values(t).find(v => typeof v === "string" && v.length > 0);
    return (firstStr as string) || "";
  }
  return String(tone);
}

const STEPS = [
  { label: "브랜드 정보", icon: Store },
  { label: "유형 · 키워드", icon: Hash },
  { label: "마케팅 포인트", icon: Pen },
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
  clientName,
  clientWebsiteUrl,
  brandAnalysis,
  publishingAccounts: initialAccounts,
  activeKeywords,
  initialKeywordId,
  initialKeywordName,
  personaData,
  ownerInputData,
  personaExtras,
}: BlogPublishFlowProps) {
  const [step, setStep] = useState(0);

  // Step 0: Brand Info
  const [brandInfo, setBrandInfo] = useState(() => {
    const bi = brandAnalysis?.basic_info || {};
    const placeId = brandAnalysis?.place_id || personaExtras?.placeId || null;
    const inputUrl = brandAnalysis?.input_url || "";
    const urlType = brandAnalysis?.url_type || "";

    // 업체명: clients.name(셀렉터와 동일) > basic_info.name > personaExtras
    const name = clientName || (bi.name as string) || "";

    // 네이버 플레이스 URL: input_url > place_id 구성 > basic_info > personaExtras
    const isNaverInput = inputUrl.includes("naver.com") || inputUrl.includes("place.naver");
    const biNaverUrl = (bi.naver_place_url as string) || (bi.place_url as string) || "";
    const naverPlaceUrl = isNaverInput
      ? inputUrl
      : biNaverUrl
        ? biNaverUrl
        : placeId
          ? `https://m.place.naver.com/place/${placeId}/home`
          : personaExtras?.naverPlaceUrl || "";

    // 홈페이지 URL: input_url(웹사이트) > basic_info > personaExtras > clients.website_url
    const isWebsiteInput = urlType === "website" || (!isNaverInput && inputUrl && !inputUrl.includes("naver.com"));
    const homepage = isWebsiteInput
      ? inputUrl
      : (bi.homepage_url as string) || (bi.homepage as string) || (bi.website as string) || (bi.website_url as string) || personaExtras?.homepage || clientWebsiteUrl || "";

    // 카테고리: basic_info 다중 필드 폴백 > personaExtras
    const category = (bi.category as string) || (bi.업종 as string) || (bi.business_type as string) || personaExtras?.category || "";

    // 지역: basic_info 다중 필드 폴백 > personaExtras
    const region = (bi.region as string) || (bi.address as string) || (bi.지역 as string) || (bi.location as string) || personaExtras?.region || "";

    // description: personaData.one_liner 우선 → 빈값이면 나중 useEffect에서 채움
    const initialDescription = personaData?.one_liner || personaData?.positioning || "";

    return {
      name,
      naverPlaceUrl,
      homepage,
      category,
      region,
      description: initialDescription,
    };
  });

  // brandInfo.description을 content_strategy에서 추출
  useEffect(() => {
    if (brandAnalysis?.content_strategy) {
      const cs = brandAnalysis.content_strategy;
      const brandA = cs.brand_analysis as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (brandA?.usp) {
        parts.push(Array.isArray(brandA.usp) ? (brandA.usp as string[]).join(", ") : String(brandA.usp));
      }
      if (brandA?.strengths) parts.push(String(brandA.strengths));
      if (parts.length > 0 && !brandInfo.description) {
        setBrandInfo((prev) => ({ ...prev, description: parts.join(". ") }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandAnalysis]);

  // Step 1: Type + Keywords
  const [contentType, setContentType] = useState<ContentType>("blog_info");
  const [mainKeyword, setMainKeyword] = useState(initialKeywordName || "");
  const [mainKeywordId, setMainKeywordId] = useState<string | null>(initialKeywordId || null);
  const [subKeywords, setSubKeywords] = useState<string[]>([]);
  const [subKeywordInput, setSubKeywordInput] = useState("");

  // Step 2: Brief + Tone/Target Override
  const [brief, setBrief] = useState("");
  const [toneOverride, setToneOverride] = useState<string | null>(null);
  const [targetOverride, setTargetOverride] = useState<string | null>(null);

  // Step 3: Images
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [crawledImages, setCrawledImages] = useState<CrawledImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  // Step 5: 자동 삽입된 무료 이미지 (콘텐츠 생성 후)
  const [autoInsertedImages, setAutoInsertedImages] = useState<AutoInsertedImage[]>([]);
  const [autoInsertLoading, setAutoInsertLoading] = useState(false);
  // 교체 검색용 상태
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [replaceResults, setReplaceResults] = useState<FreeImage[]>([]);
  const [replaceLoading, setReplaceLoading] = useState(false);

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
  const [truncationWarning, setTruncationWarning] = useState(false);

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

  // placeId 추출 보강: brandAnalysis > personaExtras > naverPlaceUrl 파싱 > input_url 파싱
  const derivedPlaceId = useMemo(() => {
    if (brandAnalysis?.place_id) return brandAnalysis.place_id;
    if (personaExtras?.placeId) return personaExtras.placeId;
    // URL 파싱 헬퍼
    const parseIdFromUrl = (url: string): string | null => {
      if (!url) return null;
      const match = url.match(/\/(?:restaurant|place|cafe|hotel|accommodation|beauty|hospital|hairshop|school|shopping|food)\/(\d+)/);
      if (match) return match[1];
      const numMatch = url.match(/\/(\d{5,})(?:\/|$|\?)/);
      return numMatch ? numMatch[1] : null;
    };
    // naverPlaceUrl 우선 파싱
    const fromNaverUrl = parseIdFromUrl(brandInfo.naverPlaceUrl);
    if (fromNaverUrl) return fromNaverUrl;
    // input_url 폴백 파싱 (brand_analyses.input_url)
    if (brandAnalysis?.input_url) {
      const fromInputUrl = parseIdFromUrl(brandAnalysis.input_url);
      if (fromInputUrl) return fromInputUrl;
    }
    // basic_info 내부 URL 폴백 파싱
    const bi = brandAnalysis?.basic_info;
    if (bi) {
      const biUrl = (bi.naver_place_url as string) || (bi.place_url as string) || "";
      const fromBiUrl = parseIdFromUrl(biUrl);
      if (fromBiUrl) return fromBiUrl;
    }
    return null;
  }, [brandAnalysis?.place_id, brandAnalysis?.input_url, brandAnalysis?.basic_info, personaExtras?.placeId, brandInfo.naverPlaceUrl]);

  // Style Transfer 학습 콘텐츠
  const searchParams = useSearchParams();
  const styleContentIds = useMemo(() => {
    const param = searchParams.get("styleContentIds");
    return param ? param.split(",").filter(Boolean) : [];
  }, [searchParams]);
  const [styleRefTitles, setStyleRefTitles] = useState<string[]>([]);

  useEffect(() => {
    if (styleContentIds.length === 0) return;
    // contents 테이블에서 제목 조회
    fetch("/api/ai/style-ref-titles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentIds: styleContentIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.titles) setStyleRefTitles(data.titles);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Brief auto-fill from content_strategy
  useEffect(() => {
    if (brandAnalysis?.content_strategy) {
      const cs = brandAnalysis.content_strategy;
      const brandA = cs.brand_analysis as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (brandA?.strengths) parts.push(`강점: ${String(brandA.strengths)}`);
      if (brandA?.target_audience) parts.push(`타겟: ${String(brandA.target_audience)}`);
      if (brandA?.tone) parts.push(`톤앤매너: ${extractToneStyle(brandA.tone)}`);
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

  const handleNext = async () => {
    if (step < STEPS.length - 1 && canGoNext()) {
      // Step 5(콘텐츠 생성)에서 다음 클릭 시 자동 저장
      if (step === 5 && generatedContent && !savedContentId && !saving) {
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
          generatedBy: "ai",
        });
        if (result.success && result.contentId) {
          setSavedContentId(result.contentId);
        }
        setSaving(false);
      }
      setStep(step + 1);
    }
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // ── Image crawling ──
  const handleCrawlImages = async () => {
    const effectivePlaceId = brandAnalysis?.place_id || derivedPlaceId;
    if (!effectivePlaceId) return;
    setImageLoading(true);
    try {
      const res = await fetch("/api/vps/image?action=crawl-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: effectivePlaceId, max_images: 12 }),
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

  // ── 교체 검색 (자동 삽입 이미지 교체용) ──
  const handleReplaceSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setReplaceLoading(true);
    try {
      const searchQ = buildSearchQuery(q, brandInfo.category);
      const res = await fetch("/api/ai/search-free-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQ, perPage: 6 }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplaceResults(data.images || []);
      }
    } catch (err) {
      console.error("Replace image search failed:", err);
    } finally {
      setReplaceLoading(false);
    }
  };

  // ── 자동 삽입 이미지 교체 ──
  const handleReplaceImage = (index: number, newImage: FreeImage) => {
    const oldUrl = autoInsertedImages[index]?.url;
    if (!oldUrl) return;
    // 마크다운 내 이미지 URL 교체
    setGeneratedContent((prev) =>
      prev.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`),
        `![${newImage.alt || autoInsertedImages[index].alt}](${newImage.url})`
      )
    );
    // autoInsertedImages 업데이트
    setAutoInsertedImages((prev) =>
      prev.map((img, i) =>
        i === index
          ? { ...img, url: newImage.url, thumbnail: newImage.thumbnail, source: newImage.source, photographer: newImage.photographer, sourceUrl: newImage.sourceUrl, alt: newImage.alt || img.alt }
          : img
      )
    );
    setReplacingIndex(null);
    setReplaceResults([]);
    setReplaceQuery("");
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
            image_base64: base64,
            filename: file.name,
          }),
        });
        if (!washRes.ok) throw new Error("wash failed");
        const washData = await washRes.json();

        // Step 2: upload image
        const uploadRes = await fetch("/api/vps/image?action=upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: washData.washed_base64 || washData.washed_data || base64,
            filename: washData.filename || file.name,
            client_id: clientId,
          }),
        });
        if (!uploadRes.ok) throw new Error("upload failed");
        const uploadData = await uploadRes.json();
        const imageUrl = uploadData.public_url ?? uploadData.url ?? uploadData.image_url ?? uploadData.path;
        if (imageUrl) {
          setSelectedImages((prev) => [...prev, imageUrl]);
        } else {
          console.error("Upload succeeded but no URL in response:", uploadData);
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
    setTruncationWarning(false);
    setAutoInsertedImages([]);

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
            region: brandInfo.region,
            description: brandInfo.description,
            // 분석 데이터 보강
            ...(brandAnalysis?.basic_info && {
              hours: (brandAnalysis.basic_info as Record<string, unknown>).business_hours ||
                     (brandAnalysis.basic_info as Record<string, unknown>).hours || undefined,
              facilities: (brandAnalysis.basic_info as Record<string, unknown>).facilities ||
                          (brandAnalysis.basic_info as Record<string, unknown>).conveniences || undefined,
              menu_items: (brandAnalysis.basic_info as Record<string, unknown>).menu_items ||
                          (brandAnalysis.basic_info as Record<string, unknown>).menus || undefined,
              booking_url: (brandAnalysis.basic_info as Record<string, unknown>).booking_url ||
                           (brandAnalysis.basic_info as Record<string, unknown>).reservation_url || undefined,
            }),
            ...(brandAnalysis?.content_strategy && (() => {
              const cs = brandAnalysis.content_strategy as Record<string, unknown>;
              const brandA = cs.brand_analysis as Record<string, unknown> | undefined;
              const reviewA = cs.review_analysis as Record<string, unknown> | undefined;
              return {
                tone_style: toneOverride !== null ? toneOverride : (extractToneStyle(brandA?.tone) || undefined),
                selling_points: reviewA?.selling_points || undefined,
              };
            })()),
            // toneOverride가 있고 content_strategy가 없을 때도 전달
            ...(!brandAnalysis?.content_strategy && toneOverride ? { tone_style: toneOverride } : {}),
            // targetOverride 전달
            ...(targetOverride ? { target_audience: targetOverride } : {}),
          },
          mainKeyword,
          subKeywords,
          imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
          title: editedTitle,
          addSchemaMarkup,
          styleRefs: styleRefTitles.length > 0 ? styleRefTitles : undefined,
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
              if (parsed.warning === "max_tokens_reached") {
                setTruncationWarning(true);
              }
            } catch {
              // skip
            }
          }
        }
      }
      // Post-process: replace 📷 placeholders with actual image URLs
      if (selectedImages.length > 0) {
        let imgIdx = 0;
        accumulated = accumulated.replace(
          /^>\s*📷\s*\[이미지 추천\].*$/gm,
          (match) => {
            if (imgIdx < selectedImages.length) {
              const url = selectedImages[imgIdx];
              imgIdx++;
              return `![이미지](${url})`;
            }
            return match;
          }
        );
      }

      // 먼저 콘텐츠 표시 (자동 삽입은 비동기로 후처리)
      setGeneratedContent(accumulated);

      // 남은 📷 플레이스홀더 수집 → 무료 이미지 자동 검색 + 삽입
      const phRegex = /^>\s*📷\s*\[이미지 추천\]\s*(.+)$/gm;
      const remainingPhs: Array<{ fullMatch: string; description: string }> = [];
      let phMatch: RegExpExecArray | null;
      while ((phMatch = phRegex.exec(accumulated)) !== null) {
        const desc = phMatch[1].replace(/\s*—.*$/, "").trim();
        remainingPhs.push({ fullMatch: phMatch[0], description: desc });
      }

      if (remainingPhs.length > 0) {
        setAutoInsertLoading(true);
        try {
          const searchResults = await Promise.all(
            remainingPhs.map(async (ph) => {
              const q = buildSearchQuery(ph.description, brandInfo.category);
              try {
                const res = await fetch("/api/ai/search-free-images", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ query: q, perPage: 1 }),
                });
                if (res.ok) {
                  const data = await res.json();
                  return { ...ph, image: (data.images?.[0] as FreeImage) || null };
                }
              } catch {}
              return { ...ph, image: null as FreeImage | null };
            })
          );

          let updatedContent = accumulated;
          const inserted: AutoInsertedImage[] = [];
          for (const result of searchResults) {
            if (result.image) {
              updatedContent = updatedContent.replace(
                result.fullMatch,
                `![${result.image.alt || result.description}](${result.image.url})`
              );
              inserted.push({
                placeholder: result.description,
                url: result.image.url,
                thumbnail: result.image.thumbnail,
                source: result.image.source,
                photographer: result.image.photographer,
                sourceUrl: result.image.sourceUrl,
                alt: result.image.alt || result.description,
                searchQuery: result.description,
              });
            }
          }
          if (inserted.length > 0) {
            setGeneratedContent(updatedContent);
            setAutoInsertedImages(inserted);
          }
        } catch (err) {
          console.error("Auto image insertion failed:", err);
        } finally {
          setAutoInsertLoading(false);
        }
      }
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
      generatedBy: "ai",
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
            <StepBrandInfo value={brandInfo} onChange={setBrandInfo} personaData={personaData} />
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
              styleRefTitles={styleRefTitles}
              brandAnalysis={brandAnalysis}
              onAddSubKeyword={(kw) => {
                if (kw && !subKeywords.includes(kw)) {
                  setSubKeywords([...subKeywords, kw]);
                }
              }}
            />
          )}
          {step === 2 && (
            <StepBrief
              value={brief}
              onChange={setBrief}
              brandAnalysis={brandAnalysis}
              personaData={personaData}
              ownerInputData={ownerInputData}
              subKeywords={subKeywords}
              toneOverride={toneOverride}
              onToneOverride={setToneOverride}
              targetOverride={targetOverride}
              onTargetOverride={setTargetOverride}
            />
          )}
          {step === 3 && (
            <StepImages
              placeId={brandAnalysis?.place_id || derivedPlaceId}
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
            <>
              <StepContentGeneration
                content={generatedContent}
                isGenerating={isGenerating}
                savedContentId={savedContentId}
                copied={copied}
                title={editedTitle}
                contentType={contentType}
                mainKeyword={mainKeyword}
                subKeywords={subKeywords}
                imageCount={selectedImages.length}
                truncationWarning={truncationWarning}
                addSchemaMarkup={addSchemaMarkup}
                onSchemaMarkupChange={setAddSchemaMarkup}
                onGenerate={handleGenerate}
                onContentChange={setGeneratedContent}
                onCopy={handleCopy}
              />
              {/* 자동 삽입 이미지 로딩 표시 */}
              {autoInsertLoading && generatedContent && !isGenerating && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-700">무료 이미지를 자동으로 검색하여 삽입하고 있습니다...</p>
                </div>
              )}
              {/* 자동 삽입된 이미지 목록 */}
              {autoInsertedImages.length > 0 && generatedContent && !isGenerating && !autoInsertLoading && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                  <p className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {autoInsertedImages.length}개 무료 이미지가 자동 삽입되었습니다
                  </p>
                  <div className="space-y-2">
                    {autoInsertedImages.map((img, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-3 bg-white rounded-md p-2 border border-emerald-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.thumbnail} alt={img.alt} className="w-12 h-12 rounded object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{img.placeholder}</p>
                            <p className="text-[10px] text-muted-foreground/70">
                              {img.source === "unsplash" ? "Unsplash" : "Pexels"} · {img.photographer}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (replacingIndex === idx) {
                                setReplacingIndex(null);
                                setReplaceResults([]);
                                setReplaceQuery("");
                              } else {
                                setReplacingIndex(idx);
                                setReplaceQuery(img.searchQuery);
                                setReplaceResults([]);
                              }
                            }}
                            className="text-xs px-2 py-1 rounded-md bg-white border border-muted-foreground/20 hover:bg-muted/50 transition-colors flex items-center gap-1 shrink-0"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            교체
                          </button>
                        </div>
                        {/* 교체 검색 UI */}
                        {replacingIndex === idx && (
                          <div className="ml-4 p-2 rounded-md bg-white border border-muted-foreground/20 space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replaceQuery}
                                onChange={(e) => setReplaceQuery(e.target.value)}
                                placeholder="대체 이미지 검색"
                                onKeyDown={(e) => { if (e.key === "Enter") handleReplaceSearch(replaceQuery); }}
                                className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              <Button
                                onClick={() => handleReplaceSearch(replaceQuery)}
                                disabled={replaceLoading || !replaceQuery.trim()}
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1"
                              >
                                {replaceLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                                검색
                              </Button>
                            </div>
                            {replaceResults.length > 0 && (
                              <div className="grid grid-cols-3 gap-1.5">
                                {replaceResults.map((ri) => (
                                  <button
                                    key={ri.id}
                                    onClick={() => handleReplaceImage(idx, ri)}
                                    className="relative aspect-square rounded overflow-hidden border hover:ring-2 hover:ring-violet-300 transition-all"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={ri.thumbnail} alt={ri.alt} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                                      <span className="text-[8px] text-white/80 truncate block">
                                        {ri.source === "unsplash" ? "U" : "P"} · {ri.photographer}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Unsplash/Pexels 무료 이미지 (상업적 이용 가능). &quot;교체&quot;로 다른 이미지로 변경할 수 있습니다.
                  </p>
                </div>
              )}
            </>
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
              disabled={!canGoNext() || (step === 5 && saving)}
              className="gap-1 bg-violet-600 hover:bg-violet-700"
            >
              {step === 5 && saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {step === 5 && !savedContentId ? "저장 후 다음" : "다음"}
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
// Keyword Combobox — 검색 + 인라인 등록
// ═══════════════════════════════════════════════════════════════
function KeywordCombobox({
  value,
  onChange,
  activeKeywords,
}: {
  value: string;
  onChange: (text: string, id?: string) => void;
  activeKeywords: Array<{ keyword: string; id: string; monthlySearch?: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = activeKeywords.filter((kw) =>
    kw.keyword.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = activeKeywords.some(
    (kw) => kw.keyword.toLowerCase() === search.toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-medium">메인 키워드</label>
      <div className="relative mt-1">
        <input
          type="text"
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setSearch(value);
            setOpen(true);
          }}
          placeholder="키워드를 검색하거나 입력하세요"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {value && !open && (
          <button
            onClick={() => {
              onChange("", undefined);
              setSearch("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border bg-popover shadow-md">
          {filtered.length > 0 ? (
            filtered.map((kw) => (
              <button
                key={kw.id}
                onClick={() => {
                  onChange(kw.keyword, kw.id);
                  setSearch("");
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${
                  value === kw.keyword ? "bg-accent font-medium" : ""
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{kw.keyword}</span>
                </span>
                {kw.monthlySearch ? (
                  <span className="text-xs text-muted-foreground shrink-0">{kw.monthlySearch.toLocaleString()}/월</span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              일치하는 키워드가 없습니다
            </div>
          )}
          {search.trim() && !exactMatch && (
            <button
              onClick={() => {
                onChange(search.trim(), undefined);
                setSearch("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm border-t hover:bg-accent transition-colors text-left text-violet-600 font-medium"
            >
              <Plus className="h-3 w-3 flex-shrink-0" />
              &quot;{search.trim()}&quot; 직접 입력
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Step Components
// ═══════════════════════════════════════════════════════════════

// Step 0: 브랜드 정보 확인
function StepBrandInfo({
  value,
  onChange,
  personaData,
}: {
  value: { name: string; naverPlaceUrl: string; homepage: string; category: string; region: string; description: string };
  onChange: (v: typeof value) => void;
  personaData?: PersonaForPublish | null;
}) {
  const fields: { key: keyof typeof value; label: string; placeholder: string }[] = [
    { key: "name", label: "업체명", placeholder: "캠핏 글램핑" },
    { key: "naverPlaceUrl", label: "네이버 플레이스 URL", placeholder: "https://m.place.naver.com/..." },
    { key: "homepage", label: "홈페이지", placeholder: "https://example.com" },
    { key: "category", label: "카테고리", placeholder: "카페 / 음식점 / 숙박" },
    { key: "region", label: "지역", placeholder: "서울 강남구 / 제주시" },
    { key: "description", label: "브랜드 특징", placeholder: "프리미엄 글램핑, 자연 속 힐링 체험" },
  ];

  // 페르소나 요약 항목 (있는 것만 표시)
  const personaSummary = (() => {
    if (!personaData) return [];
    const items: { label: string; value: string }[] = [];
    if (personaData.one_liner) items.push({ label: "한줄 소개", value: personaData.one_liner });
    if (personaData.positioning) items.push({ label: "포지셔닝", value: personaData.positioning });
    if (personaData.primary_target) items.push({ label: "타겟 고객", value: personaData.primary_target });
    if (personaData.tone) items.push({ label: "톤앤매너", value: personaData.tone });
    return items;
  })();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">브랜드 정보 확인</h3>
      <p className="text-sm text-muted-foreground">
        브랜드 분석 결과에서 가져온 정보입니다. 필요시 수정하세요.
      </p>

      {/* 페르소나 요약 카드 */}
      {personaSummary.length > 0 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-1.5">
          <p className="text-sm font-medium text-violet-700 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            브랜드 페르소나
          </p>
          {personaSummary.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-xs text-violet-500 shrink-0 min-w-[60px]">{item.label}:</span>
              <span className="text-sm text-violet-700">{item.value}</span>
            </div>
          ))}
        </div>
      )}

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
  styleRefTitles,
  brandAnalysis,
  onAddSubKeyword,
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
  activeKeywords: Array<{ keyword: string; id: string; monthlySearch?: number }>;
  styleRefTitles?: string[];
  brandAnalysis?: BrandAnalysis | null;
  onAddSubKeyword?: (kw: string) => void;
}) {
  const types: { key: ContentType; label: string; desc: string }[] = [
    { key: "blog_info", label: "정보형", desc: "키워드 중심 정보 전달, 체크리스트/요약표 포함" },
    { key: "blog_review", label: "후기성", desc: "방문 경험 기반, 시간순 서술, 사진 중심" },
    { key: "blog_list", label: "소개성 (추천형)", desc: "추천 리스트, 비교표 포함, 선택 가이드" },
  ];

  // 분석 추천 키워드 추출
  const recommendedKeywords = (() => {
    if (!brandAnalysis?.keyword_analysis) return [];
    const ka = brandAnalysis.keyword_analysis;
    const keywords = (ka.keywords as Array<Record<string, unknown>> | undefined) || [];
    const high = keywords
      .filter((k) => k.priority === "high" || k.priority === "높음")
      .slice(0, 5);
    return high.length > 0 ? high : keywords.slice(0, 3);
  })();

  // AI 추천 콘텐츠 방향 추출
  const contentAngles = (() => {
    if (!brandAnalysis?.content_strategy) return [];
    const cs = brandAnalysis.content_strategy;
    return ((cs.content_angles as string[] | undefined) || []).slice(0, 5);
  })();

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
        {/* Main Keyword Combobox */}
        <KeywordCombobox
          value={mainKeyword}
          onChange={onMainChange}
          activeKeywords={activeKeywords}
        />

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

        {/* Style Transfer 학습 콘텐츠 */}
        {styleRefTitles && styleRefTitles.length > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
            <p className="text-sm font-medium text-violet-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              스타일 학습 적용 중
            </p>
            <div className="flex flex-wrap gap-1.5">
              {styleRefTitles.map((t, i) => (
                <Badge key={i} variant="outline" className="border-violet-200 text-violet-700 text-xs">
                  {t}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              선택한 베스트 글의 문체와 구조를 참고하여 콘텐츠를 생성합니다
            </p>
          </div>
        )}

        {/* 분석 추천 키워드 */}
        {recommendedKeywords.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
            <p className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              분석 추천 키워드
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommendedKeywords.map((k, i) => {
                const kObj = k as Record<string, unknown>;
                const kwText = String(kObj.keyword || kObj.name || "");
                if (!kwText) return null;
                const isSelected = mainKeyword === kwText;
                return (
                  <button
                    key={i}
                    onClick={() => !isSelected && onMainChange(kwText)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    <Hash className="h-3 w-3" />
                    {kwText}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              클릭하면 메인 키워드로 설정됩니다
            </p>
          </div>
        )}

        {/* AI 추천 콘텐츠 방향 */}
        {contentAngles.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI 추천 콘텐츠 방향
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contentAngles.map((angle, i) => {
                const isAdded = subKeywords.includes(angle);
                return (
                  <button
                    key={i}
                    onClick={() => !isAdded && onAddSubKeyword?.(angle)}
                    disabled={isAdded}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isAdded
                        ? "bg-amber-200 text-amber-500 cursor-default"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    {angle}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              클릭하면 서브 키워드로 추가됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 인라인 편집 가능한 필드 컴포넌트 ──
function EditableField({
  label,
  icon,
  value,
  placeholder,
  onSave,
  onDelete,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value);

  const commit = () => {
    onSave(input.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs text-purple-500 shrink-0">{label}:</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setInput(value); setEditing(false); }
            }}
            onBlur={commit}
            autoFocus
            className="flex h-7 flex-1 rounded-md border border-purple-300 bg-white px-2 py-0.5 text-sm text-purple-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-400"
            placeholder={placeholder}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-sm text-purple-700 truncate">{value || `(${placeholder})`}</span>
          <button
            onClick={() => { setInput(value); setEditing(true); }}
            className="text-purple-400 hover:text-purple-600 shrink-0"
            title="수정"
          >
            <Pen className="h-3 w-3" />
          </button>
          {value && (
            <button onClick={onDelete} className="text-purple-400 hover:text-red-500 shrink-0" title="삭제">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Step 2: 브리프 작성 (v2: 페르소나 기반 pre-fill + 보완사항)
function StepBrief({
  value,
  onChange,
  brandAnalysis,
  personaData,
  ownerInputData,
  subKeywords,
  toneOverride,
  onToneOverride,
  targetOverride,
  onTargetOverride,
}: {
  value: string;
  onChange: (v: string) => void;
  brandAnalysis?: BrandAnalysis | null;
  personaData?: PersonaForPublish | null;
  ownerInputData?: OwnerInputForPublish | null;
  subKeywords?: string[];
  toneOverride?: string | null;
  onToneOverride?: (v: string | null) => void;
  targetOverride?: string | null;
  onTargetOverride?: (v: string | null) => void;
}) {
  // 톤앤매너 (override 우선 → 페르소나 → brandAnalysis 다중 폴백)
  const baseTone = personaData?.tone || (() => {
    if (!brandAnalysis?.content_strategy) return "";
    const cs = brandAnalysis?.content_strategy || {};
    // brand_analysis 키 우선, blog 키 폴백
    const brandA = (cs.brand_analysis || cs.blog) as Record<string, unknown> | undefined;
    const fromBrandA = extractToneStyle(brandA?.tone);
    if (fromBrandA) return fromBrandA;
    // content_strategy 루트 레벨 tone 폴백
    const fromRoot = extractToneStyle(cs.tone);
    if (fromRoot) return fromRoot;
    return "";
  })();
  const effectiveTone = toneOverride !== null && toneOverride !== undefined ? toneOverride : baseTone;

  // 타겟 (override 우선 → 페르소나 → brandAnalysis 다중 폴백)
  const baseTarget = personaData?.primary_target || (() => {
    if (!brandAnalysis?.content_strategy) return "";
    const cs = brandAnalysis.content_strategy;
    const brandA = (cs.brand_analysis || cs.blog) as Record<string, unknown> | undefined;
    return String(brandA?.target_audience || brandA?.target_customer || brandA?.target || brandA?.primary_target || "");
  })();
  const effectiveTarget = targetOverride !== null && targetOverride !== undefined ? targetOverride : baseTarget;

  // 톤 추가 모드
  const [showAddTone, setShowAddTone] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">마케팅 포인트</h3>
      <p className="text-sm text-muted-foreground">
        콘텐츠를 작성할 포인트를 기술하세요. 해당 내용을 반영하여 AI가 원고를 작성합니다.
      </p>

      {/* 톤앤매너 + 타겟 편집 카드 */}
      <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2">
        <p className="text-xs font-medium text-purple-600 mb-1">콘텐츠 설정</p>

        {/* 톤앤매너 */}
        {effectiveTone ? (
          <EditableField
            label="톤앤매너"
            icon={<Pen className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
            value={effectiveTone}
            placeholder="톤앤매너 입력"
            onSave={(v) => onToneOverride?.(v)}
            onDelete={() => { onToneOverride?.(""); }}
          />
        ) : !showAddTone ? (
          <button
            onClick={() => setShowAddTone(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          >
            <Plus className="h-3 w-3" />
            톤앤매너 추가
          </button>
        ) : (
          <EditableField
            label="톤앤매너"
            icon={<Pen className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
            value=""
            placeholder="예: 친근하고 따뜻한 해요체"
            onSave={(v) => { onToneOverride?.(v); setShowAddTone(false); }}
            onDelete={() => setShowAddTone(false)}
          />
        )}

        {/* 타겟 */}
        {effectiveTarget ? (
          <EditableField
            label="타겟"
            icon={<Store className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
            value={effectiveTarget}
            placeholder="타겟 고객 입력"
            onSave={(v) => onTargetOverride?.(v)}
            onDelete={() => { onTargetOverride?.(""); }}
          />
        ) : !showAddTarget ? (
          <button
            onClick={() => setShowAddTarget(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          >
            <Plus className="h-3 w-3" />
            타겟 추가
          </button>
        ) : (
          <EditableField
            label="타겟"
            icon={<Store className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
            value=""
            placeholder="예: 20~30대 커플, 가족 단위"
            onSave={(v) => { onTargetOverride?.(v); setShowAddTarget(false); }}
            onDelete={() => setShowAddTarget(false)}
          />
        )}
      </div>

      {/* 브랜드 스토리 (있으면 표시) */}
      {(ownerInputData?.brand_story || personaData?.brand_story) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-xs font-medium text-amber-700 mb-1">브랜드 스토리</p>
          <p className="text-sm text-amber-800">
            {ownerInputData?.brand_story || personaData?.brand_story}
          </p>
        </div>
      )}

      {/* 수상/인증 (있으면 표시) */}
      {ownerInputData?.awards_certifications && ownerInputData.awards_certifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ownerInputData.awards_certifications.map((award, i) => (
            <button
              key={i}
              onClick={() => {
                if (!value.includes(award)) {
                  onChange(value ? `${value}\n${award}` : award);
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
            >
              <Plus className="h-3 w-3" />
              {award}
            </button>
          ))}
        </div>
      )}

      {/* 금지 사항 (있으면 경고 표시) */}
      {(ownerInputData?.forbidden_content || personaData?.forbidden_content) && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <p className="text-xs font-medium text-red-600 mb-1">금지 사항</p>
          <p className="text-sm text-red-700">
            {ownerInputData?.forbidden_content || personaData?.forbidden_content}
          </p>
        </div>
      )}

      {/* 서브키워드 표시 (Step 1에서 입력한 값 확인) */}
      {subKeywords && subKeywords.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
          <p className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            서브키워드
          </p>
          <div className="flex flex-wrap gap-1.5">
            {subKeywords.map((kw, i) => (
              <Badge key={i} variant="outline" className="border-blue-200 text-blue-700 text-xs">
                {kw}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            콘텐츠 생성 시 위 서브키워드가 자동 반영됩니다
          </p>
        </div>
      )}

      {/* 추가 강조 사항 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/30 p-3 space-y-2">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Pen className="h-3.5 w-3.5" />
          추가 강조 사항
        </p>
        <p className="text-xs text-muted-foreground">
          AI 원고에 추가로 반영할 내용을 자유롭게 입력하세요.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="이번 글에 특별히 강조할 포인트를 입력하세요."
          className="w-full min-h-[120px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
      </div>
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
        플레이스 이미지를 불러오거나 직접 업로드하세요. 이미지가 없으면 콘텐츠 생성 시 무료 이미지가 자동 삽입됩니다.
      </p>

      {/* 방법 1: 네이버 플레이스 이미지 */}
      <div className="space-y-3">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5" />
          방법 1. 네이버 플레이스 이미지
        </p>
        {placeId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">플레이스에서 이미지를 자동으로 가져옵니다 (워싱 처리)</p>
              <Button onClick={onCrawl} disabled={loading} variant="outline" size="sm" className="gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {loading ? "불러오는 중..." : crawledImages.length > 0 ? "다시 불러오기" : "이미지 불러오기"}
              </Button>
            </div>
            {crawledImages.length > 0 ? (
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
            ) : !loading ? (
              <p className="text-xs text-muted-foreground">&quot;이미지 불러오기&quot;를 클릭하면 플레이스 이미지를 가져옵니다</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              네이버 플레이스 연동이 없습니다. 직접 업로드를 이용하세요.
            </p>
          </div>
        )}
      </div>

      {/* 방법 2: 직접 업로드 */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          방법 2. 직접 업로드
        </p>
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
            <Plus className="h-4 w-4" />
          )}
          {uploadingCount > 0 ? `${uploadingCount}개 업로드 중...` : "파일 선택"}
        </Button>
      </div>

      {/* 선택된 이미지 목록 */}
      {selectedImages.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{selectedImages.length}개 선택됨</p>
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((url) => (
              <div key={url} className="relative group">
                <div className="w-16 h-16 rounded-md overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
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

      {/* 이미지 없을 때 안내 */}
      {selectedImages.length === 0 && (
        <div className="rounded-lg bg-blue-50/50 border border-blue-200 p-3">
          <p className="text-xs text-blue-700">
            이미지를 선택하지 않으면 콘텐츠 생성 시 Unsplash/Pexels에서 무료 이미지가 자동으로 검색되어 삽입됩니다.
          </p>
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
  copied,
  title,
  contentType,
  mainKeyword,
  subKeywords,
  imageCount,
  truncationWarning,
  addSchemaMarkup,
  onSchemaMarkupChange,
  onGenerate,
  onContentChange,
  onCopy,
}: {
  content: string;
  isGenerating: boolean;
  savedContentId: string | null;
  copied: boolean;
  title: string;
  contentType: ContentType;
  mainKeyword: string;
  subKeywords: string[];
  imageCount: number;
  truncationWarning: boolean;
  addSchemaMarkup: boolean;
  onSchemaMarkupChange: (v: boolean) => void;
  onGenerate: () => void;
  onContentChange: (v: string) => void;
  onCopy: () => void;
}) {
  const typeLabel = contentType === "blog_info" ? "정보형" : contentType === "blog_review" ? "후기성" : "소개성";

  // Progress bar with elapsed time
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isGenerating) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  // Estimated 60s for content generation
  const estimatedSeconds = 60;
  const progressPercent = isGenerating
    ? Math.min(Math.round((elapsed / estimatedSeconds) * 100), 95)
    : 0;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedLabel = elapsedMin > 0
    ? `${elapsedMin}분 ${elapsedSec}초`
    : `${elapsedSec}초`;

  // 단계별 상태 메시지
  const stageMessages = [
    { threshold: 0, label: "브랜드 정보 분석 중..." },
    { threshold: 8, label: "키워드 전략 수립 중..." },
    { threshold: 18, label: "콘텐츠 구조 설계 중..." },
    { threshold: 30, label: "원고 작성 중..." },
    { threshold: 50, label: "SEO 최적화 적용 중..." },
    { threshold: 70, label: "마무리 검수 중..." },
  ];
  const currentStage = stageMessages
    .filter((s) => elapsed >= s.threshold)
    .pop()?.label || stageMessages[0].label;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-lg font-semibold">콘텐츠 방향</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">제목</p>
              <p className="text-sm font-medium truncate">{title || "-"}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">유형</p>
              <p className="text-sm font-medium">{typeLabel}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">메인 키워드</p>
              <p className="text-sm font-medium">{mainKeyword || "-"}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">서브 키워드</p>
              <p className="text-sm font-medium truncate">{subKeywords.length > 0 ? subKeywords.join(", ") : "-"}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">이미지</p>
              <p className="text-sm font-medium">{imageCount}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema.org Toggle */}
      {!content && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-violet-600" />
            <div>
              <p className="text-sm font-medium">AEO 구조 반영</p>
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
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
            <Sparkles className="h-4 w-4 text-violet-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="w-full max-w-md space-y-3">
            <p className="text-center text-sm font-medium text-violet-700 transition-all duration-500">
              {currentStage}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>진행률</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              경과 시간: {elapsedLabel}
            </p>
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
            {savedContentId && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                <Check className="h-3 w-3" />
                저장 완료
              </Badge>
            )}
          </div>

          {/* Truncation warning */}
          {truncationWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              ⚠️ 콘텐츠가 최대 길이에 도달하여 잘렸을 수 있습니다. &quot;재생성&quot;을 눌러 다시 시도하세요.
            </div>
          )}

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
