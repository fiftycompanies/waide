import type { HeroProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderHero_Centered(props: HeroProps, _tokens: DesignTokens): string {
  return `
  <section class="waide-hero waide-hero--centered waide-section" id="hero" style="background:var(--waide-primary);color:#fff;min-height:80vh;">
    <div class="waide-container waide-hero__content">
      <h1 class="waide-hero__title">${escHtml(props.tagline)}</h1>
      <p class="waide-hero__subtitle">${escHtml(props.subtitle)}</p>
      <div style="display:flex;gap:16px;justify-content:center;">
        <a class="waide-btn waide-btn--primary" href="${escHtml(props.ctaHref)}" style="background:#fff;color:var(--waide-primary);">
          ${escHtml(props.ctaText)}
        </a>
        ${props.brandName ? `<a class="waide-btn waide-btn--outline" href="#about" style="border-color:rgba(255,255,255,0.4);color:#fff;">더 알아보기</a>` : ""}
      </div>
    </div>
  </section>`;
}
