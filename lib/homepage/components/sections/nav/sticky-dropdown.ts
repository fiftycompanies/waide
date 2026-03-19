import type { NavProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderNav_StickyDropdown(props: NavProps, tokens: DesignTokens): string {
  const menuHtml = props.menuItems
    .map((item) => `<li><a class="waide-nav__link" href="#${escHtml(item)}">${escHtml(item)}</a></li>`)
    .join("\n          ");

  const ctaHtml = props.phone
    ? `<a class="waide-btn waide-btn--primary waide-nav__cta" href="tel:${escHtml(props.phone)}">${escHtml(props.phone)}</a>`
    : `<a class="waide-btn waide-btn--primary waide-nav__cta" href="#contact">문의하기</a>`;

  return `
  <nav class="waide-nav" style="background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); box-shadow: var(--waide-shadow);">
    <div class="waide-nav__inner">
      <a class="waide-nav__logo" href="#" style="color: var(--waide-primary);">${escHtml(props.brandName)}</a>
      <ul class="waide-nav__menu">
        ${menuHtml}
      </ul>
      ${ctaHtml}
    </div>
  </nav>`;
}
