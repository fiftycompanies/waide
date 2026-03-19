import type { GalleryProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderGallery_Masonry(props: GalleryProps, _tokens: DesignTokens): string {
  const itemsHtml = props.images
    .slice(0, 9)
    .map(
      (img) => `
        <div class="waide-gallery__item">
          <img src="${img.src}" alt="${escHtml(img.alt)}" loading="lazy">
        </div>`
    )
    .join("");

  return `
  <section class="waide-section" id="gallery">
    <div class="waide-container">
      <h2 class="waide-section-title" style="text-align:center;">${escHtml(props.title)}</h2>
      <div class="waide-gallery__grid waide-gallery__grid--masonry">
        ${itemsHtml}
      </div>
    </div>
  </section>`;
}
