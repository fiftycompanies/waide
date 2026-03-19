import type { ServicesProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderServices_ListDetail(props: ServicesProps, _tokens: DesignTokens): string {
  const itemsHtml = props.services
    .map(
      (svc) => `
        <div class="waide-services__list-item">
          <div style="display:flex;gap:16px;align-items:center;">
            <span style="font-size:1.8rem;flex-shrink:0;">${svc.icon}</span>
            <div>
              <h3 class="waide-services__card-title" style="margin-bottom:4px;">${escHtml(svc.name)}</h3>
              <p class="waide-services__card-text">${escHtml(svc.description)}</p>
            </div>
          </div>
        </div>`
    )
    .join("");

  return `
  <section class="waide-services waide-section" id="services">
    <div class="waide-container">
      <h2 class="waide-section-title">${escHtml(props.title)}</h2>
      <p class="waide-section-subtitle">${escHtml(props.brandName)}의 전문 서비스를 소개합니다.</p>
      <div class="waide-services__list">
        ${itemsHtml}
      </div>
    </div>
  </section>`;
}
