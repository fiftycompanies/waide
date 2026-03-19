import type { FooterProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderFooter_Default(props: FooterProps, _tokens: DesignTokens): string {
  return `
  <footer class="waide-footer">
    <div class="waide-container">
      <div class="waide-footer__inner">
        <div>
          <div class="waide-footer__brand">${escHtml(props.brandName)}</div>
          <div class="waide-footer__info">
            ${props.address ? `<div>${escHtml(props.address)}</div>` : ""}
            ${props.phone ? `<div>TEL. <a href="tel:${escHtml(props.phone)}" style="color:var(--waide-accent);">${escHtml(props.phone)}</a></div>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:24px;align-items:center;">
          <a href="#hero" style="font-size:0.9rem;opacity:0.7;">맨 위로</a>
        </div>
      </div>
      <div class="waide-footer__copyright">${escHtml(props.copyright)}</div>
    </div>
  </footer>`;
}
