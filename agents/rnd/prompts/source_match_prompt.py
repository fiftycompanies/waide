"""
source_match_prompt.py
키워드-소스 자동 매칭 프롬프트.

역할:
  - 주어진 키워드와 가용 소스 목록을 비교
  - 가장 관련성 높은 소스를 선별하여 COPYWRITER에게 전달
  - default_source_ids(브랜드 기본 소스)는 무조건 포함
  - 추가로 키워드 관련성 기반 소스 매칭

매칭 기준:
  1. source_type = 'own_best' → 스타일 참조용 (style)
  2. source_type = 'competitor' → 경쟁 분석용 (reference)
  3. source_type = 'industry_article' → 업계 트렌드 (reference)
  4. 키워드-제목 유사도 + 콘텐츠 내용 관련성
"""
import json


def build_source_match_system_prompt() -> str:
    """소스 매칭용 시스템 프롬프트."""
    return (
        "당신은 콘텐츠 소스 매칭 전문가입니다.\n\n"

        "### 역할\n"
        "주어진 키워드에 가장 적합한 참조 소스를 선별합니다.\n\n"

        "### 매칭 규칙\n"
        "1. 기본 소스(default)는 무조건 포함한다.\n"
        "2. own_best 소스는 Style Transfer에 사용되므로 최대 3개 선택.\n"
        "3. competitor 소스는 경쟁 분석용으로 최대 3개 선택.\n"
        "4. industry_article은 트렌드 참조용으로 최대 2개 선택.\n"
        "5. 키워드와 소스 제목/내용의 주제 유사도를 기준으로 순위를 매긴다.\n"
        "6. 전체 선택 소스는 최대 8개를 넘지 않는다.\n\n"

        "반드시 JSON 형식으로만 응답하세요."
    )


def build_source_match_user_prompt(
    keyword: str,
    sub_keyword: str | None,
    sources: list[dict],
    default_source_ids: list[str] | None = None,
) -> str:
    """소스 매칭용 유저 프롬프트."""
    default_ids = set(default_source_ids or [])

    source_list = []
    for s in sources:
        entry = {
            "id": s.get("id"),
            "title": s.get("title") or "(제목 없음)",
            "source_type": s.get("source_type"),
            "is_default": s.get("id") in default_ids,
            "word_count": (s.get("content_structure") or {}).get("word_count", 0),
            "peak_rank": (s.get("content_structure") or {}).get("peak_rank"),
        }
        # 콘텐츠 미리보기 (처음 200자)
        text = s.get("content_text") or ""
        if text:
            entry["preview"] = text[:200]
        source_list.append(entry)

    return f"""## 소스 매칭 요청

**타겟 키워드**: {keyword}
**서브키워드**: {sub_keyword or "없음"}

**가용 소스 목록** ({len(sources)}개):
{json.dumps(source_list, ensure_ascii=False, indent=2)}

---
아래 JSON 형식으로 응답하세요:

```json
{{
  "matched_sources": [
    {{
      "id": "소스 UUID",
      "title": "소스 제목",
      "source_type": "own_best | competitor | ...",
      "usage": "style | reference",
      "relevance_score": 0.0~1.0,
      "reason": "선택 이유 (1문장)"
    }}
  ],
  "style_sources": ["own_best 소스 ID 목록 — Style Transfer용"],
  "reference_sources": ["reference 소스 ID 목록"]
}}
```"""


def match_sources_rule_based(
    keyword: str,
    sources: list[dict],
    default_source_ids: list[str] | None = None,
    max_total: int = 8,
) -> dict:
    """
    Claude 호출 없이 규칙 기반으로 소스를 매칭하는 폴백.
    비용 최적화: 소스 수가 적거나 키워드가 단순할 때 사용.
    """
    default_ids = set(default_source_ids or [])
    kw_lower = keyword.lower()

    # 1. 기본 소스 무조건 포함
    defaults = [s for s in sources if s.get("id") in default_ids]

    # 2. 나머지 소스에서 키워드 관련성 점수 계산
    remaining = [s for s in sources if s.get("id") not in default_ids]

    scored = []
    for s in remaining:
        score = 0.0
        title = (s.get("title") or "").lower()
        text = (s.get("content_text") or "").lower()

        # 제목에 키워드 포함 → 높은 점수
        if kw_lower in title:
            score += 0.5
        # 본문에 키워드 포함
        if kw_lower in text:
            score += 0.3
        # own_best 우선
        if s.get("source_type") == "own_best":
            score += 0.2
        # peak_rank 보너스
        peak = (s.get("content_structure") or {}).get("peak_rank")
        if peak and peak <= 3:
            score += 0.1

        scored.append((s, score))

    # 점수 내림차순 정렬
    scored.sort(key=lambda x: x[1], reverse=True)

    # 3. 유형별 할당
    style_sources = []
    ref_sources = []

    for s, score in scored:
        if len(defaults) + len(style_sources) + len(ref_sources) >= max_total:
            break
        if s.get("source_type") == "own_best" and len(style_sources) < 3:
            style_sources.append(s)
        elif len(ref_sources) < 5:
            ref_sources.append(s)

    all_matched = defaults + style_sources + ref_sources

    return {
        "matched_sources": [
            {
                "id": s.get("id"),
                "title": s.get("title"),
                "source_type": s.get("source_type"),
                "usage": "style" if s.get("source_type") == "own_best" else "reference",
            }
            for s in all_matched
        ],
        "style_sources": [s.get("id") for s in (defaults + style_sources) if s.get("source_type") == "own_best"],
        "reference_sources": [s.get("id") for s in all_matched if s.get("source_type") != "own_best"],
    }
