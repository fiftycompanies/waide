import type { ContactProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderContact_FormSplit(props: ContactProps, _tokens: DesignTokens): string {
  return `
  <section class="waide-section" id="contact">
    <div class="waide-container">
      <h2 class="waide-section-title">${escHtml(props.title)}</h2>
      <div class="waide-contact__grid">
        <form class="waide-contact__form" onsubmit="event.preventDefault();alert('문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.');">
          <input class="waide-contact__input" type="text" placeholder="이름" required>
          <input class="waide-contact__input" type="tel" placeholder="연락처" required>
          <input class="waide-contact__input" type="email" placeholder="이메일">
          <textarea class="waide-contact__textarea" placeholder="문의 내용을 입력해주세요." required></textarea>
          <button class="waide-btn waide-btn--primary" type="submit" style="width:100%;">문의하기</button>
        </form>
        <div class="waide-contact__info">
          ${props.phone ? `
          <div class="waide-contact__info-item">
            <span class="waide-contact__info-icon">&#9742;</span>
            <div>
              <div style="font-weight:600;margin-bottom:4px;">전화</div>
              <a class="waide-contact__info-text" href="tel:${escHtml(props.phone)}">${escHtml(props.phone)}</a>
            </div>
          </div>` : ""}
          ${props.address ? `
          <div class="waide-contact__info-item">
            <span class="waide-contact__info-icon">&#9906;</span>
            <div>
              <div style="font-weight:600;margin-bottom:4px;">주소</div>
              <div class="waide-contact__info-text">${escHtml(props.address)}</div>
            </div>
          </div>` : ""}
          ${props.mapEmbedUrl ? `<iframe class="waide-contact__map" src="${escHtml(props.mapEmbedUrl)}" loading="lazy" title="지도"></iframe>` : ""}
        </div>
      </div>
    </div>
  </section>`;
}
