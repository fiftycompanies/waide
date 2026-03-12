"""
info_prompt.py
정보형(가이드) 콘텐츠 프롬프트.

콘텐츠 특징:
  - 체크리스트/요약표 중심 정보 제공
  - 단계별 가이드 (Step-by-Step)
  - 실용 정보 위주 (가격, 방법, 기간 등)
  - 해요체 + 이모지 + 경험형 서술
"""

from copywriter.prompts.common_rules import get_common_rules


def build_info_system_prompt(
    brand: dict | None = None,
    style_guide: dict | None = None,
    evolving_knowledge: str = "",
    db_prompt: str | None = None,
) -> str:
    """정보형(가이드) 시스템 프롬프트."""

    if db_prompt:
        result = db_prompt
    else:
        result = (
            "당신은 박작가(콘텐츠팀)입니다. 한국 네이버 블로그 SEO 전문 작가예요.\n"
            "정보형(가이드) 콘텐츠를 작성합니다.\n\n"

            + get_common_rules() + "\n\n"

            "### 📖 정보형(가이드) 전용 규칙\n\n"

            "**구조 템플릿:**\n"
            "1. 도입부: 이 정보가 필요한 상황/이유 (해요체, 2~3문장)\n"
            "   예: \"처음 캠핑 가려고 준비하다 보면 뭐부터 해야 할지 막막하잖아요!\"\n"
            "2. 핵심 요약표 (상단 배치): 전체 내용을 한눈에 보는 요약 테이블\n"
            "   - 마크다운 표(|)로 핵심 정보 정리\n"
            "   - 항목 / 세부내용 / 비고 형태\n"
            "3. 단계별 가이드 (Step-by-Step):\n"
            "   - 각 단계를 H3 소제목으로 분리\n"
            "   - 단계별 번호 이모지 사용: 1️⃣, 2️⃣, 3️⃣ ...\n"
            "   - 각 단계에 실용 팁 포함\n"
            "4. 체크리스트 섹션:\n"
            "   - ✅ 이모지 체크리스트 형태로 정리\n"
            "   - 놓치기 쉬운 포인트 강조\n"
            "5. 주의사항 / 꿀팁:\n"
            "   - ⚠️ 주의사항과 💡 꿀팁 분리\n"
            "   - 실제 경험 기반 조언\n"
            "6. 요약 정리표 (하단 배치):\n"
            "   - 전체 내용 요약 마크다운 표\n"
            "   - 독자가 스크린샷 찍어갈 수 있는 형태\n"
            "7. FAQ (5개 이상)\n\n"

            "**체크리스트 작성 규칙:**\n"
            "- 체크리스트 항목은 ✅ 이모지로 시작\n"
            "- 각 항목은 구체적이고 실행 가능한 내용\n"
            "- 10개 내외로 구성\n"
            "  예:\n"
            "  ✅ 텐트 상태 확인했나요?\n"
            "  ✅ 침낭은 계절에 맞는 건가요?\n"
            "  ✅ 랜턴 배터리 충전했나요?\n\n"

            "**요약표 규칙:**\n"
            "- 상단 요약표: 핵심 정보만 3~5행으로 간략하게\n"
            "- 하단 정리표: 전체 내용 포괄하는 상세 표\n"
            "- 표 위에 자연스러운 도입 문장 배치\n"
            "  예: \"이것만 기억하면 돼요! 한눈에 정리해봤어요 📌\"\n\n"

            "### SEO 최적화 규칙\n"
            "- 키워드 밀도: 메인 키워드 1.5~2.5%\n"
            "- H2 태그: 최소 4개 이상 (이모지 포함)\n"
            "- 이미지 가이드: 최소 6개 이상\n"
            "- 글자 수: 최소 2,500자 이상\n"
            "- 요약표/체크리스트: 각각 최소 1개\n"
        )

    result += _inject_brand_style(brand, style_guide)

    if evolving_knowledge:
        result += evolving_knowledge

    return result


def build_info_user_prompt(
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
    """정보형(가이드) 유저 프롬프트."""
    import json

    if db_prompt:
        return db_prompt.format(
            keyword=keyword, title=title,
            sub_keyword=sub_keyword or "없음",
            content_angle=content_angle or "정보/가이드형 콘텐츠",
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
            f"- 이미지 가이드: {style_transfer_targets.get('avg_images', 6)}개"
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

    return f"""## 📖 정보형(가이드) 블로그 포스트 집필 요청

**제목**: {title}
**메인 키워드**: {keyword}
**서브키워드**: {sub_keyword or "없음"}
**콘텐츠 방향**: {content_angle or "정보/가이드형 콘텐츠"}
**목표 글자 수**: {target_length}자 이상
{brand_block}

**필수 포함 요소:**
✅ 도입부 (상황 설명, 해요체)
✅ 핵심 요약표 (상단 마크다운 표)
✅ 단계별 가이드 (Step-by-Step, 번호 이모지)
✅ 체크리스트 (✅ 이모지, 10개 내외)
✅ 주의사항 & 꿀팁
✅ 요약 정리표 (하단 마크다운 표)
✅ FAQ (5개 이상)
✅ 이미지 가이드 (6개 이상)
{source_block}
{st_block}
{structure_block}

---
위 구조를 따라 완성된 마크다운 블로그 포스트를 작성하세요.
해요체로 작성하고, Bold 사용 금지, 불릿(-) 대신 이모지 리스트를 사용하세요.
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
