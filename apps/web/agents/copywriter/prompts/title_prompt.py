"""
title_prompt.py
SEO 최적화 제목 생성 프롬프트.

제목 생성 전략:
  1. 메인 키워드를 제목 앞쪽에 배치 (네이버 SEO 핵심)
  2. 5가지 각도(숫자형, 의문형, 비교형, 방법론, 경험형)로 후보 생성
  3. 경쟁사 소스 제목을 분석해 차별화 포인트 도출
  4. 브랜드 스타일 가이드 톤 반영
  5. 30~45자 내외로 클릭율 최적화
"""
import json


def build_title_system_prompt(style_guide: dict | None = None) -> str:
    """제목 생성용 시스템 프롬프트."""
    base = (
        "당신은 한국 네이버 블로그 SEO 전문 제목 생성 AI입니다.\n\n"

        "### 제목 생성 규칙\n"
        "1. 메인 키워드를 제목 앞쪽 1/3 이내에 배치한다.\n"
        "2. 제목 길이는 30~45자 (공백 포함)로 최적화한다.\n"
        "3. 서브키워드가 있으면 자연스럽게 포함한다.\n"
        "4. 5가지 각도로 후보를 생성한다:\n"
        "   - 숫자형: 'TOP 5', '3가지 방법', '7곳 추천'\n"
        "   - 의문형: '왜 ~인가?', '~ 괜찮을까?'\n"
        "   - 비교형: 'A vs B', '~ 비교 분석'\n"
        "   - 방법론: '~하는 법', '~ 완벽 가이드'\n"
        "   - 경험형: '실제로 ~해보니', '~후기 솔직 리뷰'\n"
        "5. 최종 추천 제목 1개를 선정하고 이유를 밝힌다.\n"
        "6. 경쟁사 제목과 겹치지 않는 차별화된 앵글을 사용한다.\n\n"

        "반드시 JSON 형식으로만 응답하세요."
    )

    if style_guide and style_guide.get("tone"):
        tone_line = f"\n\n### 브랜드 톤 가이드\n- 톤앤매너: {style_guide['tone']}\n"
        if style_guide.get("writing_rules"):
            rules = "\n".join(f"- {r}" for r in style_guide["writing_rules"][:3])
            tone_line += f"- 작성 규칙:\n{rules}\n"
        tone_line += "위 톤을 제목에도 반영하되, SEO 키워드 배치는 최우선으로 준수한다."
        base += tone_line

    return base


def build_title_user_prompt(
    keyword: str,
    sub_keyword: str | None = None,
    content_angle: str | None = None,
    target_length: int = 2500,
    brand_name: str | None = None,
    eeat_summary: str | None = None,
    competitor_titles: list[str] | None = None,
) -> str:
    """제목 생성용 유저 프롬프트."""
    comp_block = ""
    if competitor_titles:
        comp_lines = "\n".join(f"  - {t}" for t in competitor_titles[:10])
        comp_block = f"\n**경쟁사 상위 노출 제목 (참고용 — 절대 그대로 사용 금지)**:\n{comp_lines}\n"

    return f"""## SEO 최적화 제목 생성 요청

**메인 키워드**: {keyword}
**서브키워드**: {sub_keyword or "없음"}
**콘텐츠 방향**: {content_angle or "키워드 중심 정보성 포스트"}
**목표 글자 수**: {target_length}자
**브랜드**: {brand_name or "미지정"}
**브랜드 신뢰도**: {eeat_summary or "정보 없음"}
{comp_block}
---
아래 JSON 형식으로만 응답하세요:

```json
{{
  "title_candidates": [
    {{"title": "후보 제목 1 (30~45자)", "angle": "숫자형", "keyword_position": "앞쪽"}},
    {{"title": "후보 제목 2", "angle": "의문형", "keyword_position": "앞쪽"}},
    {{"title": "후보 제목 3", "angle": "비교형", "keyword_position": "앞쪽"}},
    {{"title": "후보 제목 4", "angle": "방법론", "keyword_position": "앞쪽"}},
    {{"title": "후보 제목 5", "angle": "경험형", "keyword_position": "앞쪽"}}
  ],
  "title_final": "최종 추천 제목 (SEO + 클릭율 최적화)",
  "title_reason": "선정 이유 (1문장: 키워드 위치, 차별화 포인트, 예상 클릭율)"
}}
```"""
