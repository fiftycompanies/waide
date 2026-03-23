/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
/**
 * homepage-crawl-types.ts
 * 홈페이지 디자인 크롤링 에이전트 — 공유 타입 정의
 */

export interface HomepageDesignAnalysis {
  url: string;
  crawlMethod: "http" | "playwright";
  /** Playwright 풀페이지 스크린샷 (base64 JPEG). HTTP 크롤 시 null. */
  screenshotBase64: string | null;
  text: {
    title: string;
    metaDescription: string;
    headings: string[];
    paragraphs: string[];
    fullText: string;
  };
  design: {
    colorPalette: {
      primary: string | null;
      secondary: string | null;
      accent: string | null;
      background: string | null;
      textColor: string | null;
      allColors: string[];
    };
    fonts: { heading: string | null; body: string | null };
    borderRadius: string | null;
    designStyle: string | null;
  };
  images: {
    heroImageUrl: string | null;
    logoUrl: string | null;
    ogImageUrl: string | null;
    sectionImages: string[];
    faviconUrl: string | null;
  };
  layout: {
    sections: SectionInfo[];
    navigation: NavItem[];
    hasHero: boolean;
    hasPortfolio: boolean;
    hasCta: boolean;
    hasTestimonials: boolean;
    hasFaq: boolean;
  };
  meta: {
    ogTags: Record<string, string>;
    schemaMarkup: Record<string, unknown> | null;
    canonical: string | null;
    favicon: string | null;
  };
}

export interface SectionInfo {
  type:
    | "hero"
    | "about"
    | "services"
    | "portfolio"
    | "testimonials"
    | "cta"
    | "contact"
    | "faq"
    | "footer"
    | "stats"
    | "pricing"
    | "blog"
    | "map"
    | "unknown";
  order: number;
  headingText: string | null;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface MergedDesignProfile {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  backgroundColor: string;
  textColor: string;
  headingFont: string | null;
  bodyFont: string | null;
  designStyle: string;
  sectionOrder: SectionInfo["type"][];
  heroImageCandidates: string[];
  suggestedNavigation: NavItem[];
  referenceTexts: string[];
}

export interface CrawlResult {
  analyses: HomepageDesignAnalysis[];
  merged: MergedDesignProfile;
  errors: { url: string; error: string }[];
}
