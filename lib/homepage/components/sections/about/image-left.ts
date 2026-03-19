import type { AboutProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderAbout_ImageLeft(props: AboutProps, _tokens: DesignTokens): string {
  const imgSrc = props.image || "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop";
  const highlightsHtml = props.highlights
    .map((h) => `<li>${escHtml(h)}</li>`)
    .join("\n            ");

  return `
  <section class="waide-about waide-section" id="about">
    <div class="waide-container">
      <div class="waide-about__grid">
        <div>
          <img class="waide-about__image" src="${imgSrc}" alt="${escHtml(props.brandName)} 소개">
        </div>
        <div>
          <h2 class="waide-about__title">${escHtml(props.title)}</h2>
          <p class="waide-about__text">${escHtml(props.description)}</p>
          <ul class="waide-about__highlights">
            ${highlightsHtml}
          </ul>
        </div>
      </div>
    </div>
  </section>`;
}
