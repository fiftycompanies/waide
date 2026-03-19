/**
 * index.ts
 * Waide 컴포넌트 레지스트리 + 선택 로직
 *
 * ReferenceStructure(vision-analyzer 산출물)를 받아서
 * 각 섹션에 맞는 컴포넌트 변형을 선택한다.
 */

import type {
  ComponentPlan,
  DesignTokens,
  NavVariant,
  HeroVariant,
  AboutVariant,
  ServicesVariant,
  GalleryVariant,
  ContactVariant,
  NavProps,
  HeroProps,
  AboutProps,
  ServicesProps,
  GalleryProps,
  ContactProps,
  BlogProps,
  CtaProps,
  FooterProps,
} from "./types";

// ── 섹션 렌더러 import ──────────────────────────────────────────────────────
import { renderNav_StickyDropdown } from "./sections/nav/sticky-dropdown";
import { renderNav_MinimalFixed } from "./sections/nav/minimal-fixed";
import { renderHero_Fullscreen } from "./sections/hero/fullscreen";
import { renderHero_SplitLeft } from "./sections/hero/split-left";
import { renderHero_Centered } from "./sections/hero/centered";
import { renderAbout_ImageLeft } from "./sections/about/image-left";
import { renderAbout_ImageRight } from "./sections/about/image-right";
import { renderAbout_StatsBar } from "./sections/about/stats-bar";
import { renderServices_CardGrid } from "./sections/services/card-grid";
import { renderServices_TabPanel } from "./sections/services/tab-panel";
import { renderServices_ListDetail } from "./sections/services/list-detail";
import { renderGallery_ThreeCol } from "./sections/gallery/three-col";
import { renderGallery_Masonry } from "./sections/gallery/masonry";
import { renderContact_FormSplit } from "./sections/contact/form-split";
import { renderContact_FormCentered } from "./sections/contact/form-centered";
import { renderBlog_PostGrid } from "./sections/blog/post-grid";
import { renderCta_Banner } from "./sections/cta/banner";
import { renderFooter_Default } from "./sections/footer/default";

// ── ReferenceStructure 타입 (vision-analyzer.ts 호환) ────────────────────────

interface ReferenceSection {
  type: string;
  order: number;
  layout: string;
  colorScheme: string;
  contentHints: string;
}

interface ReferenceStructure {
  sections: ReferenceSection[];
  globalStyle: {
    designTone: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string | null;
    backgroundColor: string;
    textColor: string;
    headingFont: string | null;
    bodyFont: string | null;
    borderRadius: string;
    spacing: string;
  };
  heroStyle: {
    hasBackgroundImage: boolean;
    hasOverlay: boolean;
    textAlignment: string;
    ctaStyle: string;
  };
  navStyle: {
    position: string;
    background: string;
    alignment: string;
  };
}

interface BrandInfoLike {
  name: string;
  industry: string;
  phone: string | null;
  address: string | null;
  services: string[];
}

// ── 컴포넌트 선택 로직 ──────────────────────────────────────────────────────

function selectNav(ref: ReferenceStructure): NavVariant {
  const bg = ref.navStyle.background?.toLowerCase() || "";
  if (bg.includes("dark") || bg.includes("black") || bg.includes("primary")) {
    return "minimal-fixed";
  }
  return "sticky-dropdown";
}

function selectHero(ref: ReferenceStructure): HeroVariant {
  if (ref.heroStyle.hasBackgroundImage) {
    return "fullscreen";
  }
  const heroSection = ref.sections.find((s) => s.type === "hero");
  const layout = heroSection?.layout?.toLowerCase() || "";
  if (layout.includes("split")) {
    return "split-left";
  }
  return "centered";
}

function selectAbout(ref: ReferenceStructure): AboutVariant {
  const aboutSection = ref.sections.find((s) => s.type === "about");
  const layout = aboutSection?.layout?.toLowerCase() || "";
  if (layout.includes("stats") || layout.includes("number")) {
    return "stats-bar";
  }
  if (layout.includes("right")) {
    return "image-right";
  }
  return "image-left";
}

function selectServices(serviceCount: number): ServicesVariant {
  if (serviceCount >= 5) return "tab-panel";
  if (serviceCount >= 3) return "card-grid";
  return "list-detail";
}

function selectGallery(ref: ReferenceStructure): GalleryVariant {
  const gallerySection = ref.sections.find(
    (s) => s.type === "gallery" || s.type === "portfolio"
  );
  const layout = gallerySection?.layout?.toLowerCase() || "";
  if (layout.includes("masonry") || layout.includes("varied")) {
    return "masonry";
  }
  return "three-col";
}

function selectContact(brand: BrandInfoLike): ContactVariant {
  if (brand.address && brand.phone) {
    return "form-split";
  }
  return "form-centered";
}

export function selectComponents(
  referenceStructure: ReferenceStructure,
  brandInfo: BrandInfoLike
): ComponentPlan {
  return {
    nav: selectNav(referenceStructure),
    hero: selectHero(referenceStructure),
    about: selectAbout(referenceStructure),
    services: selectServices(brandInfo.services.length),
    gallery: selectGallery(referenceStructure),
    contact: selectContact(brandInfo),
    blog: "post-grid",
    cta: "banner",
    footer: "default",
  };
}

// ── 디자인 토큰 추출 ────────────────────────────────────────────────────────

function mapTone(designTone: string): DesignTokens["tone"] {
  const t = designTone.toLowerCase();
  if (t.includes("luxury") || t.includes("럭셔리") || t.includes("elegant")) return "luxury";
  if (t.includes("minimal") || t.includes("미니멀") || t.includes("clean")) return "minimal";
  if (t.includes("bold") || t.includes("강렬") || t.includes("vibrant")) return "bold";
  if (t.includes("warm") || t.includes("따뜻") || t.includes("cozy")) return "warm";
  return "professional";
}

function mapRadius(radius: string): DesignTokens["borderRadius"] {
  const r = radius.toLowerCase();
  if (r.includes("sharp") || r.includes("square") || r === "0") return "sharp";
  if (r.includes("round") || r.includes("pill") || r.includes("large")) return "round";
  return "soft";
}

export function extractDesignTokens(ref: ReferenceStructure): DesignTokens {
  const g = ref.globalStyle;
  return {
    primaryColor: g.primaryColor || "#1a1a2e",
    accentColor: g.accentColor || g.secondaryColor || "#c8a97e",
    backgroundColor: g.backgroundColor || "#ffffff",
    textColor: g.textColor || "#111111",
    headingFont: g.headingFont || "Noto Sans KR",
    bodyFont: g.bodyFont || "Noto Sans KR",
    tone: mapTone(g.designTone || "professional"),
    borderRadius: mapRadius(g.borderRadius || "soft"),
  };
}

// ── 렌더러 디스패처 ─────────────────────────────────────────────────────────

export function renderNav(variant: NavVariant, tokens: DesignTokens, props: NavProps): string {
  switch (variant) {
    case "sticky-dropdown": return renderNav_StickyDropdown(props, tokens);
    case "minimal-fixed": return renderNav_MinimalFixed(props, tokens);
  }
}

export function renderHero(variant: HeroVariant, tokens: DesignTokens, props: HeroProps): string {
  switch (variant) {
    case "fullscreen": return renderHero_Fullscreen(props, tokens);
    case "split-left": return renderHero_SplitLeft(props, tokens);
    case "centered": return renderHero_Centered(props, tokens);
  }
}

export function renderAbout(variant: AboutVariant, tokens: DesignTokens, props: AboutProps): string {
  switch (variant) {
    case "image-left": return renderAbout_ImageLeft(props, tokens);
    case "image-right": return renderAbout_ImageRight(props, tokens);
    case "stats-bar": return renderAbout_StatsBar(props, tokens);
  }
}

export function renderServices(variant: ServicesVariant, tokens: DesignTokens, props: ServicesProps): string {
  switch (variant) {
    case "card-grid": return renderServices_CardGrid(props, tokens);
    case "tab-panel": return renderServices_TabPanel(props, tokens);
    case "list-detail": return renderServices_ListDetail(props, tokens);
  }
}

export function renderGallery(variant: GalleryVariant, tokens: DesignTokens, props: GalleryProps): string {
  switch (variant) {
    case "three-col": return renderGallery_ThreeCol(props, tokens);
    case "masonry": return renderGallery_Masonry(props, tokens);
  }
}

export function renderContact(variant: ContactVariant, tokens: DesignTokens, props: ContactProps): string {
  switch (variant) {
    case "form-split": return renderContact_FormSplit(props, tokens);
    case "form-centered": return renderContact_FormCentered(props, tokens);
  }
}

export function renderBlog(tokens: DesignTokens, props: BlogProps): string {
  return renderBlog_PostGrid(props, tokens);
}

export function renderCta(tokens: DesignTokens, props: CtaProps): string {
  return renderCta_Banner(props, tokens);
}

export function renderFooter(tokens: DesignTokens, props: FooterProps): string {
  return renderFooter_Default(props, tokens);
}
