import type { ServicesProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderServices_CardGrid(props: ServicesProps, _tokens: DesignTokens): string {
  const cardsHtml = props.services
    .map(
      (svc) => `
        <div class="waide-services__card">
          ${svc.image ? `<img class="waide-services__card-image" src="${svc.image}" alt="${escHtml(svc.name)}">` : `<div class="waide-services__icon">${svc.icon}</div>`}
          <h3 class="waide-services__card-title">${escHtml(svc.name)}</h3>
          <p class="waide-services__card-text">${escHtml(svc.description)}</p>
        </div>`
    )
    .join("");

  return `
  <section class="waide-services waide-section" id="services">
    <div class="waide-container">
      <h2 class="waide-section-title" style="text-align:center;">${escHtml(props.title)}</h2>
      <p class="waide-section-subtitle" style="text-align:center;margin-left:auto;margin-right:auto;">
        ${escHtml(props.brandName)}에서 제공하는 전문 서비스
      </p>
      <div class="waide-services__grid">
        ${cardsHtml}
      </div>
    </div>
  </section>`;
}
