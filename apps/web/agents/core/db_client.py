"""
db_client.py
Supabase 연결 싱글톤.
에이전트가 DB를 조작할 때 이 클래스를 통해서만 접근한다.
SERVICE_KEY를 사용해 RLS를 우회하고 전체 데이터에 접근 가능.
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


class DBClient:
    """
    Supabase 연결 싱글톤.
    에이전트 전체에서 하나의 인스턴스만 유지한다.
    """
    _instance: "DBClient | None" = None
    _client: Client | None = None

    def __new__(cls) -> "DBClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connect()
        return cls._instance

    def _connect(self) -> None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")

        if not url or not key:
            raise EnvironmentError(
                "SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경 변수가 설정되지 않았습니다. "
                "agents/.env 파일을 확인하세요."
            )

        self._client = create_client(url, key)

    @property
    def client(self) -> Client:
        return self._client

    # ──────────────────────────────────────────
    # Jobs
    # ──────────────────────────────────────────

    def get_pending_jobs(self, agent_type: str) -> list[dict]:
        """특정 에이전트에 배정된 PENDING 상태 Job 목록 반환 (생성순)."""
        result = (
            self._client.table("jobs")
            .select("*")
            .eq("assigned_agent", agent_type)
            .eq("status", "PENDING")
            .order("created_at")
            .execute()
        )
        return result.data or []

    def get_job(self, job_id: str) -> dict | None:
        """Job ID로 단일 Job 조회."""
        result = (
            self._client.table("jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        return result.data

    def update_job(self, job_id: str, updates: dict) -> dict | None:
        """Job 필드 업데이트. 변경된 레코드를 반환."""
        result = (
            self._client.table("jobs")
            .update(updates)
            .eq("id", job_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def create_job(self, job_data: dict) -> dict | None:
        """새 Job 생성. 생성된 레코드를 반환."""
        result = (
            self._client.table("jobs")
            .insert(job_data)
            .execute()
        )
        return result.data[0] if result.data else None

    # ──────────────────────────────────────────
    # Agent Logs
    # ──────────────────────────────────────────

    def insert_agent_log(self, log_data: dict) -> None:
        """agent_logs 테이블에 로그 기록. 실패해도 에이전트 동작에 영향 없음."""
        try:
            self._client.table("agent_logs").insert(log_data).execute()
        except Exception as e:
            # 로그 실패는 조용히 처리 (무한 루프 방지)
            print(f"[DB_CLIENT] agent_logs 기록 실패: {e}")

    # ──────────────────────────────────────────
    # Clients / Keywords / Contents / SERP
    # ──────────────────────────────────────────

    def get_client(self, client_id: str) -> dict | None:
        result = (
            self._client.table("clients")
            .select("*")
            .eq("id", client_id)
            .single()
            .execute()
        )
        return result.data

    def get_tracking_keywords(self, client_id: str | None = None) -> list[dict]:
        """추적 중인 키워드 목록. client_id 없으면 전체 반환."""
        query = (
            self._client.table("keywords")
            .select("*, contents(*)")
            .eq("is_tracking", True)
        )
        if client_id:
            query = query.eq("client_id", client_id)
        result = query.execute()
        return result.data or []

    # ──────────────────────────────────────────
    # AEO Metrics (006: AI 모델 인용 추적)
    # ──────────────────────────────────────────

    def insert_aeo_metric(self, metric_data: dict) -> dict | None:
        """
        AI 모델 인용 스캔 결과 저장.
        metric_data 필수 키: client_id, keyword, platform
        선택 키: brand_id, is_cited, cited_rank, cited_text,
                 source_url, response_summary, job_id, workspace_id
        """
        result = (
            self._client.table("aeo_metrics")
            .insert(metric_data)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_aeo_metrics(
        self,
        client_id: str,
        since_date: str | None = None,
        platform: str | None = None,
        cited_only: bool = False,
        limit: int = 200,
    ) -> list[dict]:
        """
        AEO 인용 스캔 결과 조회.

        Args:
            since_date : 'YYYY-MM-DD' 형식 (이 날짜 이후)
            platform   : 특정 플랫폼 필터
            cited_only : True면 is_cited=True인 것만
        """
        query = (
            self._client.table("aeo_metrics")
            .select("*")
            .eq("client_id", client_id)
            .order("scanned_at", desc=True)
            .limit(limit)
        )
        if since_date:
            query = query.gte("scanned_at", since_date)
        if platform:
            query = query.eq("platform", platform)
        if cited_only:
            query = query.eq("is_cited", True)
        result = query.execute()
        return result.data or []

    def upsert_som_report(self, report_data: dict) -> dict | None:
        """
        주간 SOM 리포트 저장/업데이트.
        UNIQUE: (client_id, brand_id, report_week)
        """
        result = (
            self._client.table("som_reports")
            .upsert(report_data, on_conflict="client_id,brand_id,report_week")
            .execute()
        )
        return result.data[0] if result.data else None

    def get_weekly_aeo_summary(
        self,
        client_id: str,
        week_start: str,    # 'YYYY-MM-DD' (월요일)
        week_end: str,      # 'YYYY-MM-DD' (일요일)
    ) -> dict:
        """
        특정 주간의 AEO 스캔 결과를 집계.
        Returns: {total, cited, rate, by_platform, by_keyword, top_citations}
        """
        metrics = self.get_aeo_metrics(client_id, since_date=week_start, limit=1000)
        metrics = [m for m in metrics if m.get("scanned_at", "") <= week_end]

        total = len(metrics)
        cited = [m for m in metrics if m.get("is_cited")]
        rate  = round(len(cited) / total * 100, 1) if total else 0.0

        by_platform: dict[str, dict] = {}
        by_keyword:  dict[str, dict] = {}

        for m in metrics:
            p = m.get("platform", "UNKNOWN")
            k = m.get("keyword", "")
            by_platform.setdefault(p, {"total": 0, "cited": 0})
            by_keyword.setdefault(k, {"total": 0, "cited": 0})
            by_platform[p]["total"] += 1
            by_keyword[k]["total"]  += 1
            if m.get("is_cited"):
                by_platform[p]["cited"] += 1
                by_keyword[k]["cited"]  += 1

        top_platform = max(by_platform, key=lambda p: by_platform[p]["cited"], default=None)
        top_keyword  = max(by_keyword,  key=lambda k: by_keyword[k]["cited"],  default=None)

        return {
            "total":        total,
            "cited":        len(cited),
            "rate":         rate,
            "by_platform":  by_platform,
            "by_keyword":   by_keyword,
            "top_platform": top_platform,
            "top_keyword":  top_keyword,
            "top_citations": [
                {"keyword": m["keyword"], "platform": m["platform"],
                 "rank": m.get("cited_rank"), "text": m.get("cited_text", "")[:100]}
                for m in cited[:5]
            ],
        }

    def create_content(self, content_data: dict) -> dict | None:
        """
        에이전트가 생성한 콘텐츠 저장.
        keyword_id 필수 (NOT NULL). 저장 실패 시 None 반환.
        """
        try:
            result = (
                self._client.table("contents")
                .insert(content_data)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB_CLIENT] contents 저장 실패: {e}")
            return None

    def get_content(self, content_id: str) -> dict | None:
        """content_id로 contents 레코드 단건 조회."""
        result = (
            self._client.table("contents")
            .select("*")
            .eq("id", content_id)
            .single()
            .execute()
        )
        return result.data

    def update_content(self, content_id: str, updates: dict) -> dict | None:
        """contents 레코드 업데이트. 변경된 레코드 반환."""
        result = (
            self._client.table("contents")
            .update(updates)
            .eq("id", content_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_active_contents(self, keyword_id: str | None = None) -> list[dict]:
        """순위 추적 중인 콘텐츠 목록."""
        query = (
            self._client.table("contents")
            .select("*, keywords(keyword, sub_keyword), accounts(name, url, fixed_ip)")
            .eq("is_active", True)
        )
        if keyword_id:
            query = query.eq("keyword_id", keyword_id)
        result = query.execute()
        return result.data or []

    def upsert_serp_result(self, serp_data: dict) -> dict | None:
        """
        SERP 결과 저장 (중복 날짜면 업데이트).
        unique 제약: (content_id, device, search_platform, captured_at)
        """
        result = (
            self._client.table("serp_results")
            .upsert(serp_data, on_conflict="content_id,device,search_platform,captured_at")
            .execute()
        )
        return result.data[0] if result.data else None

    def get_settings(self, key: str) -> dict | None:
        """settings 테이블에서 설정값 조회."""
        result = (
            self._client.table("settings")
            .select("value")
            .eq("key", key)
            .single()
            .execute()
        )
        return result.data["value"] if result.data else None

    def create_report(self, report_data: dict) -> dict | None:
        result = (
            self._client.table("reports")
            .insert(report_data)
            .execute()
        )
        return result.data[0] if result.data else None

    def insert_metric(self, metric_data: dict) -> dict | None:
        result = (
            self._client.table("metrics")
            .upsert(metric_data, on_conflict="content_id,platform,metric_type,date")
            .execute()
        )
        return result.data[0] if result.data else None

    # ──────────────────────────────────────────
    # Subscriptions (고객관리 에이전트 전용)
    # ──────────────────────────────────────────

    def get_active_subscription(self, client_id: str) -> dict | None:
        """고객의 활성 구독 1건 조회. 없으면 None."""
        result = (
            self._client.table("subscriptions")
            .select("*")
            .eq("client_id", client_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_pending_onboard_subscriptions(self) -> list[dict]:
        """
        온보딩이 완료되지 않은 활성 구독 목록 반환.
        조건: status='active' AND onboarding_job_id IS NULL
        AccountManagerAgent가 주기적으로 폴링하는 대상.
        """
        result = (
            self._client.table("subscriptions")
            .select("*, clients(id, company_name, name, source_type, source_config, brand_guidelines)")
            .eq("status", "active")
            .is_("onboarding_job_id", "null")
            .order("created_at")
            .execute()
        )
        return result.data or []

    def update_subscription(self, subscription_id: str, updates: dict) -> dict | None:
        """구독 정보 업데이트 (status 변경, onboarding_job_id 기록 등)."""
        result = (
            self._client.table("subscriptions")
            .update(updates)
            .eq("id", subscription_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_client_context(self, client_id: str) -> dict | None:
        """
        에이전트들이 작업 전 참고하는 고객 전체 컨텍스트.
        - clients: 기본정보 + 소스 설정 + 브랜드 가이드라인
        - subscription: 활성 구독 + 계약 범위(scope)
        - accounts: 연결된 블로그 계정 목록
        - keywords: 추적 중인 키워드 목록

        CMO 에이전트가 캠페인 기획 전 반드시 조회.
        """
        # 1. 고객 기본 정보
        client_result = (
            self._client.table("clients")
            .select("*")
            .eq("id", client_id)
            .single()
            .execute()
        )
        if not client_result.data:
            return None
        client = client_result.data

        # 2. 활성 구독
        subscription = self.get_active_subscription(client_id)

        # 3. 연결된 계정 (blog_accounts — contents.account_id FK 참조 대상)
        accounts_result = (
            self._client.table("blog_accounts")
            .select("id, account_name, platform, blog_url, blog_score, is_active")
            .eq("client_id", client_id)
            .eq("is_active", True)
            .execute()
        )
        # CMO 호환: account_name → name, blog_url → url 매핑
        raw_accounts = accounts_result.data or []
        mapped_accounts = [
            {
                "id": a["id"],
                "name": a.get("account_name", ""),
                "platform": a.get("platform", "naver"),
                "url": a.get("blog_url"),
                "blog_score": a.get("blog_score") or 0,
                "status": "active",
                "fixed_ip": None,
            }
            for a in raw_accounts
        ]
        accounts_result_data = mapped_accounts

        # 4. 추적 중인 키워드
        keywords_result = (
            self._client.table("keywords")
            .select("id, keyword, sub_keyword, monthly_search_total, competition, priority")
            .eq("client_id", client_id)
            .eq("is_tracking", True)
            .order("monthly_search_total", desc=True)
            .execute()
        )

        return {
            "client": client,
            "subscription": subscription,
            "scope": subscription.get("scope", {}) if subscription else {},
            "source_type": client.get("source_type"),
            "source_config": client.get("source_config", {}),
            "brand_guidelines": client.get("brand_guidelines", ""),
            "accounts": accounts_result_data,
            "keywords": keywords_result.data or [],
            "is_billable": subscription is not None and subscription.get("status") == "active",
        }

    def is_client_billable(self, client_id: str) -> bool:
        """
        Job 생성 전 결제 상태 확인.
        active 구독이 있을 때만 True 반환.
        """
        sub = self.get_active_subscription(client_id)
        return sub is not None

    # ──────────────────────────────────────────
    # Client Config (004: 대시보드 설정 관리)
    # ──────────────────────────────────────────

    def get_client_config(self, client_id: str) -> dict | None:
        """
        고객사 운영 설정값 조회.
        대시보드 설정 페이지 및 ANALYST 에이전트가 KPI 목표를 읽을 때 사용.

        반환 필드: id, company_name, source_type, source_config,
                   brand_guidelines, target_platforms, kpi_goals
        """
        result = (
            self._client.table("clients")
            .select(
                "id, company_name, source_type, source_config, "
                "brand_guidelines, target_platforms, kpi_goals"
            )
            .eq("id", client_id)
            .single()
            .execute()
        )
        return result.data

    def update_client_config(self, client_id: str, updates: dict) -> dict | None:
        """
        고객사 설정값 업데이트.
        허용 필드: source_type, source_config, brand_guidelines,
                   target_platforms, kpi_goals

        사용 예 (대시보드 설정 저장):
            db.update_client_config(client_id, {
                "target_platforms": ["NAVER_BLOG", "TISTORY"],
                "kpi_goals": {"monthly_top3_keywords": 5, "avg_rank_target": 10},
            })
        """
        allowed = {
            "source_type", "source_config", "brand_guidelines",
            "target_platforms", "kpi_goals",
        }
        filtered = {k: v for k, v in updates.items() if k in allowed}
        if not filtered:
            return None
        result = (
            self._client.table("clients")
            .update(filtered)
            .eq("id", client_id)
            .execute()
        )
        return result.data[0] if result.data else None

    # ──────────────────────────────────────────
    # Metrics Summary (004: ANALYST + 대시보드)
    # ──────────────────────────────────────────

    def upsert_metrics_summary(self, summary_data: dict) -> dict | None:
        """
        KPI 집계 데이터 저장. 같은 (client_id, metric_key, period, summary_date)면 업데이트.
        ANALYST 에이전트가 SERP 수집 및 리포트 생성 후 호출.

        summary_data 예시:
        {
            "client_id": "uuid",
            "metric_key": "avg_rank",
            "value": 4.2,
            "period": "daily",
            "summary_date": "2026-02-19",
            "metadata": {"keywords": [{"keyword": "글램핑", "rank": 2}]}
        }
        """
        result = (
            self._client.table("metrics_summary")
            .upsert(
                summary_data,
                on_conflict="client_id,metric_key,period,summary_date",
            )
            .execute()
        )
        return result.data[0] if result.data else None

    def get_metrics_summary(
        self,
        client_id: str,
        period: str = "daily",
        start_date: str | None = None,
        end_date: str | None = None,
        metric_keys: list[str] | None = None,
    ) -> list[dict]:
        """
        KPI 집계 데이터 조회. 최신순 정렬.
        ANALYST 에이전트 리포트 및 대시보드 KPI 트렌드 차트에 사용.

        Args:
            client_id:   고객사 ID
            period:      'daily' | 'weekly' | 'monthly'
            start_date:  시작일 'YYYY-MM-DD' (포함)
            end_date:    종료일 'YYYY-MM-DD' (포함)
            metric_keys: 조회할 메트릭 키 목록 (None이면 전체)
        """
        query = (
            self._client.table("metrics_summary")
            .select("*")
            .eq("client_id", client_id)
            .eq("period", period)
            .order("summary_date", desc=True)
        )
        if start_date:
            query = query.gte("summary_date", start_date)
        if end_date:
            query = query.lte("summary_date", end_date)
        if metric_keys:
            query = query.in_("metric_key", metric_keys)
        result = query.execute()
        return result.data or []

    def get_latest_kpi_snapshot(self, client_id: str, period: str = "daily") -> dict:
        """
        고객사의 최신 KPI 스냅샷을 {metric_key: {value, summary_date}} 형태로 반환.
        대시보드 KPI 카드 표시에 최적화.

        반환 예시:
        {
            "avg_rank":          {"value": 4.2,  "summary_date": "2026-02-19"},
            "top3_count":        {"value": 3,    "summary_date": "2026-02-19"},
            "content_published": {"value": 20,   "summary_date": "2026-02-19"},
        }
        """
        result = (
            self._client.table("metrics_summary")
            .select("metric_key, value, value_text, summary_date")
            .eq("client_id", client_id)
            .eq("period", period)
            .order("summary_date", desc=True)
            .limit(100)
            .execute()
        )
        snapshot: dict = {}
        seen: set = set()
        for row in (result.data or []):
            key = row["metric_key"]
            if key not in seen:
                snapshot[key] = {
                    "value": row["value"],
                    "value_text": row.get("value_text"),
                    "summary_date": row["summary_date"],
                }
                seen.add(key)
        return snapshot

    # ──────────────────────────────────────────
    # Brands & Relationships (005: 엔티티 관리)
    # ──────────────────────────────────────────

    def get_brand(self, brand_id: str) -> dict | None:
        """브랜드 단건 조회."""
        result = (
            self._client.table("brands")
            .select("*")
            .eq("id", brand_id)
            .single()
            .execute()
        )
        return result.data

    def get_brands_by_client(self, client_id: str) -> list[dict]:
        """고객사에 연결된 브랜드 목록 (E-E-A-T, 보도 히스토리 포함)."""
        result = (
            self._client.table("brands")
            .select("*")
            .eq("client_id", client_id)
            .execute()
        )
        return result.data or []

    def get_platform_brands(self, client_id: str) -> list[dict]:
        """is_platform=TRUE인 플랫폼형 브랜드만 조회."""
        result = (
            self._client.table("brands")
            .select("*")
            .eq("client_id", client_id)
            .eq("is_platform", True)
            .execute()
        )
        return result.data or []

    def get_parent_brand(self, sub_brand_id: str) -> dict | None:
        """
        서브 브랜드(입점업체)의 플랫폼 브랜드(부모) 조회.
        Schema.org isPartOf 관계 생성 시 사용.
        """
        result = (
            self._client.table("brand_relationships")
            .select("platform_brand_id, platform_brand:brands!brand_relationships_platform_brand_id_fkey(id, name, official_url, entity_type)")
            .eq("sub_brand_id", sub_brand_id)
            .limit(1)
            .execute()
        )
        if result.data and result.data[0].get("platform_brand"):
            return result.data[0]["platform_brand"]
        return None

    def get_sub_brands(self, platform_brand_id: str) -> list[dict]:
        """플랫폼 브랜드의 입점 업체(서브 브랜드) 목록 조회."""
        result = (
            self._client.table("brand_relationships")
            .select("*, sub_brand:brands!brand_relationships_sub_brand_id_fkey(*)")
            .eq("platform_brand_id", platform_brand_id)
            .execute()
        )
        return [r["sub_brand"] for r in (result.data or []) if r.get("sub_brand")]

    def update_brand(self, brand_id: str, updates: dict) -> dict | None:
        """브랜드 정보 업데이트 (eeat_signals, press_history 등)."""
        result = (
            self._client.table("brands")
            .update(updates)
            .eq("id", brand_id)
            .execute()
        )
        return result.data[0] if result.data else None

    # ──────────────────────────────────────────
    # Platform Master Guides (005: 중앙 브레인)
    # ──────────────────────────────────────────

    def get_platform_guide(
        self,
        platform: str,
        guide_type: str,
    ) -> dict | None:
        """
        플랫폼별 최신 활성 가이드 조회.
        CMO가 전략 수립 전, COPYWRITER가 작성 전 반드시 참조.

        사용 예:
            guide = db.get_platform_guide("NAVER_BLOG", "AEO")
            key_signals = guide["key_signals"]  # 핵심 알고리즘 시그널
        """
        result = (
            self._client.table("platform_master_guides")
            .select("*")
            .eq("platform", platform)
            .eq("guide_type", guide_type)
            .eq("is_active", True)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_all_active_guides(self, platform: str | None = None) -> list[dict]:
        """활성 가이드 전체 조회 (플랫폼 필터 선택)."""
        query = (
            self._client.table("platform_master_guides")
            .select("platform, guide_type, version, title, key_signals, updated_at")
            .eq("is_active", True)
            .order("platform")
        )
        if platform:
            query = query.eq("platform", platform)
        result = query.execute()
        return result.data or []

    def upsert_platform_guide(self, guide_data: dict) -> dict | None:
        """
        플랫폼 가이드 저장/업데이트.
        R&D 에이전트(김연구원)가 알고리즘 변화 감지 시 호출.
        UNIQUE: (platform, guide_type, version)
        """
        result = (
            self._client.table("platform_master_guides")
            .upsert(guide_data, on_conflict="platform,guide_type,version")
            .execute()
        )
        return result.data[0] if result.data else None

    # ──────────────────────────────────────────
    # Evolving Knowledge (005: 자기 진화 기록소)
    # ──────────────────────────────────────────

    def insert_evolving_knowledge(self, knowledge_data: dict) -> dict | None:
        """
        가설-실행-결과 기록 저장.
        에이전트가 실험 후 성과를 기록하거나 실패 원인을 분석할 때 사용.

        knowledge_data 예시:
        {
            "agent_type": "CMO",
            "client_id":  "uuid",
            "hypothesis": "LOW 경쟁 키워드에 2000자 이상 발행 시 2주 내 TOP10 진입",
            "action":     "경기도 글램핑 키워드로 2200자 포스트 발행",
            "tags":       ["SEO", "low-competition", "naver-blog"],
        }
        """
        result = (
            self._client.table("evolving_knowledge")
            .insert(knowledge_data)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_evolving_knowledge(
        self,
        knowledge_id: str,
        outcome: str,
        performance_delta: dict,
        verdict: str,
    ) -> dict | None:
        """
        기존 지식 기록에 결과(Outcome) 업데이트.
        ANALYST 에이전트가 성과 측정 후 호출.
        verdict: 'confirmed' | 'rejected' | 'pending'
        """
        result = (
            self._client.table("evolving_knowledge")
            .update({
                "outcome":           outcome,
                "performance_delta": performance_delta,
                "verdict":           verdict,
            })
            .eq("id", knowledge_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_confirmed_knowledge(
        self,
        client_id: str | None = None,
        tags: list[str] | None = None,
        limit: int = 20,
    ) -> list[dict]:
        """
        검증된(confirmed) 지식 기록 조회.
        CMO·R&D가 전략 수립 전 "무엇이 실제로 효과가 있었는지" 참고.
        """
        query = (
            self._client.table("evolving_knowledge")
            .select("*")
            .eq("verdict", "confirmed")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if client_id:
            query = query.eq("client_id", client_id)
        result = query.execute()
        return result.data or []

    def get_active_knowledge(
        self,
        agent_type: str | None = None,
        client_id: str | None = None,
        limit: int = 10,
    ) -> list[dict]:
        """
        활성 지식 기록 조회 (confirmed + pending, rejected 제외).
        에이전트 시스템 프롬프트에 주입하여 과거 성과 패턴을 반영.

        고객사 특화 지식 우선 → 에이전트 타입 필터 → 최신순.
        """
        query = (
            self._client.table("evolving_knowledge")
            .select("agent_type, hypothesis, action, outcome, verdict, tags, created_at")
            .neq("verdict", "rejected")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if agent_type:
            query = query.eq("agent_type", agent_type)
        if client_id:
            query = query.eq("client_id", client_id)
        result = query.execute()
        return result.data or []

    # ──────────────────────────────────────────
    # Content Sources (소스 라이브러리)
    # ──────────────────────────────────────────

    def get_content_sources(
        self,
        client_id: str,
        source_ids: list[str] | None = None,
        source_types: list[str] | None = None,
        limit: int = 50,
    ) -> list[dict]:
        """
        콘텐츠 소스 조회.
        COPYWRITER가 참조 소스를 로드할 때 사용.

        Args:
            client_id:    고객사 ID
            source_ids:   특정 소스 ID 목록 (None이면 전체)
            source_types: 소스 타입 필터 (own_best, competitor 등)
            limit:        최대 조회 수
        """
        query = (
            self._client.table("content_sources")
            .select("id, client_id, source_type, title, url, content_text, content_structure, content_id, usage_mode, is_active")
            .eq("client_id", client_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if source_ids:
            query = query.in_("id", source_ids)
        if source_types:
            query = query.in_("source_type", source_types)
        result = query.execute()
        return result.data or []

    def get_content_sources_by_ids(self, source_ids: list[str]) -> list[dict]:
        """소스 ID 목록으로 소스 조회 (client_id 무관)."""
        if not source_ids:
            return []
        result = (
            self._client.table("content_sources")
            .select("id, client_id, source_type, title, url, content_text, content_structure, content_id, usage_mode")
            .in_("id", source_ids)
            .eq("is_active", True)
            .execute()
        )
        return result.data or []

    # ──────────────────────────────────────────
    # Brand Personas (브랜드 페르소나 + 스타일 가이드)
    # ──────────────────────────────────────────

    def get_brand_persona(self, client_id: str) -> dict | None:
        """
        활성 브랜드 페르소나 조회 (1:1 partial unique index).
        content_style_guide, default_source_ids 포함.
        """
        result = (
            self._client.table("brand_personas")
            .select("id, client_id, name, tone_voice_settings, target_audience, content_style_guide, default_source_ids, homepage_url, is_active")
            .eq("client_id", client_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    # ──────────────────────────────────────────
    # Content Prompts (콘텐츠 타입별 프롬프트)
    # ──────────────────────────────────────────

    def get_content_prompts(self, content_type: str) -> dict:
        """
        content_prompts 테이블에서 활성 프롬프트를 타입별로 조회.

        반환:
          {
            "system": "시스템 프롬프트 텍스트",
            "user": "유저 프롬프트 텍스트",
            "common_rules": "공통 규칙 텍스트",
          }
        """
        result = (
            self._client.table("content_prompts")
            .select("prompt_type, prompt_text, name")
            .eq("content_type", content_type)
            .eq("is_active", True)
            .execute()
        )
        prompts = {}
        for row in (result.data or []):
            prompts[row["prompt_type"]] = row["prompt_text"]
        return prompts

    def get_all_content_prompts(self) -> list[dict]:
        """content_prompts 테이블 전체 조회 (관리 UI용)."""
        result = (
            self._client.table("content_prompts")
            .select("*")
            .order("content_type")
            .order("prompt_type")
            .execute()
        )
        return result.data or []

    def upsert_content_prompt(self, data: dict) -> dict | None:
        """content_prompts 레코드 생성/수정."""
        result = (
            self._client.table("content_prompts")
            .upsert(data)
            .execute()
        )
        return result.data[0] if result.data else None
