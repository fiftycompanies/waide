"""
account_manager_agent.py
고객관리 에이전트 (AccountManagerAgent)

역할:
  1. [트리거] 신규 활성 구독 감지 → CMO에게 CLIENT_ONBOARD Job 전달
  2. [게이트] Job 생성 전 결제 상태 검증 (active 아니면 차단)
  3. [컨텍스트 제공] 다른 에이전트가 고객 정보를 조회할 때 단일 진입점

실행 방식:
  A. 폴링 루프 (start()): 미온보딩 활성 구독을 POLL_INTERVAL마다 스캔
  B. Job 처리: CLIENT_ONBOARD Job 수신 시 onboarding 절차 실행

에이전트 체인에서의 위치:
  [구독 활성화] → AccountManagerAgent → CMO → Copywriter → ...

수동 실행 예시:
  from agents.core.account_manager_agent import AccountManagerAgent
  agent = AccountManagerAgent()
  agent.start()           # 폴링 루프
  agent.run_once()        # 1회 실행 (테스트용)
  agent.scan_new_subscriptions()  # 미온보딩 구독 스캔만 실행
"""
import time
from datetime import datetime, timezone

from .base_agent import BaseAgent, _now
from .db_client import DBClient


class AccountManagerAgent(BaseAgent):
    """
    고객관리 에이전트.
    두 가지 루프를 병행 실행:
      - jobs 테이블 폴링 (BaseAgent.start()에서 처리)
      - subscriptions 테이블 스캔 (_poll_and_process 오버라이드)
    """

    AGENT_TYPE = "ACCOUNT_MANAGER"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────
    # BaseAgent 핵심 메서드 구현
    # ──────────────────────────────────────────

    def process(self, job: dict) -> dict:
        """
        CLIENT_ONBOARD Job 처리.

        input_payload 예시:
        {
            "client_id": "uuid",
            "action": "INITIAL_SETUP",   // INITIAL_SETUP | RENEWAL | UPGRADE | MANUAL
            "campaign_brief": {          // (선택) 미리 정해진 캠페인 방향
                "objective": "NAVER_TOP3",
                "keywords": ["키워드1"],
                "platforms": ["NAVER_BLOG"]
            }
        }
        """
        payload = job.get("input_payload", {})
        client_id = payload.get("client_id")
        action = payload.get("action", "INITIAL_SETUP")

        if not client_id:
            raise ValueError("input_payload에 client_id가 없습니다.")

        # 1. 고객 컨텍스트 로드
        context = self._load_and_validate_context(client_id, job["id"])

        # 2. 소스 설정 검증
        source_summary = self._validate_source_config(context, job["id"])

        # 3. CMO에게 첫 번째 작업 전달
        cmo_job = self._trigger_cmo(
            parent_job=job,
            context=context,
            campaign_brief=payload.get("campaign_brief"),
            action=action,
        )

        # 4. 구독 테이블에 onboarding_job_id 기록
        subscription = context.get("subscription")
        if subscription:
            self.db.update_subscription(
                subscription["id"],
                {"onboarding_job_id": job["id"]},
            )

        return {
            "client_id": client_id,
            "company_name": context["client"]["company_name"],
            "action": action,
            "subscription_status": subscription["status"] if subscription else "none",
            "scope": context.get("scope", {}),
            "source_type": context.get("source_type"),
            "source_validated": source_summary["valid"],
            "cmo_job_id": cmo_job["id"] if cmo_job else None,
            "accounts_count": len(context.get("accounts", [])),
            "keywords_count": len(context.get("keywords", [])),
        }

    # ──────────────────────────────────────────
    # 폴링 루프 확장: 미온보딩 구독 스캔 병행
    # ──────────────────────────────────────────

    def _poll_and_process(self) -> None:
        """
        BaseAgent의 폴링을 오버라이드.
        1. jobs 테이블의 CLIENT_ONBOARD Job 처리 (기본)
        2. subscriptions 테이블의 미온보딩 활성 구독 자동 스캔 (추가)
        """
        # 기본 Job 폴링 처리
        super()._poll_and_process()

        # 추가: 미온보딩 활성 구독 자동 감지 및 Job 생성
        self.scan_new_subscriptions()

    def scan_new_subscriptions(self) -> None:
        """
        status='active' AND onboarding_job_id IS NULL 인 구독을 찾아
        CLIENT_ONBOARD Job을 자동 생성.
        스케줄러 또는 수동 호출로도 실행 가능.
        """
        pending = self.db.get_pending_onboard_subscriptions()

        if not pending:
            return

        self.logger.info(
            "SUBSCRIPTIONS_SCANNED",
            f"미온보딩 활성 구독 {len(pending)}건 발견",
        )

        for subscription in pending:
            self._auto_create_onboard_job(subscription)

    def _auto_create_onboard_job(self, subscription: dict) -> None:
        """미온보딩 구독에 대해 CLIENT_ONBOARD Job을 자동 생성."""
        client = subscription.get("clients") or {}
        client_id = subscription.get("client_id")
        company_name = client.get("company_name", client_id)

        # 결제 상태 이중 확인
        if subscription.get("status") != "active":
            return

        # CLIENT_ONBOARD Job 생성 → 자기 자신(ACCOUNT_MANAGER)에게 배정
        job = self.db.create_job({
            "job_type": "CLIENT_ONBOARD",
            "title": f"[자동 온보딩] {company_name}",
            "assigned_agent": self.AGENT_TYPE,
            "triggered_by": "SYSTEM",
            "trigger_type": "SCHEDULER",
            "priority": "high",
            "client_id": client_id,
            "input_payload": {
                "client_id": client_id,
                "action": "INITIAL_SETUP",
                "subscription_id": subscription["id"],
                "auto_triggered": True,
            },
        })

        if job:
            # 중복 생성 방지: onboarding_job_id를 임시로 기록
            self.db.update_subscription(
                subscription["id"],
                {"onboarding_job_id": job["id"]},
            )
            self.logger.success(
                "ONBOARD_JOB_CREATED",
                f"{company_name} 온보딩 Job 자동 생성",
                metadata={"job_id": job["id"], "subscription_id": subscription["id"]},
            )

    # ──────────────────────────────────────────
    # 내부 헬퍼
    # ──────────────────────────────────────────

    def _load_and_validate_context(self, client_id: str, job_id: str) -> dict:
        """고객 컨텍스트 로드 + 결제 상태 검증."""
        context = self.db.get_client_context(client_id)

        if not context:
            raise ValueError(f"고객 정보를 찾을 수 없습니다. client_id={client_id}")

        if not context.get("is_billable"):
            # 결제 미완료 → Job 처리 차단
            self.logger.warning(
                "BILLING_GATE_BLOCKED",
                f"{context['client']['company_name']}: 활성 구독 없음. 작업 생성 차단.",
                job_id=job_id,
                metadata={"client_id": client_id},
            )
            raise PermissionError(
                f"고객 '{context['client']['company_name']}'의 구독이 활성화되지 않았습니다. "
                "결제 완료 후 재시도해주세요."
            )

        self.logger.info(
            "CLIENT_CONTEXT_LOADED",
            f"{context['client']['company_name']} 컨텍스트 로드 완료 "
            f"(계정 {len(context['accounts'])}개, 키워드 {len(context['keywords'])}개)",
            job_id=job_id,
        )
        return context

    def _validate_source_config(self, context: dict, job_id: str) -> dict:
        """
        소스 설정이 올바르게 세팅되어 있는지 확인.
        에러는 내지 않고 경고만 기록 (소스 없이도 에이전트 작동 가능).
        """
        source_type = context.get("source_type")
        source_config = context.get("source_config", {})
        company = context["client"]["company_name"]

        summary = {"valid": True, "warnings": []}

        if not source_type:
            summary["valid"] = False
            summary["warnings"].append("source_type 미설정")
            self.logger.warning(
                "SOURCE_NOT_CONFIGURED",
                f"{company}: source_type 미설정. 에이전트가 소스 없이 동작합니다.",
                job_id=job_id,
            )
            return summary

        # 타입별 필수 필드 검증
        required_fields = {
            "API": ["api_key"],
            "GOOGLE_DRIVE": ["folder_id"],
            "LOCAL": ["path"],
        }

        missing = [
            f for f in required_fields.get(source_type, [])
            if not source_config.get(f)
        ]

        if missing:
            summary["valid"] = False
            summary["warnings"].extend(missing)
            self.logger.warning(
                "SOURCE_CONFIG_INCOMPLETE",
                f"{company}: source_config 누락 필드 → {missing}",
                job_id=job_id,
                metadata={"source_type": source_type, "missing_fields": missing},
            )
        else:
            self.logger.info(
                "SOURCE_CONFIG_VALID",
                f"{company}: {source_type} 소스 설정 확인 완료",
                job_id=job_id,
            )

        return summary

    def _trigger_cmo(
        self,
        parent_job: dict,
        context: dict,
        campaign_brief: dict | None,
        action: str,
    ) -> dict | None:
        """
        CMO에게 CAMPAIGN_PLAN Job 생성.
        context의 계약 범위(scope), 브랜드 가이드라인, KPI 목표,
        소스 설정을 payload에 포함.
        """
        client = context["client"]
        scope = context.get("scope", {})

        # CMO에게 전달할 작업 지시서
        cmo_input = {
            # 고객 기본 정보
            "client_id": client["id"],
            "company_name": client["company_name"],
            "action": action,

            # 계약 범위 (CMO가 작업량 결정에 사용)
            "scope": {
                "monthly_content_count": scope.get("monthly_content_count", 10),
                "platforms": scope.get("platforms", ["NAVER_BLOG"]),
                "keyword_count": scope.get("keyword_count", 0),
                "include_report": scope.get("include_report", True),
                "include_design": scope.get("include_design", False),
            },

            # 콘텐츠 소스 정보 (COPYWRITER가 참고)
            "source_type": context.get("source_type"),
            "source_config": context.get("source_config", {}),

            # 브랜드 가이드라인 (COPYWRITER 프롬프트에 주입)
            "brand_guidelines": context.get("brand_guidelines", ""),

            # KPI 목표 및 타깃 플랫폼 (004에서 추가 — CMO 전략 수립 기준)
            "kpi_goals": client.get("kpi_goals", {}),
            "target_platforms": client.get("target_platforms", []),

            # 사전 준비된 캠페인 방향 (있으면 우선 적용)
            "campaign_brief": campaign_brief,

            # 참고 데이터
            "available_accounts": [
                {
                    "id": a["id"],
                    "name": a["name"],
                    "platform": a["platform"],
                    "blog_score": a["blog_score"],
                }
                for a in context.get("accounts", [])
            ],
            "tracking_keywords": [
                {
                    "id": k["id"],
                    "keyword": k["keyword"],
                    "monthly_search_total": k["monthly_search_total"],
                    "competition": k["competition"],
                    "priority": k["priority"],
                }
                for k in context.get("keywords", [])
            ],
        }

        cmo_job = self.create_child_job(
            parent_job=parent_job,
            job_type="CAMPAIGN_PLAN",
            assigned_agent="CMO",
            title=f"[캠페인 기획] {client['company_name']} - {action}",
            input_payload=cmo_input,
        )

        if cmo_job:
            self.logger.success(
                "CMO_JOB_TRIGGERED",
                f"CMO 작업 전달 완료: {cmo_job['id']}",
                job_id=parent_job["id"],
                metadata={
                    "cmo_job_id": cmo_job["id"],
                    "company": client["company_name"],
                },
            )

        return cmo_job

    # ──────────────────────────────────────────
    # 공개 유틸리티: 다른 에이전트가 직접 호출
    # ──────────────────────────────────────────

    @staticmethod
    def get_client_context(client_id: str) -> dict | None:
        """
        다른 에이전트(CMO, COPYWRITER 등)가 고객 컨텍스트를 조회할 때 사용.
        인스턴스 없이 호출 가능한 정적 메서드.

        사용 예:
            ctx = AccountManagerAgent.get_client_context(client_id)
            brand_guidelines = ctx["brand_guidelines"]
            scope = ctx["scope"]
        """
        return DBClient().get_client_context(client_id)

    @staticmethod
    def assert_billable(client_id: str, job_title: str = "") -> None:
        """
        다른 에이전트가 Job 생성 전 결제 상태를 확인할 때 사용.
        활성 구독이 없으면 PermissionError를 raise.

        사용 예 (CMO 에이전트 등):
            AccountManagerAgent.assert_billable(client_id, job_title="콘텐츠 생성")
        """
        db = DBClient()
        if not db.is_client_billable(client_id):
            sub = db.get_active_subscription(client_id)
            status = sub["status"] if sub else "구독 없음"
            raise PermissionError(
                f"'{job_title}' 작업 생성 불가: 결제 상태 '{status}'. "
                "활성 구독이 필요합니다."
            )
