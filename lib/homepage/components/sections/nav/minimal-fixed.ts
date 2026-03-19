import type { NavProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderNav_MinimalFixed(props: NavProps, _tokens: DesignTokens): string {
  const menuHtml = props.menuItems
    .map((item) => `<li><a class="waide-nav__link" href="#${escHtml(item)}">${escHtml(item)}</a></li>`)
    .join("\n          ");

  return `
  <nav class="waide-nav" style="background: var(--waide-primary); color: #fff;">
    <div class="waide-nav__inner">
      <a class="waide-nav__logo" href="#" style="color: #fff;">${escHtml(props.brandName)}</a>
      <ul class="waide-nav__menu" style="color: rgba(255,255,255,0.85);">
        ${menuHtml}
      </ul>
      ${props.phone ? `<a class="waide-btn waide-btn--outline waide-nav__cta" style="color:#fff;border-color:rgba(255,255,255,0.4);" href="tel:${escHtml(props.phone)}">${escHtml(props.phone)}</a>` : ""}
    </div>
  </nav>`;
}
