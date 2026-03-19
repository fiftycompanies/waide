import type { BlogProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 블로그 포스트 그리드
 *
 * 항상 포함 — Waide 블로그 연동 준비.
 * 현재는 플레이스홀더 카드 3개.
 * 향후 Supabase contents 테이블에서 client_id 기준 최신 3건 조회하여 채움.
 */
export function renderBlog_PostGrid(props: BlogProps, _tokens: DesignTokens): string {
  const hasPosts = props.posts.length > 0;

  const cardsHtml = hasPosts
    ? props.posts
        .slice(0, 3)
        .map(
          (post) => `
        <a class="waide-blog__card" href="${escHtml(post.url)}" target="_blank" rel="noopener">
          ${post.image ? `<img class="waide-blog__card-image" src="${post.image}" alt="${escHtml(post.title)}" loading="lazy">` : `<div class="waide-blog__card-image"></div>`}
          <div class="waide-blog__card-body">
            <h3 class="waide-blog__card-title">${escHtml(post.title)}</h3>
            <p class="waide-blog__card-excerpt">${escHtml(post.excerpt)}</p>
          </div>
        </a>`
        )
        .join("")
    : [
        { title: "전문가가 알려주는 관리 팁", excerpt: "올바른 관리법과 주의사항을 전문가가 직접 알려드립니다." },
        { title: "자주 묻는 질문 모음", excerpt: "고객분들이 가장 많이 궁금해하시는 내용을 정리했습니다." },
        { title: "시술 후기 및 경과", excerpt: "실제 고객분들의 솔직한 후기와 경과를 확인해보세요." },
      ]
        .map(
          (post) => `
        <div class="waide-blog__card">
          <div class="waide-blog__card-image"></div>
          <div class="waide-blog__card-body">
            <h3 class="waide-blog__card-title">${escHtml(post.title)}</h3>
            <p class="waide-blog__card-excerpt">${escHtml(post.excerpt)}</p>
          </div>
        </div>`
        )
        .join("");

  return `
  <section class="waide-section" id="blog">
    <div class="waide-container">
      <h2 class="waide-section-title" style="text-align:center;">${escHtml(props.title)}</h2>
      <p class="waide-section-subtitle" style="text-align:center;margin-left:auto;margin-right:auto;">
        ${escHtml(props.brandName)}의 최신 소식과 전문 콘텐츠
      </p>
      <div class="waide-blog__grid">
        ${cardsHtml}
      </div>
      <div class="waide-blog__more">
        <a class="waide-btn waide-btn--outline" href="/blog">블로그 더보기</a>
      </div>
    </div>
  </section>`;
}
