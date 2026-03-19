import type { GalleryProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderGallery_ThreeCol(props: GalleryProps, _tokens: DesignTokens): string {
  const itemsHtml = props.images
    .slice(0, 6)
    .map(
      (img) => `
        <div class="waide-gallery__item" style="aspect-ratio:1/1;">
          <img src="${img.src}" alt="${escHtml(img.alt)}" loading="lazy">
        </div>`
    )
    .join("");

  return `
  <section class="waide-section" id="gallery">
    <div class="waide-container">
      <h2 class="waide-section-title" style="text-align:center;">${escHtml(props.title)}</h2>
      <p class="waide-section-subtitle" style="text-align:center;margin-left:auto;margin-right:auto;">${escHtml(props.brandName)}의 공간과 시술 결과를 확인하세요.</p>
      <div class="waide-gallery__grid waide-gallery__grid--three-col">
        ${itemsHtml}
      </div>
    </div>
  </section>`;
}
