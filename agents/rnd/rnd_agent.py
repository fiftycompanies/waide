"""
rnd_agent.py
R&D 에이전트 — 김연구원 (R&D팀)

역할:
  1. [NEWS_MONITOR]      뉴스·보도자료 현황 체크 → 부족 시 슬랙 알림
  2. [SEMANTIC_UPDATE]   연관 시맨틱 키워드 매일 업데이트
  3. [BRAND_ANALYZE]     브랜드 URL/텍스트 분석 → 페르소나(brand_voice, target_persona) 추출
  4. [AEO_SCAN]          타겟 키워드를 AI 모델별 시뮬레이션으로 인용 여부 스캔 → SOM 원시 데이터
처리 흐름:
  BRAND_ANALYZE Job 수신
    ↓ _analyze_brand_source()   URL 또는 텍스트에서 페르소나 추출 (Claude)
    ↓ update_brand()            brands.brand_voice / target_persona / category 업데이트
    ↓ send_brand_persona_report()  슬랙 보고

  AEO_SCAN Job 수신
    ↓ _scan_platform()          플랫폼별 AI 응답 시뮬레이션 (Claude)
    ↓ insert_aeo_metric()       aeo_metrics 저장
    ↓ send_aeo_citation_alert() 인용 성공 시 실시간 슬랙 알림
"""
import json
import os
import re
from datetime import date
from typing import Optional

import httpx

from core.base_agent import BaseAgent
from core.account_manager_agent import AccountManagerAgent
from modules import claude_client, slack_client


# ── 상수 ──────────────────────────────────────────────
MIN_PRESS_PER_MONTH = 2

# AEO 스캔 대상 AI 플랫폼 (시뮬레이션 대상)
AEO_PLATFORMS = ["PERPLEXITY", "CHATGPT", "GEMINI", "NAVER_AI", "GOOGLE_AEO"]

# [비용 최적화] AEO 스캔: 일 최대 스캔 키워드 수
# 전체 키워드를 매일 검색하지 않고 핵심 키워드만 샘플링
AEO_MAX_KEYWORDS_PER_DAY = int(__import__("os").getenv("AEO_MAX_KEYWORDS_PER_DAY", "3"))

# 플랫폼별 응답 스타일 설명 (Claude 시뮬레이션 프롬프트용)
PLATFORM_STYLE = {
    "PERPLEXITY":  "Perplexity AI처럼 출처 URL을 명시하며 요약 답변을 제공하는",
    "CHATGPT":     "ChatGPT처럼 단계별로 상세히 설명하는",
    "GEMINI":      "Google Gemini처럼 검색 결과를 통합해 구조적으로 정리하는",
    "NAVER_AI":    "네이버 AI 검색처럼 국내 출처 중심으로 답변하는",
    "GOOGLE_AEO":  "Google의 AI Overview처럼 간결하게 핵심만 추출하는",
}


class RNDAgent(BaseAgent):

    AGENT_TYPE = "RND"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")

        if job_type == "NEWS_MONITOR":
            return self._handle_news_monitor(job)
        elif job_type == "SEMANTIC_UPDATE":
            return self._handle_semantic_update(job)
        elif job_type == "BRAND_ANALYZE":
            return self._handle_brand_analyze(job)
        elif job_type == "AEO_SCAN":
            return self._handle_aeo_scan(job)
        else:
            raise ValueError(f"RNDAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핸들러 1: 뉴스·보도자료 현황 체크
    # ──────────────────────────────────────────────────────

    def _handle_news_monitor(self, job: dict) -> dict:
        """
        brands.press_history를 분석하여 최근 30일 보도 수를 체크.
        MIN_PRESS_PER_MONTH 미달 시 슬랙 알림 + evolving_knowledge 기록.
        """
        payload   = job.get("input_payload", {})
        client_id = payload.get("client_id")
        brand_id  = payload.get("brand_id")

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        brand = self.db.get_brand(brand_id) if brand_id else None
        if not brand:
            brands = self.db.get_brands_by_client(client_id)
            brand  = brands[0] if brands else None

        if not brand:
            self.logger.warning("NO_BRAND", "등록된 브랜드가 없습니다.", job_id=job["id"])
            return {"status": "NO_BRAND", "client_id": client_id}

        press_history: list[dict] = brand.get("press_history") or []
        recent_press = self._count_recent_press(press_history, days=30)
        is_sufficient = recent_press >= MIN_PRESS_PER_MONTH

        self.logger.info(
            "PRESS_CHECK",
            f"{brand['name']}: 최근 30일 보도 {recent_press}건 "
            f"({'충분' if is_sufficient else '부족'})",
            job_id=job["id"],
        )

        result = {
            "brand_id":      brand["id"],
            "brand_name":    brand["name"],
            "recent_press":  recent_press,
            "is_sufficient": is_sufficient,
            "alert_sent":    False,
        }

        if not is_sufficient:
            context = AccountManagerAgent.get_client_context(client_id)
            company = context["client"]["company_name"] if context else brand["name"]

            slack_client.send_rnd_alert(
                alert_type="PRESS_NEEDED",
                company_name=company,
                message=(
                    f"최근 30일 보도자료 *{recent_press}건* — "
                    f"권장({MIN_PRESS_PER_MONTH}건/월) 미달입니다.\n"
                    "E-E-A-T 신뢰도 제고를 위해 보도자료 발행을 권장합니다."
                ),
                details={
                    "현재 보도 수": f"{recent_press}건 / 최근 30일",
                    "권장 발행 수": f"월 {MIN_PRESS_PER_MONTH}건 이상",
                    "추천 매체":   "뉴시스, 파이낸셜뉴스, 이데일리",
                    "효과":       "E-E-A-T 권위 시그널 강화 → AI 검색 인용율 상승",
                },
                urgent=True,
            )

            self.db.insert_evolving_knowledge({
                "agent_type": "RND",
                "job_id":     job["id"],
                "client_id":  client_id,
                "brand_id":   brand["id"],
                "hypothesis": (
                    f"보도자료 월 {MIN_PRESS_PER_MONTH}건 이상 유지 시 "
                    "AI 검색 인용율 및 E-E-A-T 신뢰도가 상승한다."
                ),
                "action": (
                    f"보도자료 부족({recent_press}건/30일) 감지 → "
                    "슬랙 알림 발송 + 발행 권고"
                ),
                "tags": ["E-E-A-T", "press", "AEO"],
            })

            result["alert_sent"] = True
            self.logger.success(
                "PRESS_ALERT_SENT",
                f"{brand['name']} 보도자료 부족 알림 발송",
                job_id=job["id"],
            )

        return result

    # ──────────────────────────────────────────────────────
    # 핸들러 2: 시맨틱 키워드 업데이트
    # ──────────────────────────────────────────────────────

    def _handle_semantic_update(self, job: dict) -> dict:
        """
        Claude로 연관 시맨틱 키워드를 생성하고 evolving_knowledge에 저장.
        """
        payload       = job.get("input_payload", {})
        client_id     = payload.get("client_id")
        base_keywords: list[str] = payload.get("keywords", [])

        if not base_keywords:
            context = AccountManagerAgent.get_client_context(client_id)
            base_keywords = [k["keyword"] for k in context.get("keywords", [])[:10]]

        if not base_keywords:
            return {"status": "NO_KEYWORDS", "client_id": client_id}

        semantic = self._generate_semantic_keywords(base_keywords, client_id, job["id"])

        self.db.insert_evolving_knowledge({
            "agent_type": "RND",
            "job_id":     job["id"],
            "client_id":  client_id,
            "hypothesis": "연관 시맨틱 키워드 확장으로 롱테일 검색 커버리지를 높인다.",
            "action":     f"기준 키워드 {len(base_keywords)}개 기반 시맨틱 키워드 생성",
            "outcome":    f"시맨틱 키워드 {len(semantic.get('keywords', []))}개 발굴",
            "tags":       ["semantic", "keywords", "R&D"],
        })

        self.logger.success(
            "SEMANTIC_UPDATED",
            f"시맨틱 키워드 {len(semantic.get('keywords', []))}개 업데이트",
            job_id=job["id"],
        )

        return {
            "client_id":       client_id,
            "base_keywords":   base_keywords,
            "semantic_result": semantic,
        }

    # ──────────────────────────────────────────────────────
    # 핸들러 3: 브랜드 페르소나 분석 (신규)
    # ──────────────────────────────────────────────────────

    def _handle_brand_analyze(self, job: dict) -> dict:
        """
        브랜드 URL 또는 소개 텍스트를 Claude로 분석하여
        brand_voice / target_persona / category_main / category_sub 추출 후
        brands 테이블에 업데이트한다.

        payload 키:
          client_id    : 필수
          brand_id     : 선택 (없으면 client 첫 번째 브랜드 사용)
          source_url   : 분석 대상 URL (브랜드 홈페이지 등)
          source_text  : 분석 대상 텍스트 (URL 없을 때 직접 입력)
        """
        payload   = job.get("input_payload", {})
        client_id = payload.get("client_id")
        brand_id  = payload.get("brand_id")

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        # 브랜드 로드
        brand = self.db.get_brand(brand_id) if brand_id else None
        if not brand:
            brands = self.db.get_brands_by_client(client_id)
            brand  = brands[0] if brands else None

        if not brand:
            self.logger.warning("NO_BRAND", "등록된 브랜드가 없습니다.", job_id=job["id"])
            return {"status": "NO_BRAND", "client_id": client_id}

        # 분석 소스 결정
        source_text = payload.get("source_text", "")
        source_url  = payload.get("source_url", "")

        if not source_text:
            source_text = self._fetch_url_text(source_url, brand)

        self.logger.info(
            "BRAND_ANALYZE_START",
            f"{brand['name']} 페르소나 분석 시작 (소스 {len(source_text)}자)",
            job_id=job["id"],
        )

        # Claude로 페르소나 분석
        persona = self._analyze_brand_source(brand, source_text, job["id"])

        # brands 테이블 업데이트
        updates: dict = {}
        if persona.get("brand_voice"):
            updates["brand_voice"] = persona["brand_voice"]
        if persona.get("target_persona"):
            updates["target_persona"] = persona["target_persona"]
        if persona.get("category_main"):
            updates["category_main"] = persona["category_main"]
        if persona.get("category_sub"):
            updates["category_sub"] = persona["category_sub"]

        if updates:
            self.db.update_brand(brand["id"], updates)

        self.logger.success(
            "BRAND_ANALYZED",
            f"{brand['name']} 페르소나 업데이트 완료",
            job_id=job["id"],
        )

        # 슬랙 보고
        context = AccountManagerAgent.get_client_context(client_id)
        company = context["client"]["company_name"] if context else brand["name"]

        slack_client.send_brand_persona_report(
            company_name=company,
            brand_name=brand["name"],
            category_main=persona.get("category_main", "미분석"),
            category_sub=persona.get("category_sub", "미분석"),
            brand_voice=persona.get("brand_voice", {}),
            target_persona=persona.get("target_persona", {}),
            brand_id=brand["id"],
        )

        # evolving_knowledge 기록
        self.db.insert_evolving_knowledge({
            "agent_type": "RND",
            "job_id":     job["id"],
            "client_id":  client_id,
            "brand_id":   brand["id"],
            "hypothesis": "브랜드 페르소나를 콘텐츠에 반영하면 타겟 독자 공감도와 체류 시간이 상승한다.",
            "action":     f"{brand['name']} 페르소나 분석 완료 → brands 테이블 업데이트",
            "tags":       ["persona", "brand_voice", "copywriting"],
        })

        return {
            "brand_id":      brand["id"],
            "brand_name":    brand["name"],
            "category_main": persona.get("category_main"),
            "category_sub":  persona.get("category_sub"),
            "brand_voice":   persona.get("brand_voice"),
            "target_persona": persona.get("target_persona"),
        }

    # ──────────────────────────────────────────────────────
    # 핸들러 4: AEO 인용 스캔 (신규)
    # ──────────────────────────────────────────────────────

    def _handle_aeo_scan(self, job: dict) -> dict:
        """
        타겟 키워드를 AI 플랫폼별로 시뮬레이션하여
        브랜드 인용 여부를 스캔하고 aeo_metrics에 저장한다.

        실제 외부 API 대신 Claude를 이용해 각 플랫폼의 답변 스타일을
        시뮬레이션한다. (추후 실제 API로 교체 가능한 구조)

        payload 키:
          client_id    : 필수
          brand_id     : 선택
          brand_name   : 필수 (인용 감지 기준)
          keywords     : list[str] — 스캔 대상 키워드 목록
          platforms    : list[str] — 대상 플랫폼 (기본: 전체)
          workspace_id : 선택
        """
        payload      = job.get("input_payload", {})
        client_id    = payload.get("client_id")
        brand_id     = payload.get("brand_id")
        brand_name   = payload.get("brand_name", "")
        keywords     = payload.get("keywords", [])
        platforms    = payload.get("platforms", AEO_PLATFORMS)
        workspace_id = payload.get("workspace_id")

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        # brand_name 자동 보완
        if not brand_name:
            brand = self.db.get_brand(brand_id) if brand_id else None
            if not brand and client_id:
                brands = self.db.get_brands_by_client(client_id)
                brand  = brands[0] if brands else None
                brand_id = brand["id"] if brand else brand_id
            brand_name = brand["name"] if brand else ""

        if not keywords or not brand_name:
            return {"status": "MISSING_PARAMS", "brand_name": brand_name, "keywords": keywords}

        context = AccountManagerAgent.get_client_context(client_id)
        company = context["client"]["company_name"] if context else brand_name

        # [비용 최적화] 핵심 키워드 우선 샘플링 (일 최대 AEO_MAX_KEYWORDS_PER_DAY개)
        original_count = len(keywords)
        keywords = keywords[:AEO_MAX_KEYWORDS_PER_DAY]
        if original_count > AEO_MAX_KEYWORDS_PER_DAY:
            self.logger.info(
                "AEO_SAMPLED",
                f"키워드 {original_count}개 → 상위 {len(keywords)}개만 스캔 "
                f"(일일 한도 {AEO_MAX_KEYWORDS_PER_DAY}개)",
                job_id=job["id"],
            )

        cited_total   = 0
        scanned_total = 0
        cached_total  = 0
        citation_log  = []

        for keyword in keywords:
            for platform in platforms:

                # [비용 최적화] 오늘 이미 스캔한 조합이면 건너뜀 (중복 쿼리 캐싱)
                if self._already_scanned_today(client_id, keyword, platform):
                    cached_total += 1
                    self.logger.info(
                        "AEO_CACHE_HIT",
                        f"'{keyword}' — {platform}: 오늘 스캔 이력 있음, 건너뜀",
                        job_id=job["id"],
                    )
                    continue

                scanned_total += 1

                # AI 응답 시뮬레이션
                scan_result = self._scan_platform(
                    keyword=keyword,
                    brand_name=brand_name,
                    platform=platform,
                    job_id=job["id"],
                )

                metric_data = {
                    "client_id":        client_id,
                    "brand_id":         brand_id,
                    "keyword":          keyword,
                    "platform":         platform,
                    "query_text":       f"{keyword} 추천",
                    "is_cited":         scan_result["is_cited"],
                    "cited_rank":       scan_result.get("cited_rank"),
                    "cited_text":       scan_result.get("cited_text", ""),
                    "source_url":       scan_result.get("source_url"),
                    "response_summary": scan_result.get("response_summary", "")[:500],
                    "job_id":           job["id"],
                }
                if workspace_id:
                    metric_data["workspace_id"] = workspace_id

                self.db.insert_aeo_metric(metric_data)

                if scan_result["is_cited"]:
                    cited_total += 1
                    citation_log.append({
                        "keyword":  keyword,
                        "platform": platform,
                        "rank":     scan_result.get("cited_rank"),
                        "text":     scan_result.get("cited_text", ""),
                    })

                    # 실시간 인용 알림
                    slack_client.send_aeo_citation_alert(
                        company_name=company,
                        brand_name=brand_name,
                        keyword=keyword,
                        platform=platform,
                        cited_rank=scan_result.get("cited_rank"),
                        cited_text=scan_result.get("cited_text", ""),
                        source_url=scan_result.get("source_url"),
                    )

                    self.logger.success(
                        "AEO_CITED",
                        f"'{keyword}' — {platform}: {brand_name} 인용 "
                        f"(순위 {scan_result.get('cited_rank')})",
                        job_id=job["id"],
                    )
                else:
                    self.logger.info(
                        "AEO_NOT_CITED",
                        f"'{keyword}' — {platform}: 인용 없음",
                        job_id=job["id"],
                    )

        citation_rate = round(cited_total / scanned_total * 100, 1) if scanned_total else 0.0
        self.logger.success(
            "AEO_SCAN_DONE",
            f"스캔 완료: 신규 {scanned_total}회 중 {cited_total}회 인용 ({citation_rate}%), "
            f"캐시 스킵 {cached_total}회",
            job_id=job["id"],
        )

        return {
            "client_id":     client_id,
            "brand_name":    brand_name,
            "keywords":      keywords,
            "platforms":     platforms,
            "scanned_total": scanned_total,
            "cached_total":  cached_total,
            "cited_total":   cited_total,
            "citation_rate": citation_rate,
            "citations":     citation_log,
        }

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 — 브랜드 분석
    # ──────────────────────────────────────────────────────

    def _fetch_url_text(self, url: str, brand: dict) -> str:
        """
        URL에서 텍스트와 메타데이터를 추출한다.

        [비용 최적화] 이미지 분석 API(Vision API 등)를 호출하지 않는다.
        HTML의 텍스트 콘텐츠 + 메타태그 + img Alt 태그만 파싱한다.
        이미지 자체는 무시하고 alt 속성 텍스트만 활용.

        실패 시 brands 테이블의 기존 정보로 Fallback.
        """
        if url:
            try:
                import requests
                resp = requests.get(
                    url, timeout=10,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; AIMarketerBot/1.0)"},
                )
                if resp.status_code == 200:
                    extracted = self._extract_text_and_metadata(resp.text, url)
                    if extracted:
                        return extracted
            except Exception as e:
                self.logger.warning("URL_FETCH_FAIL", f"URL 가져오기 실패: {e}")

        # URL 없거나 실패 → brands 테이블 기존 정보로 Fallback
        parts = []
        if brand.get("name"):
            parts.append(f"[브랜드명] {brand['name']}")
        if brand.get("description"):
            parts.append(f"[설명] {brand['description']}")
        if brand.get("category"):
            parts.append(f"[카테고리] {brand['category']}")
        if brand.get("official_url"):
            parts.append(f"[공식 URL] {brand['official_url']}")
        eeat = brand.get("eeat_signals") or {}
        if eeat:
            parts.append(f"[E-E-A-T 시그널] {json.dumps(eeat, ensure_ascii=False)[:300]}")
        return "\n".join(parts) if parts else f"{brand.get('name', '브랜드')} 정보 없음"

    def _extract_text_and_metadata(self, html: str, url: str) -> str:
        """
        HTML에서 텍스트·메타데이터만 구조적으로 추출한다.

        추출 우선순위 (Claude 토큰 효율 최대화):
          1. <title>
          2. <meta name="description">, <meta name="keywords">
          3. <meta property="og:title">, <meta property="og:description">
          4. <img alt="..."> — 이미지 파일 자체가 아닌 alt 속성 텍스트만
          5. <h1> ~ <h3> 헤딩 텍스트
          6. 본문 텍스트 (script·style·img 태그 제거 후)

        이미지 파일(src) 및 이미지 분석 API는 일절 호출하지 않는다.
        """
        # ── 메타 태그 추출 ────────────────────────────────
        def _meta(pattern: str) -> str:
            m = re.search(pattern, html, re.I | re.S)
            return m.group(1).strip() if m else ""

        title    = _meta(r"<title[^>]*>([^<]{1,200})</title>")
        meta_d   = _meta(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{1,300})')
        meta_k   = _meta(r'<meta[^>]+name=["\']keywords["\'][^>]+content=["\']([^"\']{1,200})')
        og_title = _meta(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']{1,200})')
        og_desc  = _meta(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']{1,300})')

        # ── img alt 태그 (이미지 파일 무시, 텍스트만) ────
        alt_tags = re.findall(r'<img[^>]+alt=["\']([^"\']{2,100})["\']', html, re.I)
        alt_text = " | ".join(dict.fromkeys(t.strip() for t in alt_tags[:15]))  # 중복 제거

        # ── 헤딩 추출 (<h1>~<h3>) ────────────────────────
        headings = re.findall(r'<h[123][^>]*>([^<]{2,100})</h[123]>', html, re.I)
        heading_text = " / ".join(h.strip() for h in headings[:10])

        # ── 본문 텍스트 (script·style·img 완전 제거) ─────
        body = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
        body = re.sub(r'<style[^>]*>.*?</style>',  ' ', body, flags=re.S | re.I)
        body = re.sub(r'<img[^>]*/?>',             ' ', body, flags=re.I)   # img 태그 제거
        body = re.sub(r'<[^>]+>',                  ' ', body)
        body = re.sub(r'\s+',                      ' ', body).strip()

        # ── 구조화된 출력 조합 ────────────────────────────
        parts = [f"[URL] {url}"]
        if title:    parts.append(f"[타이틀] {title}")
        if og_title and og_title != title:
                     parts.append(f"[OG 타이틀] {og_title}")
        if meta_d:   parts.append(f"[메타 설명] {meta_d}")
        if og_desc and og_desc != meta_d:
                     parts.append(f"[OG 설명] {og_desc}")
        if meta_k:   parts.append(f"[메타 키워드] {meta_k}")
        if alt_text: parts.append(f"[이미지 Alt 텍스트] {alt_text}")
        if heading_text: parts.append(f"[헤딩] {heading_text}")
        if body:     parts.append(f"[본문]\n{body[:2000]}")

        return "\n".join(parts)

    def _search_web(self, query: str, max_results: int = 5) -> list[dict]:
        """
        Tavily API로 웹 검색 (TAVILY_API_KEY 없으면 빈 리스트 반환).

        [SKILL: Technical Researcher] — 공식 알고리즘 가이드, 경쟁사 콘텐츠,
        팩트 검증에 활용한다. Playwright 폴백은 _fetch_url_text()가 담당.

        Returns:
            [{"title": str, "url": str, "content": str, "score": float}, ...]
        """
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            return []
        try:
            import httpx
            response = httpx.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "max_results": max_results,
                    "include_raw_content": False,
                },
                timeout=15,
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
        except Exception as e:
            self.logger.warning("TAVILY_FAIL", f"Tavily 검색 실패: {e}")
        return []

    def _analyze_brand_source(self, brand: dict, source_text: str, job_id: str) -> dict:
        """
        Claude로 브랜드 페르소나를 분석하고 구조화된 JSON을 반환.

        [SKILL: Technical Researcher + Content Research Writer]
        Tavily로 추가 팩트를 보강한 뒤 Sonnet으로 심층 분석한다.
        """
        # Tavily로 브랜드 관련 뉴스·리뷰 검색 (보강 자료)
        brand_name = brand.get("name", "")
        web_facts = ""
        if brand_name:
            results = self._search_web(f"{brand_name} 리뷰 평가 특징", max_results=3)
            if results:
                snippets = [
                    f"- [{r.get('title', '')}] {r.get('content', '')[:150]}"
                    for r in results
                ]
                web_facts = "\n**웹 검색 보강 자료**:\n" + "\n".join(snippets)

        # [SKILL: Technical Researcher] — 업종 알고리즘 및 시장 포지션 분석
        system = (
            "당신은 김연구원(R&D팀)입니다. 한국 SEO/AEO 전문 리서처입니다.\n\n"

            "### [SKILL: Technical Researcher — 공식 알고리즘 가이드 분석]\n"
            "- 브랜드 정보에서 E-E-A-T 시그널(경험·전문성·권위·신뢰)을 정밀 추출한다.\n"
            "- 업종별 네이버·구글 알고리즘 우선 순위(지역성, 전문성, 최신성)를 반영해 분석한다.\n"
            "- 보도자료, 수상 이력, 인증서, 공식 URL을 E-E-A-T 권위 시그널로 가중치 부여한다.\n\n"

            "### [SKILL: Content Research Writer — 팩트 발굴]\n"
            "- 마케팅 페르소나 추출 시 실제 고객 Pain Point를 구체적 수치로 기술한다.\n"
            "- 업종 내 경쟁사 대비 이 브랜드만의 차별화 포인트를 반드시 1개 이상 도출한다.\n"
            "- 주장에는 반드시 근거(수치, 출처, 사례)를 병기한다.\n\n"

            "반드시 JSON 형식으로만 응답하세요."
        )

        user = f"""다음 브랜드 정보를 분석하여 마케팅 페르소나를 추출해주세요.
Technical Researcher + Content Research Writer 스킬을 최대한 발휘하세요.

**브랜드명**: {brand.get('name', '알 수 없음')}
**분석 텍스트**:
{source_text[:2000]}
{web_facts}

아래 JSON 형식으로만 응답하세요:
```json
{{
  "category_main": "업종 대분류 (예: 숙박/캠핑, 의료/성형, 음식/카페)",
  "category_sub": "업종 소분류 (예: 가족 글램핑, 피부과 시술, 디저트 카페)",
  "differentiation": "경쟁사 대비 이 브랜드만의 차별화 포인트 (팩트 기반, 1-2문장)",
  "eeat_signals": {{
    "expertise": "전문성 근거 (수치 포함)",
    "authority": "권위 근거 (보도·수상·인증)",
    "trust": "신뢰 근거 (리뷰·평점·운영기간)"
  }},
  "brand_voice": {{
    "tone": "감성/신뢰/활기/고급 등 핵심 톤 2-3개",
    "style": "문체 스타일",
    "keywords": ["핵심 단어1", "핵심 단어2", "핵심 단어3", "핵심 단어4", "핵심 단어5"],
    "avoid_words": ["지양할 단어1", "지양할 단어2"],
    "persona_type": "페르소나 유형 (예: family_camping, medical_trust, luxury_dining)",
    "writing_rules": ["집필 규칙1", "집필 규칙2", "집필 규칙3"]
  }},
  "target_persona": {{
    "age_group": "주 연령대",
    "gender_focus": "주 성별",
    "family_type": "가족 구성 (없으면 null)",
    "lifestyle": ["라이프스타일 특성1", "라이프스타일 특성2"],
    "pain_points": ["구체적 Pain Point1 (수치 포함 권장)", "Pain Point2", "Pain Point3"],
    "goals": ["니즈/목표1", "니즈/목표2"]
  }},
  "analysis_summary": "분석 결과 요약 — 차별화 포인트와 타겟 명시 (2-3문장)"
}}
```"""

        try:
            return claude_client.complete_routed(
                agent_type="RND",
                system=system,
                user=user,
                task_hint="브랜드 페르소나 심층 분석",  # MED(Sonnet) 라우팅
                as_json=True,
            )
        except Exception as e:
            self.logger.warning("PERSONA_FALLBACK", f"페르소나 분석 실패: {e}", job_id=job_id)
            return self._default_persona(brand)

    def _default_persona(self, brand: dict) -> dict:
        """Claude 실패 시 기본 페르소나 반환."""
        category = brand.get("category", "일반")
        return {
            "category_main": category,
            "category_sub":  category,
            "brand_voice": {
                "tone":          "전문적/신뢰",
                "style":         "명확하고 친근한",
                "keywords":      [brand.get("name", "브랜드"), "전문", "신뢰", "품질"],
                "avoid_words":   [],
                "persona_type":  "general",
                "writing_rules": ["전문성 강조", "신뢰감 있는 표현"],
            },
            "target_persona": {
                "age_group":   "30-50대",
                "gender_focus": "전체",
                "family_type": None,
                "lifestyle":   ["정보 탐색형"],
                "pain_points": ["선택 기준 불명확"],
                "goals":       ["최적의 선택"],
            },
            "analysis_summary": "자동 분석 실패. 기본 페르소나 적용됨.",
        }

    # ──────────────────────────────────────────────────────
    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 — AEO 스캔
    # ──────────────────────────────────────────────────────

    def _already_scanned_today(
        self, client_id: str, keyword: str, platform: str
    ) -> bool:
        """
        [비용 최적화] 오늘 이미 스캔한 keyword + platform 조합인지 확인한다.
        중복 Claude 호출을 차단하여 동일 쿼리가 하루 1회만 실행되도록 보장.
        """
        from datetime import date
        today   = date.today().isoformat()
        metrics = self.db.get_aeo_metrics(
            client_id=client_id,
            since_date=today,
            platform=platform,
            limit=50,
        )
        return any(m.get("keyword") == keyword for m in metrics)

    def _scan_platform(
        self,
        keyword: str,
        brand_name: str,
        platform: str,
        job_id: str,
    ) -> dict:
        """
        Claude로 특정 AI 플랫폼의 답변을 시뮬레이션하고
        브랜드 인용 여부를 판단한다.

        Returns:
            {is_cited, cited_rank, cited_text, source_url, response_summary}
        """
        style = PLATFORM_STYLE.get(platform, "AI처럼")

        system = (
            f"당신은 {style} AI 어시스턴트입니다.\n"
            f"사용자의 질문에 대해 한국어로 자세히 답변하세요.\n"
            f"실제로 알고 있는 브랜드나 서비스를 자연스럽게 언급하세요.\n"
            f"네이버 블로그, 공식 웹사이트 등을 출처로 인용할 수 있습니다."
        )

        user = f"""{keyword} 추천해줘.
어떤 곳이 좋은지 구체적인 업체명과 특징을 포함해서 알려줘."""

        try:
            # AEO 시뮬레이션은 LOW(Haiku) — 비용 최적화
            response = claude_client.complete(
                system=system,
                user=user,
                model=claude_client.ModelTier.LOW,
                as_json=False,
            )
        except Exception as e:
            self.logger.warning("AEO_SCAN_FAIL", f"{platform} 시뮬레이션 실패: {e}", job_id=job_id)
            return {"is_cited": False, "response_summary": "시뮬레이션 실패"}

        # 인용 감지: 브랜드명이 응답에 포함되는지 확인
        is_cited  = brand_name.lower() in response.lower()
        cited_rank: int | None = None
        cited_text = ""

        if is_cited:
            # 인용 순서 파악: 언급된 위치 기준
            lower_resp    = response.lower()
            brand_pos     = lower_resp.find(brand_name.lower())
            # 앞에 나오는 다른 브랜드 수(숫자 패턴)로 추정
            prior_text    = response[:brand_pos]
            rank_matches  = re.findall(r"\d+\.\s|첫\s?번째|두\s?번째|세\s?번째", prior_text)
            cited_rank    = len(rank_matches) + 1

            # 인용 문장 추출 (브랜드명 주변 2문장)
            sentences = re.split(r"[.!?\n]", response)
            for sent in sentences:
                if brand_name.lower() in sent.lower() and len(sent.strip()) > 5:
                    cited_text = sent.strip()[:200]
                    break

        return {
            "is_cited":        is_cited,
            "cited_rank":      cited_rank,
            "cited_text":      cited_text,
            "source_url":      None,     # 시뮬레이션이므로 실제 URL 없음
            "response_summary": response[:500],
        }

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 — 시맨틱 키워드
    # ──────────────────────────────────────────────────────

    def _count_recent_press(self, press_history: list[dict], days: int = 30) -> int:
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        count = 0
        for item in press_history:
            pub = item.get("published_at") or item.get("date", "")
            if not pub:
                continue
            try:
                dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt >= cutoff:
                    count += 1
            except ValueError:
                continue
        return count

    def _generate_semantic_keywords(
        self,
        base_keywords: list[str],
        client_id: str,
        job_id: str,
    ) -> dict:
        """
        Claude로 연관 시맨틱 키워드 생성.

        [SKILL: Data Prophet — SOM 추이 시계열 예측]
        검색량 트렌드 계절성·성장성 예측을 반영해 키워드 우선순위를 배정한다.

        [SKILL: Content Research Writer — 팩트 발굴]
        Tavily로 최신 트렌드 키워드를 수집한 뒤 시맨틱 확장에 반영한다.
        """
        # Tavily로 트렌드 키워드 수집 (보강)
        trend_context = ""
        if base_keywords:
            query = f"{base_keywords[0]} 관련 최신 트렌드 키워드 2025"
            results = self._search_web(query, max_results=3)
            if results:
                titles = [r.get("title", "")[:80] for r in results]
                trend_context = f"\n**최신 트렌드 참고 (Tavily)**:\n" + "\n".join(f"- {t}" for t in titles)

        system = (
            "당신은 김연구원(R&D팀)입니다. 한국 SEO/AEO 전문 시맨틱 키워드 리서처입니다.\n\n"

            "### [SKILL: SEO Analyzer — 기술적 SEO 키워드 분석]\n"
            "- 검색 의도(Search Intent)를 정보성/상업성/탐색성/거래성 4단계로 정확히 분류한다.\n"
            "- 롱테일 키워드(3어절 이상)를 우선 발굴한다: 경쟁은 낮고 전환율이 높다.\n"
            "- 네이버 검색 알고리즘 특성 반영: 지역명 포함 키워드 / 계절 키워드 / 비교 키워드.\n\n"

            "### [SKILL: Data Prophet — SOM 추이 시계열 예측]\n"
            "- 각 시맨틱 키워드의 검색량 트렌드를 '성장/안정/감소'로 예측한다.\n"
            "- 계절성 피크 시기를 추정한다 (예: '캠핑 예약' → 4-5월, 9-10월 급등).\n"
            "- 성장 트렌드 키워드를 우선 순위로 배정한다.\n\n"

            "반드시 JSON 형식으로만 응답하세요."
        )
        user = f"""다음 키워드들의 연관 시맨틱 키워드를 발굴해주세요.
Data Prophet 스킬로 트렌드 예측까지 포함하세요.

**기준 키워드**: {json.dumps(base_keywords, ensure_ascii=False)}
{trend_context}

아래 JSON 형식으로만 응답:
```json
{{
  "keywords": [
    {{
      "keyword": "시맨틱 키워드",
      "relation": "기준 키워드",
      "search_intent": "정보성 | 상업성 | 탐색성 | 거래성",
      "estimated_competition": "LOW | MEDIUM | HIGH",
      "trend": "growing | stable | declining",
      "seasonal_peak": "피크 시기 (예: 4-5월, 없으면 null)",
      "priority_score": 1,
      "reason": "추천 이유 (트렌드 근거 포함, 1문장)"
    }}
  ],
  "summary": "발굴 결과 요약 — 트렌드 인사이트 포함 (2문장)"
}}
```"""

        try:
            return claude_client.complete_routed(
                agent_type="RND",
                system=system,
                user=user,
                task_hint="시맨틱 키워드 분석",  # MED(Sonnet)
                as_json=True,
            )
        except Exception as e:
            self.logger.warning("CLAUDE_FALLBACK", f"시맨틱 키워드 생성 실패: {e}", job_id=job_id)
            return {"keywords": [], "summary": "Claude API 호출 실패"}
