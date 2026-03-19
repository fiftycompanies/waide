import type { ServicesProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderServices_TabPanel(props: ServicesProps, _tokens: DesignTokens): string {
  const tabsHtml = props.services
    .map(
      (svc, i) =>
        `<button class="waide-services__tab${i === 0 ? " waide-services__tab--active" : ""}" data-tab="${i}" onclick="document.querySelectorAll('.waide-services__panel').forEach(p=>p.classList.remove('waide-services__panel--active'));document.querySelectorAll('.waide-services__tab').forEach(t=>t.classList.remove('waide-services__tab--active'));document.getElementById('svc-panel-${i}').classList.add('waide-services__panel--active');this.classList.add('waide-services__tab--active');">${escHtml(svc.name)}</button>`
    )
    .join("\n        ");

  const panelsHtml = props.services
    .map(
      (svc, i) => `
        <div id="svc-panel-${i}" class="waide-services__panel${i === 0 ? " waide-services__panel--active" : ""}">
          <div>
            <h3 style="font-size:1.4rem;margin-bottom:16px;">${escHtml(svc.name)}</h3>
            <p style="font-size:1rem;line-height:1.8;opacity:0.8;">${escHtml(svc.description)}</p>
          </div>
          ${svc.image ? `<img class="waide-services__panel-image" src="${svc.image}" alt="${escHtml(svc.name)}">` : `<div style="display:flex;align-items:center;justify-content:center;font-size:4rem;background:color-mix(in srgb, var(--waide-accent) 10%, var(--waide-bg));border-radius:var(--waide-radius);aspect-ratio:4/3;">${svc.icon}</div>`}
        </div>`
    )
    .join("");

  return `
  <section class="waide-services waide-section" id="services">
    <div class="waide-container">
      <h2 class="waide-section-title" style="text-align:center;">${escHtml(props.title)}</h2>
      <div class="waide-services__tabs" style="justify-content:center;">
        ${tabsHtml}
      </div>
      ${panelsHtml}
    </div>
  </section>`;
}
