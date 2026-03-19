import type { ContactProps, DesignTokens } from "../../types";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderContact_FormCentered(props: ContactProps, _tokens: DesignTokens): string {
  return `
  <section class="waide-section" id="contact" style="background:color-mix(in srgb, var(--waide-primary) 5%, var(--waide-bg));">
    <div class="waide-container" style="max-width:640px;">
      <h2 class="waide-section-title" style="text-align:center;">${escHtml(props.title)}</h2>
      <p class="waide-section-subtitle" style="text-align:center;margin-left:auto;margin-right:auto;">
        ${props.phone ? `<a href="tel:${escHtml(props.phone)}" style="color:var(--waide-accent);font-weight:600;">${escHtml(props.phone)}</a> 또는 아래 양식으로 문의해주세요.` : "아래 양식으로 문의해주세요."}
      </p>
      <form class="waide-contact__form" onsubmit="event.preventDefault();alert('문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.');">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <input class="waide-contact__input" type="text" placeholder="이름" required>
          <input class="waide-contact__input" type="tel" placeholder="연락처" required>
        </div>
        <input class="waide-contact__input" type="email" placeholder="이메일">
        <textarea class="waide-contact__textarea" placeholder="문의 내용을 입력해주세요." required></textarea>
        <button class="waide-btn waide-btn--primary" type="submit" style="width:100%;">문의하기</button>
      </form>
      ${props.address ? `<p style="text-align:center;margin-top:24px;font-size:0.9rem;opacity:0.6;">${escHtml(props.address)}</p>` : ""}
    </div>
  </section>`;
}
