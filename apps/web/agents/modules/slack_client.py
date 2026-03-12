"""
slack_client.py
Slack 클라이언트 (에이전트 페르소나 완벽 분리 + 용도별 채널 라우팅).

발송 방식 자동 선택:
  1. SLACK_BOT_TOKEN + SLACK_CHANNEL_ID 환경변수가 있으면
     → chat.postMessage API 사용 (username/icon_emoji 완벽 지원)
       * 봇에 chat:write + chat:write.customize 스코프 필요
  2. SLACK_WEBHOOK_URL만 있으면 → Incoming Webhook fallback

채널 라우팅 (channel_type):
  - 'pipeline': 원고 생성 파이프라인 진행상황 → settings.slack_webhook.pipeline_channel
  - 'serp':     SERP 수집 결과, 순위 변동     → settings.slack_webhook.serp_channel
  - 'alerts':   등급 변동, 에러, 월간 리포트   → settings.slack_webhook.alerts_channel
  - None:       기본 채널 (SLACK_CHANNEL_ID)

에이전트별 닉네임·아이콘으로 메시지를 발송한다.
실패해도 예외를 삼키므로 에이전트 본 로직에 영향 없음.

사용 예:
  from modules import slack_client

  slack_client.send("전략 수립 완료!", agent_type="CMO", channel_type="pipeline")
  slack_client.send("등급 변동!", agent_type="SYSTEM", channel_type="alerts")
"""
import os
import requests

# ── 에이전트 페르소나 ──────────────────────────────────────
# chat.postMessage의 username/icon_emoji 파라미터로 전달되어
# 각 에이전트가 자신의 고유 프로필로 말하는 것처럼 표시된다.
PERSONAS: dict[str, dict] = {
    "CMO":             {"username": "김이사 (전략총괄)",    "icon_emoji": ":necktie:"},
    "COPYWRITER":      {"username": "박작가 (콘텐츠팀)",    "icon_emoji": ":writing_hand:"},
    "RND":             {"username": "김연구원 (데이터분석)", "icon_emoji": ":microscope:"},
    "ACCOUNT_MANAGER": {"username": "어시스턴트 (고객관리)", "icon_emoji": ":briefcase:"},
    "OPS_QUALITY":     {"username": "QC 검수봇",            "icon_emoji": ":sleuth_or_spy:"},
    "OPS_PUBLISHER":   {"username": "발행팀",               "icon_emoji": ":rocket:"},
    "ANALYST_SERP":    {"username": "순위 분석봇",          "icon_emoji": ":chart_with_upwards_trend:"},
    "ANALYST_REPORT":  {"username": "리포트봇",             "icon_emoji": ":memo:"},
    "SYSTEM":          {"username": "시스템 알림",          "icon_emoji": ":robot_face:"},
}

_DEFAULT_PERSONA = {"username": "AI 마케터", "icon_emoji": ":sparkles:"}

# ── 발송 방식 감지 ──────────────────────────────────────────
_BOT_TOKEN  = os.getenv("SLACK_BOT_TOKEN")    # xoxb-... (chat.postMessage)
_CHANNEL_ID = os.getenv("SLACK_CHANNEL_ID")   # C0XXXXXXX
_WEBHOOK    = os.getenv("SLACK_WEBHOOK_URL")   # Incoming Webhook fallback

_USE_API = bool(_BOT_TOKEN and _CHANNEL_ID)   # True → chat.postMessage 사용

# ── 채널 라우팅 (settings 테이블에서 로드) ──────────────────
_channel_cache: dict | None = None


def _load_channel_settings() -> dict:
    """
    settings 테이블의 slack_webhook 키에서 채널 설정을 로드.
    프로세스 수명 동안 1회만 호출 (캐싱).
    DB 연결 실패 시 기본값 반환.
    """
    global _channel_cache
    if _channel_cache is not None:
        return _channel_cache

    defaults = {
        "serp_channel": "#serp-tracking",
        "pipeline_channel": "#content-pipeline",
        "alerts_channel": "#alerts",
    }

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        _channel_cache = defaults
        return _channel_cache

    try:
        resp = requests.get(
            f"{supabase_url}/rest/v1/settings",
            params={"key": "eq.slack_webhook", "select": "value"},
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
            },
            timeout=5,
        )
        data = resp.json()
        if data and isinstance(data, list) and data[0].get("value"):
            val = data[0]["value"]
            _channel_cache = {
                "serp_channel": val.get("serp_channel", defaults["serp_channel"]),
                "pipeline_channel": val.get("pipeline_channel", defaults["pipeline_channel"]),
                "alerts_channel": val.get("alerts_channel", defaults["alerts_channel"]),
            }
        else:
            _channel_cache = defaults
    except Exception as e:
        print(f"[slack_client] 채널 설정 로드 실패 (기본값 사용): {e}")
        _channel_cache = defaults

    return _channel_cache


def _resolve_channel(channel_type: str | None) -> str | None:
    """
    channel_type에 따라 채널명을 반환.
    Bot API 모드에서만 의미 있음 (Webhook은 고정 채널).
    """
    if not channel_type:
        return _CHANNEL_ID

    settings = _load_channel_settings()
    key = f"{channel_type}_channel"
    return settings.get(key, _CHANNEL_ID)


def _persona(agent_type: str) -> dict:
    return PERSONAS.get(agent_type, _DEFAULT_PERSONA)


def _send_via_api(
    message: str,
    persona: dict,
    blocks: list | None,
    channel: str | None = None,
) -> bool:
    """
    Slack chat.postMessage API로 발송.
    봇에 chat:write + chat:write.customize 스코프 필요.
    username/icon_emoji 파라미터로 에이전트 페르소나 완벽 분리.
    """
    payload: dict = {
        "channel":    channel or _CHANNEL_ID,
        "text":       message,
        "username":   persona["username"],
        "icon_emoji": persona["icon_emoji"],
    }
    if blocks:
        payload["blocks"] = blocks

    try:
        resp = requests.post(
            "https://slack.com/api/chat.postMessage",
            json=payload,
            headers={"Authorization": f"Bearer {_BOT_TOKEN}"},
            timeout=5,
        )
        data = resp.json()
        if not data.get("ok"):
            print(f"[slack_client] API 발송 실패: {data.get('error')}")
            return False
        return True
    except Exception as e:
        print(f"[slack_client] API 예외: {e}")
        return False


def _send_via_webhook(
    message: str,
    persona: dict,
    blocks: list | None,
) -> bool:
    """Incoming Webhook으로 발송 (username/icon_emoji는 앱 설정에 따라 지원)."""
    if not _WEBHOOK:
        print("[slack_client] SLACK_WEBHOOK_URL 미설정 — 발송 건너뜀")
        return False

    payload: dict = {
        "text":       message,
        "username":   persona["username"],
        "icon_emoji": persona["icon_emoji"],
    }
    if blocks:
        payload["blocks"] = blocks

    try:
        resp = requests.post(_WEBHOOK, json=payload, timeout=5)
        if resp.status_code != 200:
            print(f"[slack_client] Webhook 발송 실패 ({resp.status_code}): {resp.text}")
            return False
        return True
    except Exception as e:
        print(f"[slack_client] Webhook 예외: {e}")
        return False


# ── 공개 인터페이스 ──────────────────────────────────────

def send(
    message: str,
    agent_type: str = "SYSTEM",
    blocks: list | None = None,
    channel_type: str | None = None,
) -> bool:
    """
    단순 텍스트 or Block Kit 메시지 발송.
    SLACK_BOT_TOKEN+CHANNEL_ID가 있으면 chat.postMessage API,
    없으면 Incoming Webhook으로 자동 전환.

    Args:
        message:      fallback 텍스트 (알림 미리보기에 표시됨)
        agent_type:   페르소나 키 (PERSONAS 참고)
        blocks:       Block Kit JSON (None이면 text만 발송)
        channel_type: 채널 라우팅 ('pipeline' / 'serp' / 'alerts' / None)

    Returns:
        bool: 발송 성공 여부
    """
    persona = _persona(agent_type)
    if _USE_API:
        channel = _resolve_channel(channel_type)
        return _send_via_api(message, persona, blocks, channel=channel)
    return _send_via_webhook(message, persona, blocks)


def reload_channel_settings() -> None:
    """채널 설정 캐시를 강제 갱신한다. 설정 변경 후 호출."""
    global _channel_cache
    _channel_cache = None
    _load_channel_settings()


# ── 에이전트별 구조화 메시지 ─────────────────────────────

def send_campaign_report(
    company_name: str,
    strategy_summary: str,
    focus_direction: str,
    keywords_count: int,
    content_jobs_count: int,
    keyword_list: list[str] | None = None,
) -> bool:
    """
    [김이사 CMO] 캠페인 전략 수립 완료 보고.
    strategy 수립 후 COPYWRITER에게 작업 전달이 완료된 시점에 호출.
    """
    kw_text = (
        "\n".join(f"• {k}" for k in keyword_list[:8])
        if keyword_list else "정보 없음"
    )
    if keyword_list and len(keyword_list) > 8:
        kw_text += f"\n  _(외 {len(keyword_list) - 8}개)_"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "📋 캠페인 전략 수립 완료"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*고객사*\n{company_name}"},
                {"type": "mrkdwn", "text": f"*공략 키워드*\n{keywords_count}개"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*🎯 전략 방향*\n{focus_direction}",
            },
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*전략 요약*\n{strategy_summary}"},
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*공략 키워드 목록*\n{kw_text}"},
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": (
                        f"✅ *박작가(콘텐츠팀)* 에게 *{content_jobs_count}개* 작업 전달 완료"
                    ),
                }
            ],
        },
    ]
    return send(
        message=f"[{company_name}] 캠페인 전략 수립 완료 — {content_jobs_count}개 작업 전달",
        agent_type="CMO",
        blocks=blocks,
        channel_type="pipeline",
    )


def send_content_draft_report(
    company_name: str,
    keyword: str,
    platform: str,
    content_title: str,
    ai_summary: str,
    word_count: int,
    schema_types: list[str],
    faq_count: int = 0,
    account_name: str | None = None,
    content_id: str | None = None,
) -> bool:
    """
    [박작가 COPYWRITER] 콘텐츠 초안 생성 완료 보고.
    집필·스키마 설계가 완료된 시점에 호출.
    """
    schema_text = " · ".join(f"`{s}`" for s in schema_types) if schema_types else "없음"
    account_text = f"*발행 계정*\n{account_name}" if account_name else "*발행 계정*\n미배정"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "✍️ 콘텐츠 초안 생성 완료"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*고객사*\n{company_name}"},
                {"type": "mrkdwn", "text": f"*키워드*\n{keyword}"},
                {"type": "mrkdwn", "text": f"*플랫폼*\n{platform}"},
                {"type": "mrkdwn", "text": account_text},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*📝 제목 방향*\n{content_title}",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*🤖 AI 요약 답변 (200자)*\n_{ai_summary}_",
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*글자 수*\n{word_count:,}자"},
                {"type": "mrkdwn", "text": f"*FAQ*\n{faq_count}개"},
                {"type": "mrkdwn", "text": f"*Schema.org*\n{schema_text}"},
            ],
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "✅ QC 검수 대기 중 | AEO 스키마 자동 생성 완료"
                    + (f" | `content_id: {content_id[:8]}...`" if content_id else ""),
                }
            ],
        },
    ]

    return send(
        message=f"[{company_name}] '{keyword}' 콘텐츠 초안 완료 ({word_count:,}자, Schema: {schema_text})",
        agent_type="COPYWRITER",
        blocks=blocks,
        channel_type="pipeline",
    )


def send_rnd_alert(
    alert_type: str,
    company_name: str,
    message: str,
    details: dict | None = None,
    urgent: bool = False,
) -> bool:
    """
    [김연구원 R&D] 연구 알림 발송.

    alert_type 예시:
      'PRESS_NEEDED'   : 보도자료 발행 권고
      'KEYWORD_UPDATE' : 시맨틱 키워드 업데이트
      'ALGORITHM_CHANGE': 알고리즘 변화 감지
    """
    icon = "🚨" if urgent else "🔬"
    label_map = {
        "PRESS_NEEDED":    "📰 보도자료 발행 권고",
        "KEYWORD_UPDATE":  "🔑 시맨틱 키워드 업데이트",
        "ALGORITHM_CHANGE": "⚡ 알고리즘 변화 감지",
    }
    label = label_map.get(alert_type, f"🔬 {alert_type}")

    detail_text = ""
    if details:
        detail_text = "\n".join(f"  • *{k}*: {v}" for k, v in details.items())

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"{icon} *{label}* — {company_name}\n{message}",
            },
        },
    ]
    if detail_text:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": detail_text},
        })

    return send(
        message=f"[{company_name}] {label}: {message}",
        agent_type="RND",
        blocks=blocks,
        channel_type="alerts",
    )


def send_qc_report(
    company_name: str,
    keyword: str,
    platform: str,
    result: str,           # "PASS" | "FAIL"
    score: float,
    checks: list[dict],    # [{name, passed, note}]
    content_id: str | None = None,
    account_name: str | None = None,
) -> bool:
    """
    [QC 검수봇 OPS_QUALITY] 품질 검수 결과 보고.
    PASS 시 초록, FAIL 시 빨강 이모지로 구분.
    """
    result_icon = "✅" if result == "PASS" else "❌"
    check_lines = "\n".join(
        f"{'✔' if c['passed'] else '✘'} *{c['name']}* — {c.get('note', '')}"
        for c in checks
    )
    account_text = f"*발행 계정*\n{account_name}" if account_name else "*발행 계정*\n미배정"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{result_icon} QC 검수 {'통과' if result == 'PASS' else '미달'}",
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*고객사*\n{company_name}"},
                {"type": "mrkdwn", "text": f"*키워드*\n{keyword}"},
                {"type": "mrkdwn", "text": f"*플랫폼*\n{platform}"},
                {"type": "mrkdwn", "text": account_text},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*검수 항목별 결과* (총점 {score:.0f}/100):\n{check_lines}",
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": (
                        f"{'✅ 발행 대기열 등록 완료' if result == 'PASS' else '⚠️ 재작업 필요 — COPYWRITER에 반려'}"
                        + (f" | `content_id: {content_id[:8]}...`" if content_id else "")
                    ),
                }
            ],
        },
    ]

    return send(
        message=f"[{company_name}] QC {result}: '{keyword}' ({score:.0f}점)",
        agent_type="OPS_QUALITY",
        blocks=blocks,
        channel_type="pipeline",
    )


def send_publish_report(
    company_name: str,
    keyword: str,
    platform: str,
    url: str | None,
    account_name: str | None,
    word_count: int,
    content_id: str | None = None,
) -> bool:
    """
    [발행봇 OPS_PUBLISHER] 콘텐츠 발행 완료 보고.
    """
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "🚀 콘텐츠 발행 완료"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*고객사*\n{company_name}"},
                {"type": "mrkdwn", "text": f"*키워드*\n{keyword}"},
                {"type": "mrkdwn", "text": f"*플랫폼*\n{platform}"},
                {"type": "mrkdwn", "text": f"*발행 계정*\n{account_name or '미지정'}"},
            ],
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*글자 수*\n{word_count:,}자"},
                {
                    "type": "mrkdwn",
                    "text": f"*발행 URL*\n{url}" if url else "*발행 URL*\n기록 없음",
                },
            ],
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": (
                        "✅ N_SERP 순위 추적 활성화 완료"
                        + (f" | `content_id: {content_id[:8]}...`" if content_id else "")
                    ),
                }
            ],
        },
    ]

    return send(
        message=f"[{company_name}] 발행 완료: '{keyword}' ({platform})",
        agent_type="OPS_PUBLISHER",
        blocks=blocks,
        channel_type="pipeline",
    )


def send_brand_persona_report(
    company_name: str,
    brand_name: str,
    category_main: str,
    category_sub: str,
    brand_voice: dict,
    target_persona: dict,
    brand_id: str | None = None,
) -> bool:
    """
    [김연구원 R&D] 브랜드 페르소나 분석 완료 보고.
    BRAND_ANALYZE Job 완료 후 호출.
    """
    tone     = brand_voice.get("tone", "미분석")
    style    = brand_voice.get("style", "미분석")
    kw_list  = brand_voice.get("keywords", [])
    avoid    = brand_voice.get("avoid_words", [])

    age      = target_persona.get("age_group", "미분석")
    gender   = target_persona.get("gender_focus", "미분석")
    pain     = target_persona.get("pain_points", [])
    goals    = target_persona.get("goals", [])

    kw_text    = " · ".join(f"`{k}`" for k in kw_list[:5]) or "없음"
    avoid_text = " · ".join(f"`{w}`" for w in avoid[:3]) or "없음"
    pain_text  = "\n".join(f"  • {p}" for p in pain[:3]) or "  • 없음"
    goals_text = "\n".join(f"  • {g}" for g in goals[:3]) or "  • 없음"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "🎭 브랜드 페르소나 분석 완료"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*고객사*\n{company_name}"},
                {"type": "mrkdwn", "text": f"*브랜드*\n{brand_name}"},
                {"type": "mrkdwn", "text": f"*업종 대분류*\n{category_main}"},
                {"type": "mrkdwn", "text": f"*업종 소분류*\n{category_sub}"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*🎨 브랜드 보이스*\n"
                    f"  톤: *{tone}* | 스타일: *{style}*\n"
                    f"  핵심 단어: {kw_text}\n"
                    f"  지양 표현: {avoid_text}"
                ),
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*👥 타겟 페르소나*\n"
                    f"  연령: *{age}* | 성별: *{gender}*\n"
                    f"  Pain Points:\n{pain_text}\n"
                    f"  Goals:\n{goals_text}"
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": (
                        "✅ brands 테이블 업데이트 완료 — 박작가가 다음 집필부터 페르소나 반영"
                        + (f" | `brand_id: {brand_id[:8]}...`" if brand_id else "")
                    ),
                }
            ],
        },
    ]

    return send(
        message=f"[{company_name}] 브랜드 페르소나 분석 완료 — {brand_name} ({category_main}/{category_sub})",
        agent_type="RND",
        blocks=blocks,
        channel_type="alerts",
    )


def send_aeo_citation_alert(
    company_name: str,
    brand_name: str,
    keyword: str,
    platform: str,
    cited_rank: int | None,
    cited_text: str,
    source_url: str | None = None,
) -> bool:
    """
    [김연구원 R&D] AEO 인용 성공 실시간 알림.
    AI 모델이 브랜드를 인용했을 때 즉시 호출.
    """
    rank_text  = f"*{cited_rank}번째* 출처" if cited_rank else "출처"
    emoji      = "🥇" if cited_rank == 1 else ("🥈" if cited_rank == 2 else "🎯")
    url_line   = f"\n  *출처 URL*: {source_url}" if source_url else ""

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"{emoji} AEO 인용 성공!"},
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*{brand_name}*이 *{platform}* 답변의 {rank_text}로 사용되었습니다!\n\n"
                    f"  *키워드*: `{keyword}`\n"
                    f"  *인용 문장*: _{cited_text[:120]}_"
                    + url_line
                ),
            },
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"✅ aeo_metrics 기록 완료 | 고객사: {company_name}",
                }
            ],
        },
    ]

    return send(
        message=(
            f"[AEO 인용!] {brand_name}이 {platform}에서 '{keyword}' 키워드 "
            f"{rank_text}로 인용됨 — {company_name}"
        ),
        agent_type="RND",
        blocks=blocks,
        channel_type="serp",
    )


def send_som_weekly_report(
    company_name: str,
    brand_name: str,
    report_week: str,       # 'YYYY-MM-DD'
    total_scans: int,
    cited_count: int,
    citation_rate: float,
    by_platform: dict,      # {PLATFORM: {total, cited}}
    top_citations: list[dict],
    top_keyword: str | None = None,
) -> bool:
    """
    [김이사 CMO] 주간 AI 모델 점유율(SOM) 리포트.
    매주 월요일 자동 생성·발송.
    """
    rate_bar  = "█" * int(citation_rate / 10) + "░" * (10 - int(citation_rate / 10))
    plat_lines = "\n".join(
        f"  • *{p}*: {v['cited']}/{v['total']}건 "
        f"({round(v['cited']/v['total']*100) if v['total'] else 0}%)"
        for p, v in sorted(by_platform.items(), key=lambda x: -x[1]["cited"])
    ) or "  • 데이터 없음"

    citation_lines = "\n".join(
        f"  {i+1}. `{c['keyword']}` — *{c['platform']}* "
        f"(순위 {c.get('rank') or 'N/A'})"
        for i, c in enumerate(top_citations[:5])
    ) or "  인용 없음"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "📊 주간 AI SOM(Share of Model) 리포트"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*고객사*\n{company_name}"},
                {"type": "mrkdwn", "text": f"*브랜드*\n{brand_name}"},
                {"type": "mrkdwn", "text": f"*리포트 주간*\n{report_week} 주"},
                {"type": "mrkdwn", "text": f"*상위 키워드*\n{top_keyword or 'N/A'}"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*🎯 AI 인용율 (SOM)*\n"
                    f"  `{rate_bar}` *{citation_rate:.1f}%*\n"
                    f"  총 {total_scans}회 스캔 중 *{cited_count}회 인용*"
                ),
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*📱 플랫폼별 인용 현황*\n{plat_lines}",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*🏆 주요 인용 사례 TOP 5*\n{citation_lines}",
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "✅ som_reports 테이블 저장 완료 | AI 마케터 자동 생성",
                }
            ],
        },
    ]

    return send(
        message=(
            f"[{company_name}] 주간 SOM 리포트: {citation_rate:.1f}% AI 인용율 "
            f"({cited_count}/{total_scans}회)"
        ),
        agent_type="CMO",
        blocks=blocks,
        channel_type="alerts",
    )
