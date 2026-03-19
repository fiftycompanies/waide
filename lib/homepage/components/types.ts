/**
 * types.ts
 * Waide 컴포넌트 라이브러리 타입 정의
 */

// ── 디자인 토큰 ──────────────────────────────────────────────────────────────

export interface DesignTokens {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  tone: "luxury" | "minimal" | "bold" | "warm" | "professional";
  borderRadius: "sharp" | "soft" | "round";
}

// ── 섹션 컴포넌트 변형 ──────────────────────────────────────────────────────

export type NavVariant = "sticky-dropdown" | "minimal-fixed";
export type HeroVariant = "fullscreen" | "split-left" | "centered";
export type AboutVariant = "image-left" | "image-right" | "stats-bar";
export type ServicesVariant = "card-grid" | "tab-panel" | "list-detail";
export type GalleryVariant = "three-col" | "masonry";
export type ContactVariant = "form-split" | "form-centered";
export type BlogVariant = "post-grid";
export type CtaVariant = "banner";
export type FooterVariant = "default";

// ── 컴포넌트 조합 계획 ──────────────────────────────────────────────────────

export interface ComponentPlan {
  nav: NavVariant;
  hero: HeroVariant;
  about: AboutVariant;
  services: ServicesVariant;
  gallery: GalleryVariant;
  contact: ContactVariant;
  blog: BlogVariant;
  cta: CtaVariant;
  footer: FooterVariant;
}

// ── 섹션 렌더 Props ─────────────────────────────────────────────────────────

export interface NavProps {
  brandName: string;
  phone: string | null;
  menuItems: string[];
}

export interface HeroProps {
  brandName: string;
  tagline: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  backgroundImage: string | null;
}

export interface AboutProps {
  brandName: string;
  title: string;
  description: string;
  highlights: string[];
  image: string | null;
  stats: Array<{ number: string; label: string }>;
}

export interface ServicesProps {
  brandName: string;
  title: string;
  services: Array<{
    name: string;
    description: string;
    icon: string;
    image: string | null;
  }>;
}

export interface GalleryProps {
  brandName: string;
  title: string;
  images: Array<{
    src: string;
    alt: string;
  }>;
}

export interface ContactProps {
  brandName: string;
  title: string;
  phone: string | null;
  address: string | null;
  mapEmbedUrl: string | null;
}

export interface BlogProps {
  brandName: string;
  title: string;
  posts: Array<{
    title: string;
    excerpt: string;
    image: string | null;
    url: string;
  }>;
}

export interface CtaProps {
  brandName: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
}

export interface FooterProps {
  brandName: string;
  phone: string | null;
  address: string | null;
  copyright: string;
}

// ── 이미지 맵 (Unsplash CDN 이미지) ────────────────────────────────────────

export interface ImageMap {
  hero: string[];
  section: string[];
  about: string[];
  gallery: string[];
}
