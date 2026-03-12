"""
body_prompt.py
SEO/AEO 최적화 본문 생성 프롬프트.

Style Transfer 기법:
  - 참조 소스(own_best, competitor)의 구조 통계(H2수, H3수, 이미지수, 글자수)를 평균화
  - 그 평균값을 목표 구조로 설정하여 "잘 된 글 스타일" 재현
  - 브랜드 페르소나 content_style_guide(톤, CTA, 마무리 멘트, 규칙) 적용

본문 구조:
  1. AI 요약 답변 (상단 200자) — Featured Snippet 대응
  2. H2 섹션 4개+ — 네이버 상위노출 실전 기준
  3. 비교표/체크리스트 — D.I.A+ 체류시간 유도
  4. FAQ 5개+ — PAA(People Also Ask) 대응
  5. Schema.org JSON-LD — 구조화 데이터 (별도 생성)
"""
import json


def build_body_system_prompt(
    brand: dict | None = None,
    style_guide: dict | None = None,
    evolving_knowledge: str = "",
    db_prompt: str | None = None,
) -> str:
    """본문 생성용 시스템 프롬프트 (페르소나 + AEO 원칙)."""
    base = (
        "당신은 박작가(콘텐츠팀)입니다. 한국 SEO/AEO 전문 블로그 작가입니다.\n\n"

        "### [SKILL: SEO Specialist — 검색 알고리즘 최적화]\n"
        "- 네이버 블로그 알고리즘: 제목 키워드 포함, 최소 2,500자 이상 작성.\n"
        "- Google AEO: Featured Snippet 최적화 — 첫 40~60단어 내 핵심 답변 완결.\n"
        "- 키워드 밀도: 메인 키워드 1.5~2.5% (전체 글자 수 대비).\n"
        "- 서브키워드는 본문 중간중간 자연 배치.\n"
        "- 내부 링크: `[내부링크: 키워드]` 형식으로 표시.\n"
        "- H2 태그: 반드시 4개 이상.\n\n"

        "### [SKILL: C-Rank 대응 — 네이버 블로그 지수]\n"
        "- 블로그 주제 카테고리 일관성 유지.\n"
        "- 카테고리 외 주제 언급 시 메인 주제와 연결 고리 필수.\n\n"

        "### [SKILL: D.I.A+ 대응 — 네이버 고품질 기준]\n"
        "- 실제 체험/경험 톤 사용 (#내돈내산, #솔직후기 스타일).\n"
        "- 체류시간 유도: 이미지 가이드 6개+, 소제목으로 가독성 향상.\n"
        "- 가격비교표, 체크리스트, 추천 순위표 등 포함.\n"
        "- 과장 표현 지양, 구체적 수치와 경험 위주 서술.\n\n"

        "### [SKILL: Technical Writer — 구조화 문서]\n"
        "- 마크다운: H2 → H3 → 본문 순서 엄수.\n"
        "- 표: 최소 3행 이상, 헤더 명확.\n"
        "- FAQ: 질문은 의문문, 답변은 단정적 평서문.\n\n"

        "### AEO 7대 원칙 (반드시 준수)\n"
        "1. 첫 섹션은 '## AI 요약 답변' — 40~60단어 내 핵심 답변 단정적 문장.\n"
        "2. 모든 문장은 '~이다', '~한다' 단정적 문장. '~것 같다' 절대 금지.\n"
        "3. 비교·순위 정보는 마크다운 표(|)로 정리.\n"
        "4. 목록성 정보는 마크다운 리스트(-, *).\n"
        "5. 하단 '## FAQ' 섹션 필수.\n"
        "6. E-E-A-T 인용 자연 포함 (수치, 보도, 인증서).\n"
        "7. 이미지 위치에 텍스트 가이드 6개+ 삽입:\n"
        "   > [이미지 가이드: 촬영 방향/AI 프롬프트 1~2문장]\n"
    )

    # 브랜드 페르소나 (brand.brand_voice 기반)
    persona_block = ""
    if brand:
        brand_voice = brand.get("brand_voice") or {}
        target_p = brand.get("target_persona") or {}

        if brand_voice.get("tone"):
            tone = brand_voice.get("tone", "")
            style = brand_voice.get("style", "")
            keywords = brand_voice.get("keywords", [])
            avoid = brand_voice.get("avoid_words", [])
            rules = brand_voice.get("writing_rules", [])
            age = target_p.get("age_group", "")
            pains = target_p.get("pain_points", [])

            kw_str = ", ".join(f"'{k}'" for k in keywords[:5]) or "없음"
            avoid_str = ", ".join(f"'{w}'" for w in avoid[:3]) or "없음"
            rules_str = "\n".join(f"   - {r}" for r in rules[:3]) if rules else ""
            pain_str = ", ".join(pains[:2]) if pains else ""

            persona_block = (
                f"\n\n**[브랜드 페르소나 — brand_voice 기반]**\n"
                f"- 문체/톤: {tone} / 스타일: {style}\n"
                f"- 핵심 단어: {kw_str}\n"
                f"- 지양 표현: {avoid_str}\n"
                f"- 타겟 독자: {age}"
                + (f" — Pain: {pain_str}" if pain_str else "")
                + ("\n- 규칙:\n" + rules_str if rules_str else "")
            )

    # 브랜드 스타일 가이드 (content_style_guide — UI에서 설정)
    style_block = ""
    if style_guide:
        parts = []
        if style_guide.get("tone"):
            parts.append(f"- 톤앤매너: {style_guide['tone']}")
        if style_guide.get("closing_text"):
            parts.append(f"- 마무리 멘트: \"{style_guide['closing_text']}\"")
        if style_guide.get("cta_text"):
            parts.append(f"- CTA 문구: \"{style_guide['cta_text']}\"")
        if style_guide.get("writing_rules"):
            rules = "\n".join(f"  - {r}" for r in style_guide["writing_rules"])
            parts.append(f"- 작성 규칙:\n{rules}")
        if parts:
            style_block = (
                "\n\n**[브랜드 작성 스타일 가이드 — 최우선 적용]**\n"
                + "\n".join(parts)
                + "\n마무리 멘트와 CTA는 본문 마지막에 반드시 포함한다."
            )

    result = base + persona_block + style_block

    if evolving_knowledge:
        result += evolving_knowledge

    result += "\n\n위 모든 지침을 반영하되, AEO 원칙(단정적 문장, AI 요약 필수)은 최우선 준수한다."

    return result


def build_body_user_prompt(
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
    """본문 생성용 유저 프롬프트."""

    # 브랜드 컨텍스트
    brand_block = ""
    if brand_name:
        brand_block = f"""
**브랜드**: {brand_name}
**E-E-A-T 인용 자료**: {eeat_summary or "정보 없음"}
**인용 가능 보도자료**:
{press_refs or "없음"}"""

    # 소스 참조 블록
    source_block = ""
    if source_context:
        source_block = f"""
---
## 참조 소스 자료 (레퍼런스 — 절대 그대로 복사 금지)
{source_context}
위 소스를 참고하되, 구조와 정보만 참조하고 독창적으로 재작성한다."""

    # Style Transfer 목표
    st_block = ""
    if style_transfer_targets:
        st_block = f"""
---
## Style Transfer 목표 구조 (참조 소스 평균 기반)
- 목표 글자 수: {style_transfer_targets.get('target_word_count', target_length)}자
- 목표 H2 섹션: {style_transfer_targets.get('avg_h2', 4)}개
- 목표 H3 소제목: {style_transfer_targets.get('avg_h3', 6)}개
- 목표 이미지 가이드: {style_transfer_targets.get('avg_images', 6)}개
위 구조 목표를 달성하도록 본문을 설계한다."""

    # 구조 설계 (1차 Claude 결과)
    structure_block = ""
    if structure:
        sections_guide = json.dumps(structure.get("sections", []), ensure_ascii=False, indent=2)
        faq_guide = json.dumps(structure.get("faq", []), ensure_ascii=False, indent=2)
        structure_block = f"""
---
## 구조 설계 (blueprint — 이대로 집필할 것)

**AI 요약 답변 (상단 배치 필수)**:
{structure.get("ai_summary", "")}

**본문 섹션 설계**:
{sections_guide}

**FAQ 설계**:
{faq_guide}

**E-E-A-T 인용 방향**: {structure.get("eeat_citation_hint", "전문성과 경험을 수치로 인용")}"""

    return f"""## 블로그 포스트 집필 요청

**제목**: {title}
**메인 키워드**: {keyword}
**서브키워드**: {sub_keyword or "없음"}
**콘텐츠 방향**: {content_angle or "키워드 중심 정보성 포스트"}
**목표 글자 수**: {target_length}자 이상
{brand_block}

**AEO 지침**:
{json.dumps(key_signals, ensure_ascii=False, indent=2) if key_signals else "기본 SEO 원칙"}
{source_block}
{st_block}
{structure_block}

---
위 구조를 따라 완성된 마크다운 블로그 포스트를 작성하세요.
마크다운 외 설명 텍스트는 절대 포함하지 마세요. 원고만 출력하세요."""
