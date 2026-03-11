"""
cmo_agent.py
전략 총괄 에이전트 (CMO)

역할:
  - AccountManagerAgent로부터 CAMPAIGN_PLAN Job 수신
  - Claude API로 키워드별 콘텐츠 전략 수립
  - blog_score × competition 매트릭스로 계정 배정
  - CONTENT_CREATE Job을 생성해 COPYWRITER에게 위임

처리 흐름:
  CAMPAIGN_PLAN Job 수신
    ↓ _rank_keywords()        Rule-based 키워드 우선순위 정렬
    ↓ _plan_with_claude()     Claude: 키워드별 콘텐츠 방향 수립
    ↓ _assign_accounts()      blog_score × competition 계정 매칭
    ↓ _create_content_jobs()  CONTENT_CREATE Job 생성 → COPYWRITER
"""
import json

from core.base_agent import BaseAgent
from core.account_manager_agent import AccountManagerAgent
from modules import claude_client, slack_client


class CMOAgent(BaseAgent):

    AGENT_TYPE = "CMO"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # 핵심 처리 흐름
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        """
        CAMPAIGN_PLAN Job 처리.

        AccountManagerAgent로부터 받은 payload(kpi_goals, source_config,
        tracking_keywords 등)를 기반으로 캠페인 전략을 수립하고
        COPYWRITER에게 CONTENT_CREATE Job을 생성.
        """
        payload = job.get("input_payload", {})
        client_id = payload.get("client_id")

        # ── 1. 결제 상태 이중 확인 ──────────────────────────────
        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        # ── 2. 최신 고객 컨텍스트 로드 ─────────────────────────
        context = AccountManagerAgent.get_client_context(client_id)
        client   = context["client"]
        keywords = context.get("keywords", [])
        accounts = context.get("accounts", [])

        # payload enriched data 우선, 없으면 context에서 보완
        scope            = payload.get("scope")           or context.get("scope", {})
        brand_guidelines = payload.get("brand_guidelines") or context.get("brand_guidelines", "")
        kpi_goals        = payload.get("kpi_goals")       or client.get("kpi_goals", {})
        target_platforms = (
            payload.get("target_platforms")
            or client.get("target_platforms", [])
            or scope.get("platforms", ["NAVER_BLOG"])
        )
        campaign_brief = payload.get("campaign_brief")

        self.logger.info(
            "CAMPAIGN_PLANNING",
            f"{client['company_name']} 캠페인 기획 시작 "
            f"(키워드 {len(keywords)}개, 계정 {len(accounts)}개, "
            f"플랫폼: {target_platforms})",
            job_id=job["id"],
        )

        # ── START 슬랙 메시지 ────────────────────────────────────
        slack_client.send(
            f"🎯 [{client['company_name']}] 캠페인 전략 수립 시작 "
            f"— 키워드 {len(keywords)}개 분석 중...",
            agent_type="CMO",
            channel_type="pipeline",
        )

        # ── 3. 키워드 우선순위 정렬 (Rule-based) ────────────────
        priority_keywords = self._rank_keywords(keywords, scope)

        if not priority_keywords:
            self.logger.warning(
                "NO_KEYWORDS",
                "추적 중인 키워드가 없습니다. CONTENT_CREATE Job 생성 건너뜀.",
                job_id=job["id"],
            )
            return {
                "status": "DONE_NO_KEYWORDS",
                "client_id": client_id,
                "content_jobs_created": 0,
            }

        # keyword_id → 원본 dict (전략 결과와 병합 시 빠른 조회용)
        kw_lookup = {k["id"]: k for k in priority_keywords if k.get("id")}

        # ── 4. 중앙 브레인에서 플랫폼 가이드 로드 ─────────────
        platform_guides = self._load_platform_guides(target_platforms)

        # ── 5. Claude로 콘텐츠 전략 수립 ────────────────────────
        strategy = self._plan_with_claude(
            company_name=client["company_name"],
            brand_guidelines=brand_guidelines,
            kpi_goals=kpi_goals,
            scope=scope,
            keywords=priority_keywords,
            campaign_brief=campaign_brief,
            platform_guides=platform_guides,
            job_id=job["id"],
            client_id=client_id,
        )

        self.logger.success(
            "STRATEGY_PLANNED",
            f"전략 수립 완료: {strategy.get('focus_direction', '')}",
            job_id=job["id"],
            metadata={"keywords_planned": len(strategy.get("keywords", []))},
        )

        # ── 6. 계정 매칭 (blog_score × competition) ─────────────
        assignments = self._assign_accounts(
            strategy_keywords=strategy.get("keywords", []),
            accounts=accounts,
            target_platforms=target_platforms,
            kw_lookup=kw_lookup,
        )

        # ── 7. CONTENT_CREATE Job 생성 → COPYWRITER ─────────────
        content_job_ids = self._create_content_jobs(
            parent_job=job,
            assignments=assignments,
            scope=scope,
            brand_guidelines=brand_guidelines,
            source_type=payload.get("source_type"),
            source_config=payload.get("source_config", {}),
            kpi_goals=kpi_goals,
            client_id=client_id,
            company_name=client["company_name"],
            kw_lookup=kw_lookup,
        )

        self.logger.success(
            "CONTENT_JOBS_CREATED",
            f"COPYWRITER에게 {len(content_job_ids)}개 작업 전달 완료",
            job_id=job["id"],
            metadata={"content_job_ids": content_job_ids},
        )

        # ── 8. 슬랙 보고 (김이사 페르소나) ──────────────────────
        keyword_names = [k.get("keyword", "") for k in priority_keywords]
        slack_client.send_campaign_report(
            company_name=client["company_name"],
            strategy_summary=strategy.get("summary", ""),
            focus_direction=strategy.get("focus_direction", ""),
            keywords_count=len(priority_keywords),
            content_jobs_count=len(content_job_ids),
            keyword_list=keyword_names,
        )

        return {
            "client_id": client_id,
            "company_name": client["company_name"],
            "strategy_summary": strategy.get("summary", ""),
            "focus_direction": strategy.get("focus_direction", ""),
            "priority_keywords_count": len(priority_keywords),
            "content_jobs_created": len(content_job_ids),
            "content_job_ids": content_job_ids,
        }

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 1: 키워드 우선순위 정렬
    # ──────────────────────────────────────────────────────

    def _rank_keywords(self, keywords: list[dict], scope: dict) -> list[dict]:
        """
        Claude 호출 전 Rule-based 키워드 필터링 및 정렬.

        정렬 기준 (낮은 값 = 우선):
          1. priority ASC          (1=최우선)
          2. competition_score ASC (경쟁 낮을수록 빠른 성과)
          3. monthly_search_total DESC (검색량 높을수록 가치)

        개수 제한 우선순위:
          scope.keyword_count → scope.monthly_content_count → 전체
        """
        def sort_key(k):
            p = k.get("priority") if k.get("priority") is not None else 99
            c = self._competition_score(k.get("competition"))
            s = -(k.get("monthly_search_total") or 0)
            return (p, c, s)

        ranked = sorted(keywords, key=sort_key)
        max_count = (
            scope.get("keyword_count")
            or scope.get("monthly_content_count")
            or len(ranked)
        )
        return ranked[:max_count]

    def _competition_score(self, competition) -> float:
        """
        경쟁 강도를 0.0~1.0으로 정규화.
        낮을수록 공략하기 쉬운 키워드.

        TEXT 형: 'LOW'→0.2, 'MEDIUM'→0.5, 'HIGH'→0.8
        숫자 형: 0~10 스케일 가정 → /10으로 정규화
        """
        if isinstance(competition, str):
            return {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.8}.get(
                competition.upper(), 0.5
            )
        if isinstance(competition, (int, float)):
            return min(float(competition) / 10.0, 1.0)
        return 0.5

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 2: Claude 전략 수립
    # ──────────────────────────────────────────────────────

    def _load_platform_guides(self, target_platforms: list[str]) -> dict:
        """
        중앙 브레인에서 타깃 플랫폼별 AEO/SEO 가이드 로드.
        CMO가 박작가에게 최신 알고리즘 지침을 주입하는 데 사용.
        """
        guides: dict = {}
        for platform in target_platforms:
            for guide_type in ("AEO", "SEO"):
                guide = self.db.get_platform_guide(platform, guide_type)
                if guide:
                    guides[f"{platform}_{guide_type}"] = {
                        "title":       guide.get("title"),
                        "key_signals": guide.get("key_signals", {}),
                    }
        if guides:
            self.logger.info(
                "GUIDES_LOADED",
                f"플랫폼 가이드 {len(guides)}개 로드 완료: {list(guides.keys())}",
            )
        return guides

    def _plan_with_claude(
        self,
        company_name: str,
        brand_guidelines: str,
        kpi_goals: dict,
        scope: dict,
        keywords: list[dict],
        campaign_brief: dict | None,
        platform_guides: dict,
        job_id: str,
        client_id: str | None = None,
    ) -> dict:
        """
        Claude API로 키워드별 콘텐츠 전략 수립.
        OMC 라우팅: 키워드 5개 이상이면 HIGH(Opus) 승격.
        API 실패 또는 JSON 파싱 실패 시 rule-based fallback 반환.
        """
        # ── [SKILL: Product Strategist + Competitive-Ads-Extractor + Writing Plans] ──
        system = (
            "당신은 김이사(전략총괄 CMO)입니다. 대한민국 최고 수준의 디지털 마케팅 전략가입니다.\n\n"

            "## 역할: Content Marketer (Enterprise Grade)\n\n"

            "### [SKILL: Product Strategist — 시장 포지셔닝]\n"
            "- STP 프레임워크(Segmentation → Targeting → Positioning)를 적용해 "
            "브랜드를 검색 시장에 정확히 위치시킨다.\n"
            "- 경쟁사 대비 차별화 포인트(USP)를 반드시 도출한다.\n"
            "- '우리가 이길 수 있는 세그먼트'를 키워드 데이터로 특정한다: "
            "competition=LOW이면서 monthly_search_total 상위인 키워드를 블루오션으로 분류한다.\n\n"

            "### [SKILL: Competitive-Ads-Extractor — 경쟁사 빈틈 분석]\n"
            "- competition=LOW/MEDIUM & 검색량 높은 키워드 = 즉시 공략 (단기 전략).\n"
            "- competition=HIGH 키워드 = E-E-A-T 강화 병행, 중장기 배치.\n"
            "- 같은 카테고리 경쟁사가 아직 커버하지 않은 롱테일/서브 키워드를 "
            "콘텐츠 각도(content_angle)에 반영한다.\n"
            "- 경쟁사가 쓰는 일반적 제목 패턴을 피하고, 더 구체적이고 독창적인 각도를 제시한다.\n\n"

            "### [SKILL: Writing Plans — 실행 가능한 로드맵 기획]\n"
            "- 각 키워드별로 '제목 → 관점 → 핵심 포인트 → 기대 KPI'를 명시한 실행 계획서를 작성한다.\n"
            "- 단기(1-2주): competition LOW 키워드 우선 발행 → 빠른 상위노출 확보.\n"
            "- 중기(1-2개월): competition HIGH 키워드 + E-E-A-T 강화 병행.\n"
            "- 각 콘텐츠의 목표(네이버 상위노출 / AEO 인용 / 브랜드 신뢰도)를 명시한다.\n\n"

            "### [SKILL: Keyword Priority Scoring — 우선순위 스코어링]\n"
            "키워드 우선순위 점수 계산 공식:\n"
            "  priority_score = (search_volume_pc + search_volume_mo) × 0.3\n"
            "                 + (100 - competition_index) × 0.3\n"
            "                 + brand_relevance × 0.2\n"
            "                 + rank_bonus × 0.2\n"
            "  (rank_bonus = current_rank이 1~10위면 양수, 없거나 100위 밖이면 0)\n"
            "  전략 수립 시 이 공식에 따라 키워드 우선순위를 재평가하고 반영한다.\n\n"

            "### [SKILL: Feedback Loop — 성과 피드백 기준]\n"
            "- 특정 키워드가 3일 연속 5위 이상 하락하면 '리라이팅 캠페인'을 제안한다.\n"
            "- 제안 포함 내용: 해당 키워드, 하락 추이, 경쟁사 변화, 리라이팅 방향.\n\n"

            "### [SKILL: Weekly KPI Review — 주간 KPI 보고 포맷]\n"
            "주간 보고서에는 반드시 다음 항목을 포함한다:\n"
            "  1. 상위 5위 이내 키워드 수 (목표 대비 달성율)\n"
            "  2. 평균 순위 변동 (전주 대비 ± 몇 위)\n"
            "  3. 신규 발행 건수 및 QC 통과율\n"
            "  4. 추천 액션 3가지 (키워드 조정 / 리라이팅 / 신규 공략)\n\n"

            "반드시 JSON 형식으로만 응답하고, 설명 텍스트는 절대 포함하지 마세요."
        )

        # ── 진화 지식 주입 (과거 성과 데이터 기반 전략 보강) ────
        ek_records = self.db.get_active_knowledge(agent_type="CMO", client_id=client_id, limit=5)
        if ek_records:
            ek_lines = []
            for r in ek_records:
                verdict = "✅확정" if r.get("verdict") == "confirmed" else "🔄검토중"
                ek_lines.append(f"- [{verdict}] {r.get('hypothesis', '')}")
                if r.get("outcome"):
                    ek_lines.append(f"  → 결과: {r['outcome']}")
            system += (
                "\n\n### [진화 지식] 과거 성과 데이터 기반 전략 패턴\n"
                + "\n".join(ek_lines)
                + "\n위 패턴을 전략 수립에 적극 반영하여 검증된 방향을 우선 추천하라."
            )

        # 복잡도에 따른 task_hint (OMC 라우팅 — 5개 이상 키워드면 경쟁사 분석 포함)
        task_hint = (
            "경쟁사 분석 포함 복잡한 전략 수립"
            if len(keywords) >= 5
            else "캠페인 전략 수립"
        )

        kw_list = [
            {
                "keyword_id": k.get("id"),
                "keyword": k.get("keyword"),
                "sub_keyword": k.get("sub_keyword"),
                "monthly_search_total": k.get("monthly_search_total"),
                "competition": k.get("competition"),
                "priority": k.get("priority"),
            }
            for k in keywords
        ]

        # 블루오션 vs 레드오션 자동 분류
        blue_ocean = [k for k in kw_list if str(k.get("competition", "")).upper() in ("LOW", "MEDIUM")]
        red_ocean   = [k for k in kw_list if str(k.get("competition", "")).upper() == "HIGH"]

        user = f"""## 캠페인 전략 수립 요청 (Enterprise Grade)

**고객사**: {company_name}

**브랜드 가이드라인**: {brand_guidelines or "별도 가이드라인 없음. 전문적이고 신뢰감 있는 톤으로 작성."}

**KPI 목표**:
{json.dumps(kpi_goals, ensure_ascii=False, indent=2) if kpi_goals else "미설정 (기본: 네이버 상위노출 + AEO 인용율 30% 이상)"}

**계약 범위**:
- 월 발행 콘텐츠 수: {scope.get("monthly_content_count", 10)}개
- 타깃 플랫폼: {scope.get("platforms", ["NAVER_BLOG"])}
- 리포트 포함: {scope.get("include_report", True)}

**플랫폼 알고리즘 핵심 지침** (박작가에게 주입):
{json.dumps(platform_guides, ensure_ascii=False, indent=2) if platform_guides else "기본 SEO 원칙 적용"}

**사전 준비된 캠페인 방향** (반드시 반영):
{json.dumps(campaign_brief, ensure_ascii=False, indent=2) if campaign_brief else "없음"}

**공략 키워드 — 블루오션({len(blue_ocean)}개) + 레드오션({len(red_ocean)}개)**:
{json.dumps(kw_list, ensure_ascii=False, indent=2)}

---
## 요청사항

위 키워드에 대해 Product Strategist + Competitive-Ads-Extractor + Writing Plans 스킬을 적용해
엔터프라이즈급 캠페인 전략을 수립하세요.

블루오션({len(blue_ocean)}개)은 단기 공략(1-2주 우선 발행),
레드오션({len(red_ocean)}개)은 중기 E-E-A-T 강화 전략과 함께 배치하세요.

아래 JSON 형식으로만 응답하세요:

```json
{{
  "summary": "이번 캠페인 전략 요약 (3-4문장, STP 포지셔닝 포함)",
  "focus_direction": "핵심 방향 한 줄 (경쟁사 빈틈 기반)",
  "competitive_insight": "경쟁사가 놓친 기회 영역 (1-2문장)",
  "timeline": {{
    "short_term": "1-2주 발행 키워드 및 목표",
    "mid_term": "1-2개월 발행 키워드 및 목표"
  }},
  "keywords": [
    {{
      "keyword_id": "입력된 keyword_id 그대로",
      "keyword": "키워드 텍스트",
      "competition": "입력된 competition 값 그대로",
      "segment": "blue_ocean | red_ocean",
      "phase": "short_term | mid_term",
      "content_title": "경쟁사와 차별화된 클릭율 높은 제목 (구체적)",
      "content_angle": "경쟁사가 다루지 않는 독창적 관점 (1-2문장)",
      "key_points": ["반드시 포함할 핵심 포인트 (3-5개)"],
      "target_kpi": "이 콘텐츠의 목표 (예: 네이버 3위권 / AEO 인용)",
      "target_length": 1500
    }}
  ]
}}
```"""

        try:
            return claude_client.complete_routed(
                agent_type="CMO",
                system=system,
                user=user,
                task_hint=task_hint,
                as_json=True,
            )
        except Exception as e:
            self.logger.warning(
                "CLAUDE_FALLBACK",
                f"Claude API 호출 실패, 기본 전략으로 대체: {e}",
                job_id=job_id,
            )
            return self._fallback_strategy(keywords, company_name)

    def _fallback_strategy(self, keywords: list[dict], company_name: str) -> dict:
        """
        Claude API 실패 시 rule-based 기본 전략.
        서비스는 중단되지 않고 기본 콘텐츠 방향으로 계속 진행.
        """
        return {
            "summary": (
                f"{company_name}의 검색량 기반 콘텐츠 발행 전략. "
                "경쟁 강도가 낮은 키워드를 우선 공략하여 초기 상위노출을 확보합니다."
            ),
            "focus_direction": "검색량 상위·경쟁 낮은 키워드 우선 공략",
            "keywords": [
                {
                    "keyword_id": k.get("id"),
                    "keyword": k.get("keyword"),
                    "competition": k.get("competition"),
                    "content_title": f"{k.get('keyword')} 완벽 가이드 | 핵심 정보 총정리",
                    "content_angle": (
                        f"{k.get('keyword')}에 대한 정확하고 실용적인 정보를 "
                        "사용자 관점에서 구체적으로 제공"
                    ),
                    "key_points": [
                        f"{k.get('keyword')} 개요 및 특징",
                        "선택 시 반드시 확인할 기준",
                        "추천 옵션 비교",
                        "실제 이용 팁",
                    ],
                    "target_length": 1500,
                }
                for k in keywords
            ],
        }

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 3: 계정 매칭 (blog_score × competition 매트릭스)
    # ──────────────────────────────────────────────────────

    def _assign_accounts(
        self,
        strategy_keywords: list[dict],
        accounts: list[dict],
        target_platforms: list[str],
        kw_lookup: dict,
    ) -> list[dict]:
        """
        키워드별 최적 블로그 계정 배정.

        매트릭스 규칙:
          HIGH (≥0.7) : blog_score 최상위 계정 → 공신력으로 강한 경쟁 돌파
          MEDIUM (≥0.4): 상위 50% 계정 라운드로빈 → 안정적 분산
          LOW  (<0.4)  : 전체 계정 라운드로빈 → 기회 분산으로 자연스럽게

        계정 없음: account=None 반환 (OPS 에이전트가 나중에 배정 가능)
        """
        if not accounts:
            return [
                {
                    **kw,
                    "account": None,
                    "platform": target_platforms[0] if target_platforms else "NAVER_BLOG",
                }
                for kw in strategy_keywords
            ]

        # 플랫폼별 계정 그룹 (blog_score 내림차순 정렬)
        platform_accs: dict[str, list[dict]] = {}
        for acc in accounts:
            plat = acc.get("platform", "NAVER_BLOG")
            platform_accs.setdefault(plat, []).append(acc)
        for plat in platform_accs:
            platform_accs[plat].sort(
                key=lambda a: a.get("blog_score") or 0, reverse=True
            )

        rr: dict[str, int] = {}  # 플랫폼별 라운드로빈 인덱스
        assignments = []

        for kw_strategy in strategy_keywords:
            # 원본 키워드에서 competition 보완 (Claude 누락 대비)
            kw_id    = kw_strategy.get("keyword_id")
            original = kw_lookup.get(kw_id, {})
            competition = (
                kw_strategy.get("competition")
                or original.get("competition")
                or "MEDIUM"
            )
            score = self._competition_score(competition)

            # target_platforms 순서대로 매칭 가능한 플랫폼 탐색
            platform = None
            avail: list[dict] = []
            for plat in target_platforms:
                if plat in platform_accs:
                    platform = plat
                    avail = platform_accs[plat]
                    break

            if not avail:
                # target_platforms와 계정 플랫폼 불일치 → 전체 계정 사용
                avail    = accounts
                platform = target_platforms[0] if target_platforms else "NAVER_BLOG"

            # blog_score × competition 계정 선택
            if score >= 0.7:
                # HIGH: 최고 blog_score 1순위 계정
                account = avail[0]
            elif score >= 0.4:
                # MEDIUM: 상위 50% 라운드로빈
                pool    = avail[:max(1, len(avail) // 2)]
                idx     = rr.get(platform, 0) % len(pool)
                account = pool[idx]
                rr[platform] = idx + 1
            else:
                # LOW: 전체 라운드로빈
                idx     = rr.get(platform, 0) % len(avail)
                account = avail[idx]
                rr[platform] = idx + 1

            assignments.append({**kw_strategy, "account": account, "platform": platform})

        return assignments

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼 4: CONTENT_CREATE Job 생성
    # ──────────────────────────────────────────────────────

    def _create_content_jobs(
        self,
        parent_job: dict,
        assignments: list[dict],
        scope: dict,
        brand_guidelines: str,
        source_type: str | None,
        source_config: dict,
        kpi_goals: dict,
        client_id: str,
        company_name: str,
        kw_lookup: dict,
    ) -> list[str]:
        """
        키워드 × 플랫폼별 CONTENT_CREATE Job 생성.
        scope.monthly_content_count 한도를 초과하지 않음.
        """
        max_jobs = scope.get("monthly_content_count") or 10
        created_ids: list[str] = []

        for item in assignments[:max_jobs]:
            account  = item.get("account")
            platform = item.get("platform", "NAVER_BLOG")
            kw_id    = item.get("keyword_id")
            original = kw_lookup.get(kw_id, {})  # sub_keyword 등 원본 보완

            content_payload = {
                # ── 고객 정보 ───────────────────────────────
                "client_id":   client_id,
                "company_name": company_name,

                # ── 키워드 (원본 + 전략 병합) ────────────────
                "keyword_id":             kw_id,
                "keyword":                item.get("keyword"),
                "sub_keyword":            original.get("sub_keyword"),
                "monthly_search_total":   original.get("monthly_search_total"),
                "competition":            item.get("competition"),

                # ── 플랫폼 및 계정 ───────────────────────────
                "platform":    platform,
                "account_id":  account["id"]          if account else None,
                "account_name": account["name"]       if account else None,
                "blog_score":  account.get("blog_score") if account else None,

                # ── CMO가 수립한 콘텐츠 전략 ─────────────────
                "content_title":  item.get("content_title"),
                "content_angle":  item.get("content_angle"),
                "key_points":     item.get("key_points", []),
                "target_length":  item.get("target_length", 1500),

                # ── 브랜드 및 소스 정보 ──────────────────────
                "brand_guidelines": brand_guidelines,
                "source_type":      source_type,
                "source_config":    source_config,

                # ── KPI 참고 (COPYWRITER가 성과 기준 인지) ───
                "kpi_goals": kpi_goals,
            }

            child_job = self.create_child_job(
                parent_job=parent_job,
                job_type="CONTENT_CREATE",
                assigned_agent="COPYWRITER",
                title=f"[콘텐츠 작성] {item.get('keyword', '')} ({platform})",
                input_payload=content_payload,
            )

            if child_job:
                created_ids.append(child_job["id"])
                self.logger.info(
                    "CONTENT_JOB_QUEUED",
                    f"'{item.get('keyword')}' → COPYWRITER ({platform})"
                    + (f", 계정: {account['name']}" if account else ", 계정: 미배정"),
                    job_id=parent_job["id"],
                    metadata={
                        "keyword":  item.get("keyword"),
                        "platform": platform,
                        "account":  account["name"] if account else None,
                    },
                )

        return created_ids
