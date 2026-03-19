/**
 * 홈페이지 프로젝트의 theme_config + seo_config로
 * 완성된 정적 HTML 페이지를 생성한다.
 *
 * sectionOrder 기반 동적 렌더링 + designStyle CSS 분기.
 * Vercel 파일 업로드 배포에 사용.
 */

interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string | null;
  backgroundColor?: string;
  textColor?: string;
  headingFont?: string | null;
  bodyFont?: string | null;
  designStyle?: string;
  navigation?: Array<{ label: string; path: string }>;
  hero?: { title?: string; subtitle?: string };
  about?: { title?: string; description?: string };
  services?: Array<{ title: string; description: string }>;
  whyChooseUs?: Array<{ title: string; description: string }>;
  ctaText?: string;
  referenceUrls?: string[];
  sectionOrder?: string[];
  heroImageCandidates?: string[];
  portfolioImages?: string[];
  testimonials?: Array<{ text: string; author: string }>;
  faqItems?: Array<{ question: string; answer: string }>;
  stats?: Array<{ number: string; label: string }>;
}

interface SeoConfig {
  title?: string;
  description?: string;
}

interface HomepageData {
  projectName: string;
  clientName: string;
  phone?: string;
  address?: string;
  themeConfig: ThemeConfig;
  seoConfig: SeoConfig;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── 섹션 렌더러 ──────────────────────────────────────────────────────────────

function renderHero(data: HomepageData): string {
  const t = data.themeConfig;
  const heroTitle = escapeHtml(t.hero?.title || data.clientName);
  const heroSubtitle = escapeHtml(t.hero?.subtitle || "");
  const ctaText = escapeHtml(t.ctaText || "무료 상담 신청하기");
  const heroImage = t.heroImageCandidates?.[0];
  const phone = data.phone ? escapeHtml(data.phone) : null;

  const bgStyle = heroImage
    ? `background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${escapeHtml(heroImage)}') center/cover no-repeat;`
    : "";
  const textColor = heroImage ? "color: #fff;" : "";
  const subtitleColor = heroImage ? "color: rgba(255,255,255,0.85);" : "";

  return `
  <section class="hero" id="home"${bgStyle ? ` style="${bgStyle} ${textColor}"` : ""}>
    <h1${heroImage ? ' style="color:#fff"' : ""}>${heroTitle}</h1>
    ${heroSubtitle ? `<p${heroImage ? ` style="${subtitleColor}"` : ""}>${heroSubtitle}</p>` : ""}
    <a href="${phone ? `tel:${phone}` : "#contact"}" class="hero-cta">${ctaText}</a>
  </section>`;
}

function renderAbout(data: HomepageData): string {
  const t = data.themeConfig;
  const aboutTitle = escapeHtml(t.about?.title || `${data.clientName} 소개`);
  const aboutDesc = escapeHtml(t.about?.description || "");
  if (!aboutDesc) return "";

  return `
  <section class="section" id="about">
    <h2 class="section-title">${aboutTitle}</h2>
    <div class="about-content">
      <p>${aboutDesc}</p>
    </div>
  </section>`;
}

function renderServices(data: HomepageData): string {
  const services = data.themeConfig.services || [];
  if (services.length === 0) return "";
  const primary = data.themeConfig.primaryColor || "#2563eb";

  const cardsHtml = services
    .map(
      (svc, i) => `
        <div class="service-card" style="animation-delay: ${i * 0.1}s">
          <div class="service-icon">${getServiceIcon(i, primary)}</div>
          <h3>${escapeHtml(svc.title)}</h3>
          <p>${escapeHtml(svc.description)}</p>
        </div>`
    )
    .join("");

  return `
  <div class="services-bg">
    <section class="section" id="services">
      <h2 class="section-title">서비스</h2>
      <div class="services-grid">${cardsHtml}</div>
    </section>
  </div>`;
}

function renderPortfolio(data: HomepageData): string {
  const images = data.themeConfig.portfolioImages || [];
  if (images.length === 0) return "";
  const title = escapeHtml(data.themeConfig.about?.title ? "포트폴리오" : "시공 사례");

  const itemsHtml = images
    .slice(0, 6)
    .map(
      (img) => `
        <div class="portfolio-item">
          <img src="${escapeHtml(img)}" alt="포트폴리오" loading="lazy">
        </div>`
    )
    .join("");

  return `
  <section class="section" id="portfolio">
    <h2 class="section-title">${title}</h2>
    <div class="portfolio-grid">${itemsHtml}</div>
  </section>`;
}

function renderTestimonials(data: HomepageData): string {
  const testimonials = data.themeConfig.testimonials || [];
  if (testimonials.length === 0) return "";

  const cardsHtml = testimonials
    .map(
      (t) => `
        <div class="testimonial-card">
          <p class="testimonial-text">"${escapeHtml(t.text)}"</p>
          <p class="testimonial-author">— ${escapeHtml(t.author)}</p>
        </div>`
    )
    .join("");

  return `
  <section class="section" id="testimonials">
    <h2 class="section-title">고객 후기</h2>
    <div class="testimonials-grid">${cardsHtml}</div>
  </section>`;
}

function renderCta(data: HomepageData): string {
  const ctaText = escapeHtml(data.themeConfig.ctaText || "무료 상담 신청하기");
  const phone = data.phone ? escapeHtml(data.phone) : null;

  return `
  <section class="cta-section">
    <h2>${ctaText}</h2>
    <p>지금 바로 무료 상담을 신청하고 전문가의 도움을 받아보세요.</p>
    <a href="${phone ? `tel:${phone}` : "#contact"}" class="cta-btn">${phone ? `전화 상담: ${phone}` : ctaText}</a>
  </section>`;
}

function renderContact(data: HomepageData): string {
  const phone = data.phone ? escapeHtml(data.phone) : null;
  const address = data.address ? escapeHtml(data.address) : null;

  return `
  <section class="section" id="contact">
    <h2 class="section-title">연락처</h2>
    <div class="contact-grid">
      ${phone ? `<div class="contact-item"><span class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></span><span>${phone}</span></div>` : ""}
      ${address ? `<div class="contact-item"><span class="contact-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></span><span>${address}</span></div>` : ""}
    </div>
  </section>`;
}

function renderFaq(data: HomepageData): string {
  const faqItems = data.themeConfig.faqItems || [];
  if (faqItems.length === 0) return "";

  const itemsHtml = faqItems
    .map(
      (f) => `
        <details class="faq-item">
          <summary>${escapeHtml(f.question)}</summary>
          <p>${escapeHtml(f.answer)}</p>
        </details>`
    )
    .join("");

  return `
  <section class="section" id="faq">
    <h2 class="section-title">자주 묻는 질문</h2>
    <div class="faq-list">${itemsHtml}</div>
  </section>`;
}

function renderStats(data: HomepageData): string {
  const stats = data.themeConfig.stats || [];
  if (stats.length === 0) return "";

  const itemsHtml = stats
    .map(
      (s) => `
        <div class="stat-item">
          <span class="stat-number">${escapeHtml(s.number)}</span>
          <span class="stat-label">${escapeHtml(s.label)}</span>
        </div>`
    )
    .join("");

  return `
  <section class="stats-section">
    <div class="stats-grid">${itemsHtml}</div>
  </section>`;
}

function renderMap(data: HomepageData): string {
  const address = data.address ? escapeHtml(data.address) : null;
  if (!address) return "";

  const encodedAddr = encodeURIComponent(data.address || "");

  return `
  <section class="section" id="map">
    <h2 class="section-title">오시는 길</h2>
    <div class="map-content">
      <p class="map-address"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${address}</p>
      <a href="https://map.naver.com/search/${encodedAddr}" target="_blank" rel="noopener noreferrer" class="map-link">네이버 지도에서 보기 &rarr;</a>
    </div>
  </section>`;
}

function renderFooter(data: HomepageData): string {
  return `
  <footer class="footer">
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(data.clientName)}. All rights reserved.</p>
  </footer>`;
}

// ── 섹션 렌더러 맵 ───────────────────────────────────────────────────────────

const SECTION_RENDERERS: Record<string, (data: HomepageData) => string> = {
  hero: renderHero,
  about: renderAbout,
  services: renderServices,
  portfolio: renderPortfolio,
  testimonials: renderTestimonials,
  cta: renderCta,
  contact: renderContact,
  faq: renderFaq,
  stats: renderStats,
  map: renderMap,
  footer: renderFooter,
};

// ── designStyle CSS 분기 ─────────────────────────────────────────────────────

function getDesignStyleCSS(style: string, primary: string, accent: string): string {
  switch (style) {
    case "bold":
      return `
        body { background: #0f172a; color: #f8fafc; }
        .navbar { background: rgba(15,23,42,0.98); }
        .nav-link { color: #cbd5e1; }
        .service-card { background: rgba(255,255,255,0.05); border: 1px solid ${primary}40; color: #f8fafc; }
        .service-card p { color: #94a3b8; }
        .services-bg { background: #1e293b; }
        .why-card { border-color: ${primary}30; color: #f8fafc; }
        .why-card p { color: #94a3b8; }
        .footer { border-color: #334155; color: #94a3b8; }
        .about-content { color: #cbd5e1; }
        .contact-item { color: #94a3b8; }
        .faq-item { border-color: #334155; color: #cbd5e1; }
        .faq-item summary { color: #f8fafc; }
        .testimonial-card { background: rgba(255,255,255,0.05); border-color: ${primary}30; }
        .testimonial-text { color: #cbd5e1; }
      `;
    case "minimal":
      return `
        .section { padding: 7rem clamp(1rem, 5vw, 4rem); }
        .service-card { box-shadow: none; border: 1px solid #e5e7eb; border-radius: 8px; }
        .hero { min-height: 80vh; }
        .section-title::after { height: 2px; width: 40px; }
        .why-card { border-radius: 8px; }
      `;
    case "luxury":
      return `
        h1,h2,h3,h4 { font-family: 'Georgia','Playfair Display',serif; letter-spacing: 0.03em; }
        .nav-brand { font-family: 'Georgia',serif; letter-spacing: 0.08em; }
        .section-title::after { background: ${accent}; height: 2px; width: 40px; }
        .service-card { border: 1px solid ${accent}40; }
        .why-number { color: ${accent}; }
      `;
    case "natural":
      return `
        .service-card { border-radius: 20px; }
        .why-card { border-radius: 20px; }
        .nav-cta { border-radius: 20px; }
        .hero-cta { border-radius: 20px; }
        .cta-btn { border-radius: 20px; }
        .testimonial-card { border-radius: 20px; }
        .faq-item { border-radius: 16px; }
      `;
    case "warm":
      return `
        .service-card { box-shadow: 0 4px 16px ${primary}15; }
        .service-card:hover { box-shadow: 0 8px 28px ${primary}25; transform: translateY(-6px); }
        .hero { background: linear-gradient(135deg, ${primary}10, var(--bg) 50%); }
      `;
    default: // "modern"
      return "";
  }
}

// ── 메인 생성 함수 ───────────────────────────────────────────────────────────

export function generateHomepageHtml(data: HomepageData): string {
  const t = data.themeConfig;
  const s = data.seoConfig;

  const primary = t.primaryColor || "#2563eb";
  const secondary = t.secondaryColor || "#64748b";
  const accent = t.accentColor || primary;
  const bg = t.backgroundColor || "#ffffff";
  const text = t.textColor || "#111827";
  const headingFont = t.headingFont || "'Noto Sans KR', sans-serif";
  const bodyFont = t.bodyFont || "'Noto Sans KR', sans-serif";
  const designStyle = t.designStyle || "modern";

  const seoTitle = escapeHtml(s.title || data.clientName);
  const seoDesc = escapeHtml(s.description || `${data.clientName} 공식 홈페이지`);

  const nav = t.navigation || [
    { label: "홈", path: "/" },
    { label: "소개", path: "#about" },
    { label: "서비스", path: "#services" },
    { label: "문의", path: "#contact" },
  ];

  const navHtml = nav
    .map((n) => `<a href="${escapeHtml(n.path)}" class="nav-link">${escapeHtml(n.label)}</a>`)
    .join("");

  // sectionOrder 기반 동적 렌더링
  const sectionOrder = t.sectionOrder || ["hero", "about", "services", "cta", "contact"];
  const sectionsHtml = sectionOrder
    .filter((type) => type !== "footer" && SECTION_RENDERERS[type])
    .map((type) => SECTION_RENDERERS[type](data))
    .join("\n");

  const designStyleCSS = getDesignStyleCSS(designStyle, primary, accent);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoTitle}</title>
  <meta name="description" content="${seoDesc}">
  <meta property="og:title" content="${seoTitle}">
  <meta property="og:description" content="${seoDesc}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --accent: ${accent};
      --bg: ${bg};
      --text: ${text};
      --primary-light: ${primary}15;
      --primary-dark: ${adjustBrightness(primary, -30)};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: ${bodyFont};
      color: var(--text);
      background: var(--bg);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4 { font-family: ${headingFont}; font-weight: 700; line-height: 1.3; }

    /* ── NAV ── */
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 clamp(1rem, 5vw, 4rem); height: 64px;
    }
    .nav-brand { font-weight: 900; font-size: 1.25rem; color: var(--primary); text-decoration: none; }
    .nav-links { display: flex; gap: 1.5rem; }
    .nav-link {
      text-decoration: none; color: var(--text); font-size: 0.9rem; font-weight: 500;
      transition: color 0.2s;
    }
    .nav-link:hover { color: var(--primary); }
    .nav-cta {
      background: var(--primary); color: #fff; padding: 0.5rem 1.2rem;
      border-radius: 8px; text-decoration: none; font-size: 0.9rem; font-weight: 600;
      transition: background 0.2s;
    }
    .nav-cta:hover { background: var(--accent); }

    /* ── HERO ── */
    .hero {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center;
      padding: 6rem 1.5rem 4rem;
      background: linear-gradient(135deg, var(--primary-light), var(--bg) 60%);
    }
    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900;
      margin-bottom: 1rem; max-width: 800px;
    }
    .hero p {
      font-size: clamp(1rem, 2vw, 1.25rem); color: var(--secondary);
      max-width: 600px; margin-bottom: 2rem;
    }
    .hero-cta {
      display: inline-block; background: var(--primary); color: #fff;
      padding: 1rem 2.5rem; border-radius: 12px; font-size: 1.1rem;
      font-weight: 700; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
      box-shadow: 0 4px 14px ${primary}40;
    }
    .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 6px 20px ${primary}50; background: var(--accent); }

    /* ── SECTION COMMON ── */
    .section { padding: 5rem clamp(1rem, 5vw, 4rem); max-width: 1200px; margin: 0 auto; }
    .section-title {
      text-align: center; font-size: clamp(1.5rem, 3vw, 2.25rem);
      margin-bottom: 3rem; position: relative;
    }
    .section-title::after {
      content: ''; display: block; width: 60px; height: 4px; border-radius: 2px;
      background: var(--primary); margin: 0.75rem auto 0;
    }

    /* ── ABOUT ── */
    .about-content {
      max-width: 800px; margin: 0 auto; text-align: center;
      font-size: 1.05rem; color: var(--secondary); line-height: 2;
    }

    /* ── SERVICES ── */
    .services-bg { background: #f8fafc; }
    .services-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }
    .service-card {
      background: #fff; border-radius: 16px; padding: 2rem; text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .service-icon { margin-bottom: 1rem; }
    .service-card h3 { font-size: 1.15rem; margin-bottom: 0.5rem; }
    .service-card p { color: var(--secondary); font-size: 0.95rem; }

    /* ── WHY ── */
    .why-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .why-card {
      border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem;
      transition: border-color 0.2s;
    }
    .why-card:hover { border-color: var(--primary); }
    .why-number {
      font-size: 2rem; font-weight: 900; color: var(--primary); opacity: 0.3;
      margin-bottom: 0.5rem;
    }
    .why-card h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
    .why-card p { color: var(--secondary); font-size: 0.95rem; }

    /* ── PORTFOLIO ── */
    .portfolio-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .portfolio-item { border-radius: 12px; overflow: hidden; aspect-ratio: 4/3; }
    .portfolio-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
    .portfolio-item:hover img { transform: scale(1.05); }

    /* ── TESTIMONIALS ── */
    .testimonials-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .testimonial-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 2rem; position: relative;
    }
    .testimonial-text { font-size: 1rem; line-height: 1.8; color: var(--secondary); margin-bottom: 1rem; font-style: italic; }
    .testimonial-author { font-weight: 600; font-size: 0.9rem; color: var(--text); }

    /* ── FAQ ── */
    .faq-list { max-width: 800px; margin: 0 auto; }
    .faq-item {
      border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 0.75rem;
      overflow: hidden; transition: border-color 0.2s;
    }
    .faq-item[open] { border-color: var(--primary); }
    .faq-item summary {
      padding: 1.25rem 1.5rem; font-weight: 600; cursor: pointer;
      list-style: none; display: flex; align-items: center; justify-content: space-between;
    }
    .faq-item summary::after { content: '+'; font-size: 1.25rem; color: var(--primary); }
    .faq-item[open] summary::after { content: '-'; }
    .faq-item p { padding: 0 1.5rem 1.25rem; color: var(--secondary); line-height: 1.8; }

    /* ── STATS ── */
    .stats-section {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      padding: 4rem 1.5rem; color: #fff;
    }
    .stats-grid {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 3rem;
      max-width: 1000px; margin: 0 auto;
    }
    .stat-item { text-align: center; }
    .stat-number { display: block; font-size: 2.5rem; font-weight: 900; color: var(--accent); }
    .stat-label { font-size: 0.95rem; opacity: 0.9; margin-top: 0.25rem; }

    /* ── MAP ── */
    .map-content { text-align: center; }
    .map-address { font-size: 1.1rem; margin-bottom: 1rem; color: var(--text); }
    .map-link {
      display: inline-block; color: var(--primary); text-decoration: none;
      font-weight: 600; transition: opacity 0.2s;
    }
    .map-link:hover { opacity: 0.7; }

    /* ── CTA ── */
    .cta-section {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff; text-align: center; padding: 5rem 1.5rem;
    }
    .cta-section h2 { color: #fff; font-size: clamp(1.5rem, 3vw, 2rem); margin-bottom: 1rem; }
    .cta-section p { opacity: 0.9; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
    .cta-btn {
      display: inline-block; background: #fff; color: var(--primary);
      padding: 1rem 2.5rem; border-radius: 12px; font-weight: 700;
      font-size: 1.1rem; text-decoration: none; transition: transform 0.2s;
    }
    .cta-btn:hover { transform: translateY(-2px); }

    /* ── CONTACT ── */
    .contact-grid {
      display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center;
    }
    .contact-item {
      display: flex; align-items: center; gap: 0.75rem;
      font-size: 1rem; color: var(--secondary);
    }
    .contact-icon { display: flex; align-items: center; color: var(--primary); }

    /* ── FOOTER ── */
    .footer {
      text-align: center; padding: 2rem 1rem;
      border-top: 1px solid #e2e8f0; color: var(--secondary); font-size: 0.85rem;
    }

    /* ── MOBILE ── */
    .mobile-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text); }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-cta { display: none; }
      .mobile-toggle { display: block; }
      .navbar.open .nav-links {
        display: flex; flex-direction: column; position: absolute;
        top: 64px; left: 0; right: 0; background: #fff;
        padding: 1rem 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .navbar.open .nav-cta {
        display: block; text-align: center; margin-top: 0.5rem;
      }
      .stats-grid { gap: 2rem; }
      .stat-number { font-size: 2rem; }
    }

    /* ── DESIGN STYLE OVERRIDE ── */
    ${designStyleCSS}
  </style>
</head>
<body>
  <!-- NAV -->
  <nav class="navbar" id="navbar">
    <a href="/" class="nav-brand">${escapeHtml(data.clientName)}</a>
    <div class="nav-links">${navHtml}</div>
    <a href="#contact" class="nav-cta">문의하기</a>
    <button class="mobile-toggle" onclick="document.getElementById('navbar').classList.toggle('open')">&#9776;</button>
  </nav>

  ${sectionsHtml}

  <!-- FOOTER -->
  ${renderFooter(data)}
</body>
</html>`;
}

/** CSS 원형 아이콘 (이모지 대신) */
function getServiceIcon(index: number, primary: string): string {
  return `<div style="width:48px;height:48px;border-radius:50%;background:${primary}15;display:flex;align-items:center;justify-content:center;margin:0 auto"><span style="font-size:1.2rem;font-weight:700;color:${primary}">${index + 1}</span></div>`;
}

/** HEX 색상 밝기 조절 */
function adjustBrightness(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, parseInt(clean.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(clean.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(clean.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
