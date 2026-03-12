"""
review_prompt.py
리뷰형(후기) 콘텐츠 프롬프트.

콘텐츠 특징:
  - 시간순 경험 서술 (방문 전 → 방문 중 → 방문 후)
  - 1인칭 체험 톤 (#내돈내산, #솔직후기)
  - 장점/단점 솔직 서술
  - 별점/총평 섹션
  - 해요체 + 이모지 + 실감나는 묘사
"""

from copywriter.prompts.common_rules import get_common_rules


def build_review_system_prompt(
    brand: dict | None = None,
    style_guide: dict | None = None,
    evolving_knowledge: str = "",
    db_prompt: str | None = None,
) -> str:
    """리뷰형(후기) 시스템 프롬프트."""

    if db_prompt:
        result = db_prompt
    else:
        result = (
            "당신은 박작가(콘텐츠팀)입니다. 한국 네이버 블로그 SEO 전문 작가예요.\n"
            "리뷰형(후기) 콘텐츠를 작성합니다.\n\n"

            + get_common_rules() + "\n\n"

            "### ✍️ 리뷰형(후기) 전용 규칙\n\n"

            "**시간순 경험 서술 구조 (필수):**\n"
            "1. 도입부: 방문/구매 계기 + 기대했던 점 (해요체, 2~3문장)\n"
            "   예: \"오래전부터 가보고 싶었던 곳인데, 드디어 다녀왔어요!\"\n"
            "2. 첫인상 / 도착 경험: 외관, 주차, 접근성 등\n"
            "3. 핵심 체험 (시간순): 실제 이용 과정을 시간 흐름대로 서술\n"
            "   - 각 체험 포인트를 H3 소제목으로 분리\n"
            "   - 감각적 묘사 포함 (보이는 것, 냄새, 소리, 느낌)\n"
            "   - 구체적 수치 포함 (가격, 크기, 시간, 거리)\n"
            "4. 장점 & 아쉬운 점: 솔직한 평가\n"
            "   ⭐ 좋았던 점\n"
            "   - 각 항목 이모지 + 해요체\n"
            "   😅 아쉬운 점\n"
            "   - 건설적으로 서술 (비난 X, 개선 포인트)\n"
            "5. 총평 & 별점: 종합 평가\n"
            "   - 5점 만점 별점 (⭐⭐⭐⭐⭐ 형식)\n"
            "   - 누구에게 추천하는지 명시\n"
            "   - 재방문/재구매 의사\n"
            "6. 실용 정보: 위치, 영업시간, 가격, 예약 방법 등\n"
            "7. FAQ (5개 이상)\n\n"

            "**리뷰 톤 & 스타일:**\n"
            "- 솔직하되 긍정적 기조 유지 (비방/악의적 표현 금지)\n"
            "- 감각적 묘사 적극 활용: \"걸어가는 순간 소나무 향이 확 퍼지더라고요\"\n"
            "- 가격 민감도 표현: \"이 정도면 가성비 괜찮다고 생각했어요\"\n"
            "- 비교 대상 언급 자연스럽게: \"지난번 갔던 OO보다 시설이 훨씬 좋았어요\"\n"
            "- 팁/꿀팁 자연스럽게 배치: \"참고로 주말보다 평일에 가면 훨씬 한적해요 💡\"\n\n"

            "### SEO 최적화 규칙\n"
            "- 키워드 밀도: 메인 키워드 1.5~2.5%\n"
            "- H2 태그: 최소 4개 이상 (이모지 포함)\n"
            "- 이미지 가이드: 최소 8개 이상 (리뷰는 사진 많을수록 좋음)\n"
            "- 글자 수: 최소 2,500자 이상\n"
        )

    result += _inject_brand_style(brand, style_guide)

    if evolving_knowledge:
        result += evolving_knowledge

    return result


def build_review_user_prompt(
    keyword: str,
    title: str,
    sub_keyword: str | None = None,
    content_angle: str | None = None,
    target_length: int = 2500,
    brand_name: str | None = None,
    eeat_summary: str | None = None,
    press_refs: str | None = None,
    key_signals: dict | None = None,
    structure: dict | None = None,
    source_context: str | None = None,
    style_transfer_targets: dict | None = None,
    db_prompt: str | None = None,
) -> str:
    """리뷰형(후기) 유저 프롬프트."""
    import json

    if db_prompt:
        return db_prompt.format(
            keyword=keyword, title=title,
            sub_keyword=sub_keyword or "없음",
            content_angle=content_angle or "체험/방문 후기",
            target_length=target_length,
            brand_name=brand_name or "미지정",
        )

    brand_block = ""
    if brand_name:
        brand_block = f"\n**브랜드**: {brand_name}\n**E-E-A-T**: {eeat_summary or '정보 없음'}"
        if press_refs:
            brand_block += f"\n**보도자료**:\n{press_refs}"

    source_block = ""
    if source_context:
        source_block = f"\n---\n## 참조 소스 (레퍼런스 — 그대로 복사 금지)\n{source_context}\n위 소스를 참고하되, 독창적으로 재작성해요."

    st_block = ""
    if style_transfer_targets:
        st_block = (
            f"\n---\n## Style Transfer 목표\n"
            f"- 목표 글자 수: {style_transfer_targets.get('target_word_count', target_length)}자\n"
            f"- H2: {style_transfer_targets.get('avg_h2', 5)}개\n"
            f"- H3: {style_transfer_targets.get('avg_h3', 8)}개\n"
            f"- 이미지 가이드: {style_transfer_targets.get('avg_images', 8)}개"
        )

    structure_block = ""
    if structure:
        sections_guide = json.dumps(structure.get("sections", []), ensure_ascii=False, indent=2)
        faq_guide = json.dumps(structure.get("faq", []), ensure_ascii=False, indent=2)
        intro = structure.get("ai_summary", "")
        structure_block = (
            f"\n---\n## 구조 설계 (이대로 집필)\n\n"
            f"**도입부**: {intro}\n\n"
            f"**섹션 설계**:\n{sections_guide}\n\n"
            f"**FAQ 설계**:\n{faq_guide}"
        )

    return f"""## ✍️ 리뷰형(후기) 블로그 포스트 집필 요청

**제목**: {title}
**메인 키워드**: {keyword}
**서브키워드**: {sub_keyword or "없음"}
**콘텐츠 방향**: {content_angle or "체험/방문 후기"}
**목표 글자 수**: {target_length}자 이상
{brand_block}

**필수 포함 요소:**
✅ 도입부 (방문/구매 계기, 해요체)
✅ 시간순 체험 서술 (첫인상 → 핵심 체험 → 마무리)
✅ 장점 & 아쉬운 점 (솔직 평가)
✅ 총평 & 별점 (⭐ 5점 만점)
✅ 실용 정보 (위치, 가격, 영업시간 등)
✅ FAQ (5개 이상)
✅ 이미지 가이드 (8개 이상)
{source_block}
{st_block}
{structure_block}

---
위 구조를 따라 완성된 마크다운 블로그 포스트를 작성하세요.
시간순으로 경험을 서술하고, 해요체를 사용하세요.
Bold 사용 금지, 불릿(-) 대신 이모지 리스트를 사용하세요.
마크다운 외 설명 텍스트는 절대 포함하지 마세요. 원고만 출력하세요."""


def _inject_brand_style(brand: dict | None, style_guide: dict | None) -> str:
    """브랜드 페르소나 + 스타일 가이드를 시스템 프롬프트에 주입."""
    blocks = []

    if brand:
        tone_settings = brand.get("tone_voice_settings") or {}
        if tone_settings.get("tone"):
            blocks.append(
                f"\n\n**[브랜드 톤]** {tone_settings.get('tone', '')} / "
                f"스타일: {tone_settings.get('style', '')}"
            )

    if style_guide:
        parts = []
        if style_guide.get("tone"):
            parts.append(f"톤앤매너: {style_guide['tone']}")
        if style_guide.get("closing_text"):
            parts.append(f"마무리 멘트: \"{style_guide['closing_text']}\"")
        if style_guide.get("cta_text"):
            parts.append(f"CTA: \"{style_guide['cta_text']}\"")
        if style_guide.get("writing_rules"):
            rules = "\n".join(f"  - {r}" for r in style_guide["writing_rules"])
            parts.append(f"커스텀 규칙:\n{rules}")
        if parts:
            blocks.append(
                "\n\n**[브랜드 작성 스타일 가이드 — 최우선 적용]**\n"
                + "\n".join(f"- {p}" for p in parts)
                + "\n마무리 멘트와 CTA는 본문 마지막에 반드시 포함해요."
            )

    return "".join(blocks)
