import type { AboutProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderAbout_StatsBar(props: AboutProps, _tokens: DesignTokens): string {
  const statsHtml = props.stats
    .map(
      (s) => `
        <div style="text-align:center;">
          <div class="waide-about__stat-number">${escHtml(s.number)}</div>
          <div class="waide-about__stat-label">${escHtml(s.label)}</div>
        </div>`
    )
    .join("");

  return `
  <section class="waide-about waide-section" id="about">
    <div class="waide-container" style="text-align:center;">
      <h2 class="waide-about__title">${escHtml(props.title)}</h2>
      <p class="waide-about__text" style="max-width:640px;margin:0 auto 40px;">${escHtml(props.description)}</p>
      <div class="waide-about__stats" style="justify-content:center;">
        ${statsHtml}
      </div>
    </div>
  </section>`;
}
