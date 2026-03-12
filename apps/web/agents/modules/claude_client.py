"""
claude_client.py
Claude API 호출 래퍼 (모든 에이전트 공용).

OMC(oh-my-claudecode) 스타일 3-티어 스마트 모델 라우팅 내장:
  LOW  (Haiku)  : 단순 파싱·규칙 검수·AEO 시뮬레이션·발행 포맷팅
  MED  (Sonnet) : 표준 콘텐츠 집필·브랜드 분석·캠페인 전략·SEO 리포트
  HIGH (Opus)   : 복잡한 경쟁사 분석·심층 리서치·전략 수립·AI 보안 감사

라우팅 우선순위 (OMC rules.ts 참조):
  1. FORCE_MODEL 환경변수  → 항상 우선 (user override)
  2. LOW 트리거 키워드     → haiku 고정
  3. HIGH 트리거 키워드    → opus 승격
  4. 에이전트 기본 티어    → fallback
"""
import json
import os

from anthropic import Anthropic

# ── 클라이언트 싱글톤 ──────────────────────────────────────
_client: Anthropic | None = None


def _get_client() -> Anthropic:
    """Anthropic 클라이언트 싱글톤 반환. 최초 호출 시 초기화."""
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다. "
                "agents/.env 파일을 확인하세요.\n"
                "  ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx"
            )
        _client = Anthropic(api_key=api_key)
    return _client


# ── 모델 티어 (OMC LOW / MED / HIGH) ────────────────────
class ModelTier:
    LOW  = "claude-haiku-4-5-20251001"   # 파싱, 규칙 검수, 단순 요약
    MED  = "claude-sonnet-4-6"           # 표준 전략, 집필, 분석
    HIGH = "claude-opus-4-6"             # 경쟁 분석, 심층 리서치, 보안 감사


# 기본 모델 (env override 없으면 사용)
DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", ModelTier.MED)

# ── 에이전트별 기본 티어 (OMC quickTierForAgent 참조) ────
_AGENT_DEFAULT_TIER: dict[str, str] = {
    "ACCOUNT_MANAGER": ModelTier.LOW,   # billing gate = 단순 로직
    "CMO":             ModelTier.MED,   # 전략 기획 = 표준
    "COPYWRITER":      ModelTier.MED,   # 블로그 집필 = 표준
    "RND":             ModelTier.LOW,   # AEO 시뮬레이션 = LOW; 분석은 개별 지정
    "OPS_QUALITY":     ModelTier.LOW,   # 규칙 검수 = LOW; AI 감사는 개별 지정
    "OPS_PUBLISHER":   ModelTier.LOW,   # 발행 포맷팅 = 단순
    "ANALYST_REPORT":  ModelTier.MED,   # 주간 리포트 = 표준
}

# HIGH 티어로 승격시키는 태스크 키워드
_HIGH_TIER_TRIGGERS = [
    # CMO — 복잡한 전략
    "경쟁사 분석", "시장 포지셔닝", "포지셔닝", "competitive analysis",
    "멀티 플랫폼 전략", "글로벌 전략", "stp 분석",
    # RND — 심층 리서치
    "딥리서치", "알고리즘 분석", "공식 가이드 분석", "시계열 예측",
    "deep research", "기술 리서치", "팩트 발굴", "데이터 예측",
    # COPYWRITER — 프리미엄 콘텐츠
    "프리미엄 콘텐츠", "플래그십 아티클", "랜딩페이지",
    # QC — 보안 감사
    "스키마 보안 감사", "취약점 검사", "schema security", "ai seo 감사",
]

# LOW 티어로 고정하는 태스크 키워드 (HIGH 트리거 무시)
_LOW_TIER_TRIGGERS = [
    "aeo 시뮬레이션", "인용 스캔", "결제 확인", "billing",
    "발행 처리", "publish formatting", "슬랙 알림",
    "글자 수 검수", "faq 검수", "규칙 기반 검수",
]


def route_model(agent_type: str, task_hint: str = "") -> str:
    """
    OMC 스타일 3-티어 모델 라우터.

    Args:
        agent_type: 호출하는 에이전트 타입 (예: "CMO", "COPYWRITER")
        task_hint:  태스크 설명 키워드 (선택 — 복잡도 감지에 사용)

    Returns:
        Claude 모델 ID 문자열
    """
    # 1. 사용자 강제 오버라이드 (개발/테스트 편의)
    force = os.getenv("FORCE_MODEL")
    if force:
        return force

    task_lower = task_hint.lower()

    # 2. LOW 티어 고정 (HIGH보다 우선)
    if any(t in task_lower for t in _LOW_TIER_TRIGGERS):
        return ModelTier.LOW

    # 3. HIGH 티어 승격
    if any(t in task_lower for t in _HIGH_TIER_TRIGGERS):
        return ModelTier.HIGH

    # 4. 에이전트 기본 티어 반환
    return _AGENT_DEFAULT_TIER.get(agent_type, ModelTier.MED)


# ── 공개 인터페이스 ──────────────────────────────────────

def complete(
    system: str,
    user: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 4096,
    as_json: bool = False,
) -> str | dict:
    """
    Claude API 단일 호출 (모델 명시적 지정).

    Args:
        system:     시스템 프롬프트 (에이전트 페르소나, 출력 형식 지시)
        user:       유저 프롬프트 (실제 작업 요청)
        model:      Claude 모델 ID (기본: CLAUDE_MODEL env 또는 sonnet)
        max_tokens: 최대 응답 토큰 수
        as_json:    True이면 응답을 JSON dict로 파싱해서 반환

    Returns:
        str  (as_json=False)
        dict (as_json=True)
    """
    client = _get_client()

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )

    text = response.content[0].text.strip()

    if as_json:
        return _parse_json(text)
    return text


def complete_routed(
    agent_type: str,
    system: str,
    user: str,
    task_hint: str = "",
    max_tokens: int = 4096,
    as_json: bool = False,
) -> str | dict:
    """
    OMC 스마트 라우팅 Claude 호출.
    agent_type + task_hint로 최적 모델을 자동 선택한다.

    Args:
        agent_type: 호출 에이전트 (예: "CMO", "RND")
        system:     시스템 프롬프트
        user:       유저 프롬프트
        task_hint:  복잡도 감지 힌트 (예: "경쟁사 분석", "딥리서치")
        max_tokens: 최대 응답 토큰 수
        as_json:    JSON 파싱 여부

    Returns:
        str | dict
    """
    model = route_model(agent_type, task_hint)
    return complete(
        system=system,
        user=user,
        model=model,
        max_tokens=max_tokens,
        as_json=as_json,
    )


# ── 내부 헬퍼 ────────────────────────────────────────────

def _parse_json(text: str) -> dict:
    """
    응답 텍스트에서 JSON 추출 후 파싱.
    마크다운 ```json ... ``` 블록과 순수 JSON 모두 지원.

    Raises:
        json.JSONDecodeError: 파싱 실패 시 (호출자가 fallback 처리)
    """
    # ```json ... ``` 블록 제거
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()

    return json.loads(text)
