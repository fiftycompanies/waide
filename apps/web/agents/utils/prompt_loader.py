"""
prompt_loader.py
에이전트 프롬프트 DB 로더 + 진화 지식 주입

역할:
  1. agent_prompts 테이블에서 에이전트별 섹션 조합 → 최종 system_prompt 반환
  2. evolving_knowledge 테이블에서 검증된 가설을 추가 컨텍스트로 주입
  3. DB 장애 시 빈 문자열 반환 → 각 에이전트 파일의 하드코딩 fallback으로 동작

사용법:
  from utils.prompt_loader import build_full_prompt

  # 에이전트 실행 시 DB 프롬프트 우선 사용 (없으면 "" 반환)
  db_prompt = build_full_prompt(agent_type="COPYWRITER", client_id=client_id)
  system = db_prompt or HARDCODED_SYSTEM_PROMPT

evolving_knowledge 테이블 스키마 (005_entity_evolving_system.sql):
  - hypothesis  TEXT NOT NULL   → 가설/규칙/교훈 내용
  - verdict     TEXT            → 'confirmed' | 'rejected' | 'pending'
  - tags        TEXT[]          → 분류 태그 (예: ["SEO", "AEO"])
  - client_id   UUID            → NULL=글로벌, 값=브랜드 특화
  - agent_type  agent_type enum → 대상 에이전트
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 섹션 출력 순서
SECTION_ORDER = ["system_role", "skills", "rules", "output_format"]

SECTION_LABELS = {
    "system_role":   "## 역할 (SYSTEM ROLE)",
    "skills":        "## 스킬 (SKILLS)",
    "rules":         "## 규칙 (RULES)",
    "output_format": "## 출력 형식 (OUTPUT FORMAT)",
}


def _get_supabase_client():
    """
    Supabase 클라이언트 생성 (agents/.env 환경변수 사용).
    import는 내부에서 lazy하게 처리하여 supabase가 없는 환경에서도 import 가능.
    """
    from supabase import create_client  # type: ignore
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise ValueError("SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경변수가 없습니다.")
    return create_client(url, key)


# ── 1. 에이전트 프롬프트 로드 ──────────────────────────────────────────────────

def load_agent_prompt(agent_type: str) -> str:
    """
    agent_prompts 테이블에서 해당 에이전트의 is_active=True 섹션을 조합하여 반환.

    DB 오류 또는 데이터 없음 → 빈 문자열 반환 (호출처에서 hardcoded fallback 사용).

    Returns:
        조합된 프롬프트 문자열 (섹션 순서: system_role → skills → rules → output_format)
        데이터 없거나 오류 시 ""
    """
    try:
        supabase = _get_supabase_client()
        result = (
            supabase.table("agent_prompts")
            .select("prompt_section, title, content")
            .eq("agent_type", agent_type)
            .eq("is_active", True)
            .order("prompt_section")
            .order("title")
            .execute()
        )

        rows = result.data or []
        if not rows:
            return ""

        # 섹션별 그룹화
        sections: dict[str, list[str]] = {}
        for row in rows:
            section = row["prompt_section"]
            if section not in sections:
                sections[section] = []
            title   = row["title"]
            content = row["content"]
            sections[section].append(f"### {title}\n{content}")

        # 순서대로 조합
        parts: list[str] = []
        for section_key in SECTION_ORDER:
            if section_key in sections:
                label = SECTION_LABELS.get(section_key, f"## {section_key.upper()}")
                parts.append(label)
                parts.extend(sections[section_key])

        # 추가 섹션 (SECTION_ORDER에 없는 것)
        for section_key, items in sections.items():
            if section_key not in SECTION_ORDER:
                parts.append(f"## {section_key.upper()}")
                parts.extend(items)

        return "\n\n".join(parts)

    except Exception as e:
        logger.warning(f"[prompt_loader] load_agent_prompt({agent_type}) 실패: {e}")
        return ""


# ── 2. 진화 지식 로드 ──────────────────────────────────────────────────────────

def load_evolving_knowledge(
    agent_type: str,
    client_id: Optional[str] = None,
    max_items: int = 5,
) -> str:
    """
    evolving_knowledge 테이블에서 해당 에이전트의 검증된 가설을 반환.

    테이블 스키마 (005_entity_evolving_system.sql):
      - hypothesis: 가설/규칙 내용 (TEXT NOT NULL)
      - verdict:    'confirmed' | 'rejected' | 'pending'
      - tags:       TEXT[] (분류 태그)
      - client_id:  NULL=글로벌, 값=브랜드 특화

    조회 대상:
      - 글로벌 지식 (client_id IS NULL): 모든 브랜드에 공통 적용
      - 브랜드 특화 지식 (client_id = client_id): 해당 브랜드에만 적용

    필터:
      - verdict IN ('confirmed', 'pending')  → rejected 제외
      - agent_type = agent_type

    Returns:
        축적된 지식 텍스트 (최대 max_items개), 없으면 ""
    """
    try:
        supabase = _get_supabase_client()

        # 글로벌 지식 조회 (verdict confirmed → pending 순)
        global_q = (
            supabase.table("evolving_knowledge")
            .select("hypothesis, verdict, tags, client_id")
            .eq("agent_type", agent_type)
            .in_("verdict", ["confirmed", "pending"])
            .is_("client_id", "null")
            .order("verdict")          # confirmed 먼저
            .order("created_at", desc=True)
            .limit(max_items)
            .execute()
        )
        global_rows = global_q.data or []

        # 브랜드 특화 지식 조회
        brand_rows: list[dict] = []
        if client_id:
            brand_q = (
                supabase.table("evolving_knowledge")
                .select("hypothesis, verdict, tags, client_id")
                .eq("agent_type", agent_type)
                .in_("verdict", ["confirmed", "pending"])
                .eq("client_id", client_id)
                .order("verdict")
                .order("created_at", desc=True)
                .limit(max_items)
                .execute()
            )
            brand_rows = brand_q.data or []

        # confirmed 우선 정렬, 최대 max_items
        def sort_key(row: dict) -> int:
            return 0 if row.get("verdict") == "confirmed" else 1

        all_rows = sorted(global_rows + brand_rows, key=sort_key)[:max_items]

        if not all_rows:
            return ""

        lines = [
            "## 축적된 학습 지식 (이전 작업에서 검증된 가설/교훈)",
            "아래 지식을 참고하되, 현재 상황에 맞게 판단하여 적용하세요.",
        ]
        for k in all_rows:
            verdict     = k.get("verdict", "pending")
            scope_lbl   = "(브랜드 특화)" if k.get("client_id") else "(공통)"
            verdict_lbl = "✅ 검증됨" if verdict == "confirmed" else "🔬 검증 중"
            tags        = k.get("tags") or []
            tag_str     = f" [{', '.join(tags)}]" if tags else ""

            lines.append(
                f"\n- {verdict_lbl}{tag_str} {scope_lbl}"
            )
            lines.append(f"  {k['hypothesis']}")

        return "\n".join(lines)

    except Exception as e:
        logger.warning(f"[prompt_loader] load_evolving_knowledge({agent_type}) 실패: {e}")
        return ""


# ── 3. 최종 프롬프트 조립 ──────────────────────────────────────────────────────

def build_full_prompt(
    agent_type: str,
    client_id: Optional[str] = None,
) -> str:
    """
    에이전트 실행 시 사용하는 최종 system_prompt 조립.

    = load_agent_prompt(agent_type)
    + load_evolving_knowledge(agent_type, client_id)

    결과가 빈 문자열이면 호출처에서 하드코딩된 프롬프트를 fallback으로 사용.

    사용 예시 (each agent file):
        from utils.prompt_loader import build_full_prompt

        db_prompt = build_full_prompt("COPYWRITER", client_id=client_id)
        system = db_prompt or HARDCODED_SYSTEM_PROMPT
    """
    base      = load_agent_prompt(agent_type)
    knowledge = load_evolving_knowledge(agent_type, client_id)

    if not base and not knowledge:
        return ""

    parts = []
    if base:
        parts.append(base)
    if knowledge:
        parts.append(knowledge)

    return "\n\n".join(parts)
