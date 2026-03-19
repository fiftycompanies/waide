import type { HeroProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderHero_SplitLeft(props: HeroProps, _tokens: DesignTokens): string {
  const imgSrc = props.backgroundImage || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=900&fit=crop";

  return `
  <section class="waide-hero waide-hero--split waide-section" id="hero">
    <div class="waide-container" style="display:flex;align-items:center;padding:0 24px;">
      <div class="waide-hero__content" style="flex:1;padding-right:48px;">
        <h1 class="waide-hero__title" style="color:var(--waide-text);">${escHtml(props.tagline)}</h1>
        <p class="waide-hero__subtitle" style="color:var(--waide-text);opacity:0.7;">${escHtml(props.subtitle)}</p>
        <a class="waide-btn waide-btn--primary" href="${escHtml(props.ctaHref)}">${escHtml(props.ctaText)}</a>
      </div>
    </div>
    <div style="flex:1;min-height:100vh;">
      <img class="waide-hero__image" src="${imgSrc}" alt="${escHtml(props.brandName)}" style="width:100%;height:100%;object-fit:cover;">
    </div>
  </section>`;
}
