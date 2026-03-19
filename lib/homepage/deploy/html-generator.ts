/**
 * 홈페이지 프로젝트의 theme_config + seo_config로
 * 완성된 정적 HTML 페이지를 생성한다.
 *
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

/**
 * 테마 설정에서 완성된 HTML 페이지를 생성한다.
 */
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

  const heroTitle = escapeHtml(t.hero?.title || data.clientName);
  const heroSubtitle = escapeHtml(t.hero?.subtitle || "");
  const aboutTitle = escapeHtml(t.about?.title || `${data.clientName} 소개`);
  const aboutDesc = escapeHtml(t.about?.description || "");
  const services = t.services || [];
  const whyChooseUs = t.whyChooseUs || [];
  const ctaText = escapeHtml(t.ctaText || "무료 상담 신청하기");
  const nav = t.navigation || [
    { label: "홈", path: "/" },
    { label: "소개", path: "#about" },
    { label: "서비스", path: "#services" },
    { label: "문의", path: "#contact" },
  ];

  const seoTitle = escapeHtml(s.title || data.clientName);
  const seoDesc = escapeHtml(s.description || `${data.clientName} 공식 홈페이지`);

  const phone = data.phone ? escapeHtml(data.phone) : null;
  const address = data.address ? escapeHtml(data.address) : null;

  // 서비스 카드 HTML
  const servicesHtml = services
    .map(
      (svc, i) => `
        <div class="service-card" style="animation-delay: ${i * 0.1}s">
          <div class="service-icon">${getServiceIcon(i)}</div>
          <h3>${escapeHtml(svc.title)}</h3>
          <p>${escapeHtml(svc.description)}</p>
        </div>`
    )
    .join("");

  // 강점 카드 HTML
  const whyHtml = whyChooseUs
    .map(
      (w, i) => `
        <div class="why-card" style="animation-delay: ${i * 0.1}s">
          <div class="why-number">${String(i + 1).padStart(2, "0")}</div>
          <h3>${escapeHtml(w.title)}</h3>
          <p>${escapeHtml(w.description)}</p>
        </div>`
    )
    .join("");

  // 네비게이션 HTML
  const navHtml = nav
    .map((n) => `<a href="${escapeHtml(n.path)}" class="nav-link">${escapeHtml(n.label)}</a>`)
    .join("");

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
    .nav-cta:hover { background: var(--primary-dark); }

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
      font-weight: 700; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 14px ${primary}40;
    }
    .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 6px 20px ${primary}50; }

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
    .service-icon { font-size: 2.5rem; margin-bottom: 1rem; }
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

    /* ── CTA ── */
    .cta-section {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff; text-align: center; padding: 5rem 1.5rem; border-radius: 0;
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
    .contact-icon { font-size: 1.5rem; }

    /* ── FOOTER ── */
    .footer {
      text-align: center; padding: 2rem 1rem;
      border-top: 1px solid #e2e8f0; color: var(--secondary); font-size: 0.85rem;
    }

    /* ── MOBILE ── */
    .mobile-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; }
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
    }
  </style>
</head>
<body>
  <!-- NAV -->
  <nav class="navbar" id="navbar">
    <a href="/" class="nav-brand">${escapeHtml(data.clientName)}</a>
    <div class="nav-links">
      ${navHtml}
    </div>
    <a href="#contact" class="nav-cta">문의하기</a>
    <button class="mobile-toggle" onclick="document.getElementById('navbar').classList.toggle('open')">☰</button>
  </nav>

  <!-- HERO -->
  <section class="hero" id="home">
    <h1>${heroTitle}</h1>
    ${heroSubtitle ? `<p>${heroSubtitle}</p>` : ""}
    <a href="#contact" class="hero-cta">${ctaText}</a>
  </section>

  <!-- ABOUT -->
  ${aboutDesc ? `
  <section class="section" id="about">
    <h2 class="section-title">${aboutTitle}</h2>
    <div class="about-content">
      <p>${aboutDesc}</p>
    </div>
  </section>` : ""}

  <!-- SERVICES -->
  ${services.length > 0 ? `
  <div class="services-bg">
    <section class="section" id="services">
      <h2 class="section-title">서비스</h2>
      <div class="services-grid">
        ${servicesHtml}
      </div>
    </section>
  </div>` : ""}

  <!-- WHY CHOOSE US -->
  ${whyChooseUs.length > 0 ? `
  <section class="section" id="why">
    <h2 class="section-title">왜 ${escapeHtml(data.clientName)}인가요?</h2>
    <div class="why-grid">
      ${whyHtml}
    </div>
  </section>` : ""}

  <!-- CTA -->
  <section class="cta-section">
    <h2>${ctaText}</h2>
    <p>지금 바로 무료 상담을 신청하고 전문가의 도움을 받아보세요.</p>
    <a href="${phone ? `tel:${phone}` : "#contact"}" class="cta-btn">${phone ? `전화 상담: ${phone}` : ctaText}</a>
  </section>

  <!-- CONTACT -->
  <section class="section" id="contact">
    <h2 class="section-title">연락처</h2>
    <div class="contact-grid">
      ${phone ? `<div class="contact-item"><span class="contact-icon">📞</span><span>${phone}</span></div>` : ""}
      ${address ? `<div class="contact-item"><span class="contact-icon">📍</span><span>${address}</span></div>` : ""}
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(data.clientName)}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

/** 서비스 아이콘 (이모지 기반) */
function getServiceIcon(index: number): string {
  const icons = ["🏠", "🎨", "🛠️", "📐", "💡", "🪑", "🏗️", "✨"];
  return icons[index % icons.length];
}

/** HEX 색상 밝기 조절 */
function adjustBrightness(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(clean.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(clean.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(clean.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
