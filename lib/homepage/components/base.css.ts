/**
 * base.css.ts
 * Waide 컴포넌트 라이브러리 CSS 변수 시스템
 *
 * 모든 컴포넌트는 var(--waide-*) 변수만 사용.
 * 하드코딩 색상 절대 금지.
 */

import type { DesignTokens } from "./types";

const RADIUS_MAP: Record<DesignTokens["borderRadius"], string> = {
  sharp: "0px",
  soft: "8px",
  round: "16px",
};

export function buildBaseCss(tokens: DesignTokens): string {
  const radius = RADIUS_MAP[tokens.borderRadius];

  return `
/* ===== Waide Component Library — Design Tokens ===== */
:root {
  --waide-primary: ${tokens.primaryColor};
  --waide-accent: ${tokens.accentColor};
  --waide-bg: ${tokens.backgroundColor};
  --waide-text: ${tokens.textColor};
  --waide-font-heading: '${tokens.headingFont}', sans-serif;
  --waide-font-body: '${tokens.bodyFont}', sans-serif;
  --waide-radius: ${radius};
  --waide-radius-sm: ${tokens.borderRadius === "sharp" ? "0px" : "4px"};
  --waide-radius-lg: ${tokens.borderRadius === "round" ? "24px" : tokens.borderRadius === "soft" ? "12px" : "0px"};
  --waide-shadow: 0 2px 12px rgba(0,0,0,0.08);
  --waide-shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --waide-transition: all 0.3s ease;
}

/* ===== Reset & Base ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: var(--waide-font-body);
  color: var(--waide-text);
  background-color: var(--waide-bg);
  line-height: 1.7;
  overflow-x: hidden;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--waide-font-heading);
  line-height: 1.3;
  font-weight: 700;
}

a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; display: block; }
button { cursor: pointer; border: none; font-family: inherit; }

/* ===== Waide Layout ===== */
.waide-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.waide-section {
  padding: 80px 0;
}

.waide-section-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--waide-text);
}

.waide-section-subtitle {
  font-size: 1.1rem;
  color: var(--waide-text);
  opacity: 0.7;
  margin-bottom: 48px;
  max-width: 640px;
}

.waide-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--waide-radius);
  transition: var(--waide-transition);
  letter-spacing: 0.02em;
}

.waide-btn--primary {
  background: var(--waide-accent);
  color: #fff;
}
.waide-btn--primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: var(--waide-shadow);
}

.waide-btn--outline {
  background: transparent;
  color: var(--waide-accent);
  border: 2px solid var(--waide-accent);
}
.waide-btn--outline:hover {
  background: var(--waide-accent);
  color: #fff;
}

/* ===== Nav ===== */
.waide-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: var(--waide-transition);
}

.waide-nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.waide-nav__logo {
  font-family: var(--waide-font-heading);
  font-size: 1.4rem;
  font-weight: 700;
}

.waide-nav__menu {
  display: flex;
  gap: 32px;
  list-style: none;
}

.waide-nav__link {
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0.85;
  transition: var(--waide-transition);
}
.waide-nav__link:hover { opacity: 1; }

.waide-nav__cta {
  font-size: 0.9rem;
  padding: 10px 24px;
}

/* ===== Hero ===== */
.waide-hero {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
}

.waide-hero--fullscreen {
  background-size: cover;
  background-position: center;
  color: #fff;
}

.waide-hero--fullscreen .waide-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.3));
  z-index: 1;
}

.waide-hero__content {
  position: relative;
  z-index: 2;
}

.waide-hero__title {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  font-weight: 800;
  margin-bottom: 20px;
}

.waide-hero__subtitle {
  font-size: clamp(1rem, 2vw, 1.3rem);
  opacity: 0.9;
  margin-bottom: 36px;
  max-width: 560px;
  line-height: 1.7;
}

.waide-hero--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  min-height: 100vh;
  padding-top: 80px;
}

.waide-hero--split .waide-hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.waide-hero--centered {
  text-align: center;
  justify-content: center;
}

.waide-hero--centered .waide-hero__content {
  max-width: 720px;
  margin: 0 auto;
}

.waide-hero--centered .waide-hero__subtitle {
  margin-left: auto;
  margin-right: auto;
}

/* ===== About ===== */
.waide-about {
  background: var(--waide-bg);
}

.waide-about__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.waide-about__image {
  width: 100%;
  border-radius: var(--waide-radius-lg);
  box-shadow: var(--waide-shadow-lg);
  object-fit: cover;
  aspect-ratio: 4/3;
}

.waide-about__title {
  font-size: 1.8rem;
  margin-bottom: 20px;
}

.waide-about__text {
  font-size: 1.05rem;
  line-height: 1.8;
  opacity: 0.85;
  margin-bottom: 24px;
}

.waide-about__highlights {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.waide-about__highlights li {
  padding-left: 24px;
  position: relative;
  font-size: 0.95rem;
}

.waide-about__highlights li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 8px;
  height: 8px;
  background: var(--waide-accent);
  border-radius: 50%;
}

.waide-about__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.waide-about__stat-number {
  font-family: var(--waide-font-heading);
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--waide-accent);
}

.waide-about__stat-label {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 4px;
}

/* ===== Services ===== */
.waide-services {
  background: color-mix(in srgb, var(--waide-primary) 5%, var(--waide-bg));
}

.waide-services__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.waide-services__card {
  background: var(--waide-bg);
  border-radius: var(--waide-radius);
  padding: 36px 28px;
  box-shadow: var(--waide-shadow);
  transition: var(--waide-transition);
}

.waide-services__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--waide-shadow-lg);
}

.waide-services__icon {
  font-size: 2.4rem;
  margin-bottom: 20px;
}

.waide-services__card-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.waide-services__card-text {
  font-size: 0.95rem;
  opacity: 0.75;
  line-height: 1.6;
}

.waide-services__card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: var(--waide-radius-sm);
  margin-bottom: 20px;
}

/* Services Tab */
.waide-services__tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.waide-services__tab {
  padding: 10px 24px;
  border-radius: var(--waide-radius);
  background: transparent;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--waide-text);
  opacity: 0.6;
  transition: var(--waide-transition);
  border: 1px solid transparent;
}

.waide-services__tab--active {
  background: var(--waide-accent);
  color: #fff;
  opacity: 1;
}

.waide-services__panel {
  display: none;
}
.waide-services__panel--active {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}

.waide-services__panel-image {
  width: 100%;
  border-radius: var(--waide-radius);
  object-fit: cover;
  aspect-ratio: 4/3;
}

/* Services List-Detail */
.waide-services__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.waide-services__list-item {
  padding: 20px 24px;
  border: 1px solid color-mix(in srgb, var(--waide-text) 12%, transparent);
  border-radius: var(--waide-radius);
  transition: var(--waide-transition);
}

.waide-services__list-item:hover {
  border-color: var(--waide-accent);
  box-shadow: var(--waide-shadow);
}

/* ===== Gallery ===== */
.waide-gallery__grid {
  display: grid;
  gap: 16px;
}

.waide-gallery__grid--three-col {
  grid-template-columns: repeat(3, 1fr);
}

.waide-gallery__grid--masonry {
  columns: 3;
  column-gap: 16px;
}

.waide-gallery__item {
  overflow: hidden;
  border-radius: var(--waide-radius);
}

.waide-gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--waide-transition);
}

.waide-gallery__item:hover img {
  transform: scale(1.05);
}

.waide-gallery__grid--masonry .waide-gallery__item {
  break-inside: avoid;
  margin-bottom: 16px;
}

/* ===== Blog ===== */
.waide-blog__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.waide-blog__card {
  background: var(--waide-bg);
  border-radius: var(--waide-radius);
  overflow: hidden;
  box-shadow: var(--waide-shadow);
  transition: var(--waide-transition);
}

.waide-blog__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--waide-shadow-lg);
}

.waide-blog__card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: color-mix(in srgb, var(--waide-primary) 8%, var(--waide-bg));
}

.waide-blog__card-body {
  padding: 24px;
}

.waide-blog__card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.waide-blog__card-excerpt {
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.6;
}

.waide-blog__more {
  text-align: center;
  margin-top: 40px;
}

/* ===== CTA ===== */
.waide-cta {
  background: var(--waide-primary);
  color: #fff;
  text-align: center;
}

.waide-cta__title {
  font-size: 2rem;
  margin-bottom: 16px;
  color: #fff;
}

.waide-cta__subtitle {
  font-size: 1.1rem;
  opacity: 0.85;
  margin-bottom: 32px;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

/* ===== Contact ===== */
.waide-contact__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}

.waide-contact__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.waide-contact__input,
.waide-contact__textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--waide-text) 15%, transparent);
  border-radius: var(--waide-radius-sm);
  font-family: var(--waide-font-body);
  font-size: 0.95rem;
  background: var(--waide-bg);
  color: var(--waide-text);
  transition: var(--waide-transition);
}

.waide-contact__input:focus,
.waide-contact__textarea:focus {
  outline: none;
  border-color: var(--waide-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--waide-accent) 20%, transparent);
}

.waide-contact__textarea {
  min-height: 140px;
  resize: vertical;
}

.waide-contact__info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.waide-contact__info-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.waide-contact__info-icon {
  font-size: 1.4rem;
  color: var(--waide-accent);
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}

.waide-contact__info-text {
  font-size: 0.95rem;
  line-height: 1.6;
}

.waide-contact__map {
  width: 100%;
  height: 280px;
  border-radius: var(--waide-radius);
  border: none;
  margin-top: 24px;
}

/* ===== Footer ===== */
.waide-footer {
  background: var(--waide-primary);
  color: #fff;
  padding: 48px 0 24px;
}

.waide-footer__inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 32px;
  margin-bottom: 32px;
}

.waide-footer__brand {
  font-family: var(--waide-font-heading);
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.waide-footer__info {
  font-size: 0.85rem;
  opacity: 0.7;
  line-height: 1.8;
}

.waide-footer__copyright {
  font-size: 0.8rem;
  opacity: 0.5;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .waide-hero--split {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 120px 0 60px;
  }

  .waide-about__grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .waide-services__grid {
    grid-template-columns: 1fr;
  }

  .waide-services__panel--active {
    grid-template-columns: 1fr;
  }

  .waide-gallery__grid--three-col {
    grid-template-columns: 1fr 1fr;
  }

  .waide-gallery__grid--masonry {
    columns: 2;
  }

  .waide-blog__grid {
    grid-template-columns: 1fr;
  }

  .waide-contact__grid {
    grid-template-columns: 1fr;
  }

  .waide-nav__menu {
    display: none;
  }

  .waide-section {
    padding: 60px 0;
  }

  .waide-footer__inner {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .waide-gallery__grid--three-col {
    grid-template-columns: 1fr;
  }

  .waide-gallery__grid--masonry {
    columns: 1;
  }
}
`.trim();
}
