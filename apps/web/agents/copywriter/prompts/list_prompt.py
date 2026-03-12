"""
list_prompt.py
추천형(리스트) 콘텐츠 프롬프트.

콘텐츠 특징:
  - TOP N 추천, 비교표, 순위 콘텐츠
  - 비교표(마크다운 표) 필수 포함
  - 해시태그 추천 섹션
  - FAQ + Schema.org JSON-LD
  - 해요체 + 이모지 + 경험형 서술
"""

from copywriter.prompts.common_rules import get_common_rules


def build_list_system_prompt(
    brand: dict | None = None,
    style_guide: dict | None = None,
    evolving_knowledge: str = "",
    db_prompt: str | None = None,
) -> str:
    """추천형(리스트) 시스템 프롬프트."""

    # DB에 저장된 커스텀 프롬프트가 있으면 우선 사용
    if db_prompt:
        result = db_prompt
    else:
        result = (
            "당신은 박작가(콘텐츠팀)입니다. 한국 네이버 블로그 SEO 전문 작가예요.\n"
            "추천형(리스트) 콘텐츠를 작성합니다.\n\n"

            + get_common_rules() + "\n\n"

            "### 📋 추천형(리스트) 전용 규칙\n\n"

            "**구조 템플릿:**\n"
            "1. 도입부 (2~3문장): 키워드 관련 경험담 + 이 글에서 다룰 내용 예고\n"
            "2. 선택 기준/체크포인트 섹션: 추천 항목을 고르기 전 알아야 할 기준\n"
            "3. TOP N 추천 리스트: 각 항목별 경험 기반 소개\n"
            "   - 각 항목은 H3 소제목으로 분리\n"
            "   - 항목별 장점/단점/가격/위치 등 실용 정보 포함\n"
            "   - 항목별 이미지 가이드 1개씩\n"
            "4. 비교표 (마크다운 표 필수): 전체 추천 항목 한눈에 비교\n"
            "   - 최소 3행 이상, 컬럼은 항목명/가격/특징/평점 등\n"
            "5. 해시태그 추천 섹션: 관련 해시태그 10~15개\n"
            "   - 형식: #키워드 #관련태그 #세부태그\n"
            "6. FAQ 섹션 (5개 이상)\n\n"

            "**비교표 필수 규칙:**\n"
            "- 추천형 콘텐츠에는 반드시 마크다운 비교표(| 구분 |)를 1개 이상 포함한다.\n"
            "- 비교표 위에 자연스러운 도입 문장을 넣는다.\n"
            "  예: \"한눈에 비교해볼 수 있게 표로 정리해봤어요 👇\"\n\n"

            "**해시태그 규칙:**\n"
            "- 메인 키워드 해시태그는 반드시 포함.\n"
            "- 세부 키워드, 지역명, 관련 주제 해시태그 추가.\n"
            "- 형식: ## 🏷️ 추천 해시태그\n"
            "  #메인키워드 #세부키워드1 #세부키워드2 ...\n\n"

            "### SEO 최적화 규칙\n"
            "- 키워드 밀도: 메인 키워드 1.5~2.5%\n"
            "- H2 태그: 최소 4개 이상 (이모지 포함)\n"
            "- 이미지 가이드: 최소 6개 이상\n"
            "- 글자 수: 최소 2,500자 이상\n"
        )

    # 브랜드 스타일 가이드 주입
    result += _inject_brand_style(brand, style_guide)

    if evolving_knowledge:
        result += evolving_knowledge

    return result


def build_list_user_prompt(
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
    """추천형(리스트) 유저 프롬프트."""
    import json

    # DB에 저장된 커스텀 유저 프롬프트가 있으면 우선 사용
    if db_prompt:
        return db_prompt.format(
            keyword=keyword, title=title,
            sub_keyword=sub_keyword or "없음",
            content_angle=content_angle or "추천/비교형 콘텐츠",
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

    return f"""## 📋 추천형(리스트) 블로그 포스트 집필 요청

**제목**: {title}
**메인 키워드**: {keyword}
**서브키워드**: {sub_keyword or "없음"}
**콘텐츠 방향**: {content_angle or "추천/비교형 콘텐츠"}
**목표 글자 수**: {target_length}자 이상
{brand_block}

**필수 포함 요소:**
✅ 도입부 (경험형 해요체, 2~3문장)
✅ 선택 기준/체크포인트
✅ TOP N 추천 리스트 (각 항목 H3)
✅ 비교표 (마크다운 표 1개 이상)
✅ 해시태그 추천 (10~15개)
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
