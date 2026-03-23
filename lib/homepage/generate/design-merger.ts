/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * design-merger.ts
 * 다중 URL 크롤링 결과를 하나의 MergedDesignProfile로 병합
 */

import type {
  HomepageDesignAnalysis,
  MergedDesignProfile,
  SectionInfo,
  NavItem,
} from "./homepage-crawl-types";

// ── 디자인 스타일 추론 ──────────────────────────────────────────────────────

function inferDesignStyle(analysis: HomepageDesignAnalysis): string {
  const { colorPalette, fonts, borderRadius } = analysis.design;
  const allColors = colorPalette.allColors;
  const sections = analysis.layout.sections;

  // 색상 채도/명도 기반 추론
  const hasVibrant = allColors.some((c) => {
    const h = c.replace("#", "");
    if (h.length !== 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min > 100;
  });

  const hasDarkBg = colorPalette.background
    ? (() => {
        const h = colorPalette.background.replace("#", "");
        if (h.length !== 6) return false;
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 < 80;
      })()
    : false;

  const hasNaturalColors = allColors.some((c) => {
    const lower = c.toLowerCase();
    return (
      lower.startsWith("#8") ||
      lower.startsWith("#6") ||
      lower.startsWith("#a") ||
      lower.startsWith("#c8") ||
      lower.startsWith("#d4")
    );
  });

  const hasRoundedCorners = borderRadius && parseFloat(borderRadius) > 10;
  const isMinimal = sections.length <= 5 && allColors.length <= 5;

  if (hasDarkBg && hasVibrant) return "bold";
  if (isMinimal && !hasVibrant) return "minimal";
  if (hasNaturalColors && hasRoundedCorners) return "natural";
  if (allColors.some((c) => c.toLowerCase().includes("d4a")) || fonts.heading?.toLowerCase().includes("serif"))
    return "luxury";
  if (hasRoundedCorners && hasVibrant) return "warm";

  return "modern";
}

// ── 빈도 기반 색상 선택 ─────────────────────────────────────────────────────

function pickMostFrequent(values: (string | null)[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    const lower = v.toLowerCase();
    counts.set(lower, (counts.get(lower) || 0) + 1);
  }
  if (counts.size === 0) return "#2563eb"; // 기본 blue-600
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function pickFirstNonNull(values: (string | null)[]): string | null {
  return values.find((v) => v !== null) ?? null;
}

// ── 네비게이션 중복 제거 ────────────────────────────────────────────────────

function deduplicateNavItems(allItems: NavItem[]): NavItem[] {
  const seen = new Map<string, NavItem>();
  for (const item of allItems) {
    const key = item.label.toLowerCase().replace(/\s+/g, "");
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

// ── 섹션 순서 병합 (합집합 + 다수결 위치) ───────────────────────────────────

function mergeSectionOrders(
  analysesArray: HomepageDesignAnalysis[]
): SectionInfo["type"][] {
  const allTypes = new Set<SectionInfo["type"]>();
  const positionSums = new Map<SectionInfo["type"], { sum: number; count: number }>();

  for (const analysis of analysesArray) {
    for (const section of analysis.layout.sections) {
      allTypes.add(section.type);
      const entry = positionSums.get(section.type) || { sum: 0, count: 0 };
      entry.sum += section.order;
      entry.count += 1;
      positionSums.set(section.type, entry);
    }
  }

  return [...allTypes]
    .map((type) => {
      const entry = positionSums.get(type);
      const avgPos = entry ? entry.sum / entry.count : 999;
      return { type, avgPos };
    })
    .sort((a, b) => a.avgPos - b.avgPos)
    .map((e) => e.type);
}

// ── 메인 병합 함수 ──────────────────────────────────────────────────────────

export function mergeDesignProfiles(
  analyses: HomepageDesignAnalysis[]
): MergedDesignProfile {
  if (analyses.length === 0) {
    return {
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
      accentColor: null,
      backgroundColor: "#ffffff",
      textColor: "#111827",
      headingFont: null,
      bodyFont: null,
      designStyle: "modern",
      sectionOrder: ["hero", "about", "services", "portfolio", "contact"],
      heroImageCandidates: [],
      suggestedNavigation: [],
      referenceTexts: [],
    };
  }

  // 디자인 스타일 추론 (각 분석에 적용)
  const styles = analyses.map((a) => inferDesignStyle(a));
  const styleCounts = new Map<string, number>();
  styles.forEach((s) => styleCounts.set(s, (styleCounts.get(s) || 0) + 1));
  const designStyle = [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // 색상 병합
  const primaryColor = pickMostFrequent(analyses.map((a) => a.design.colorPalette.primary));
  const secondaryColor = pickMostFrequent(analyses.map((a) => a.design.colorPalette.secondary));
  const accentColor = pickFirstNonNull(analyses.map((a) => a.design.colorPalette.accent));
  const backgroundColor = pickMostFrequent(
    analyses.map((a) => a.design.colorPalette.background)
  );
  const textColor = pickMostFrequent(analyses.map((a) => a.design.colorPalette.textColor));

  // 폰트 병합 (첫 번째 non-null)
  const headingFont = pickFirstNonNull(analyses.map((a) => a.design.fonts.heading));
  const bodyFont = pickFirstNonNull(analyses.map((a) => a.design.fonts.body));

  // 섹션 순서 병합
  const sectionOrder = mergeSectionOrders(analyses);

  // 이미지 후보 수집
  const heroImageCandidates: string[] = [];
  for (const a of analyses) {
    if (a.images.heroImageUrl) heroImageCandidates.push(a.images.heroImageUrl);
    if (a.images.ogImageUrl) heroImageCandidates.push(a.images.ogImageUrl);
  }

  // 네비게이션 합집합
  const allNavItems = analyses.flatMap((a) => a.layout.navigation);
  const suggestedNavigation = deduplicateNavItems(allNavItems);

  // 텍스트 보존
  const referenceTexts = analyses.map((a) => a.text.fullText);

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    textColor,
    headingFont,
    bodyFont,
    designStyle,
    sectionOrder,
    heroImageCandidates,
    suggestedNavigation,
    referenceTexts,
  };
}
