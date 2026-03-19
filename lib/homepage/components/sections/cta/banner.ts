import type { CtaProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderCta_Banner(props: CtaProps, _tokens: DesignTokens): string {
  return `
  <section class="waide-cta waide-section" id="cta">
    <div class="waide-container">
      <h2 class="waide-cta__title">${escHtml(props.title)}</h2>
      <p class="waide-cta__subtitle">${escHtml(props.subtitle)}</p>
      <a class="waide-btn waide-btn--primary" href="${escHtml(props.ctaHref)}" style="background:var(--waide-accent);font-size:1.1rem;padding:16px 40px;">
        ${escHtml(props.ctaText)}
      </a>
    </div>
  </section>`;
}
