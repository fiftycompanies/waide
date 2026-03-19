import type { HeroProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderHero_Fullscreen(props: HeroProps, _tokens: DesignTokens): string {
  const bgStyle = props.backgroundImage
    ? `background-image: url('${props.backgroundImage}');`
    : `background: var(--waide-primary);`;

  return `
  <section class="waide-hero waide-hero--fullscreen waide-section" id="hero" style="${bgStyle}">
    <div class="waide-hero__overlay"></div>
    <div class="waide-container waide-hero__content" style="text-align: center; margin: 0 auto;">
      <h1 class="waide-hero__title">${escHtml(props.tagline)}</h1>
      <p class="waide-hero__subtitle" style="margin-left:auto;margin-right:auto;">${escHtml(props.subtitle)}</p>
      <a class="waide-btn waide-btn--primary" href="${escHtml(props.ctaHref)}" style="font-size:1.1rem;padding:16px 40px;">
        ${escHtml(props.ctaText)}
      </a>
    </div>
  </section>`;
}
