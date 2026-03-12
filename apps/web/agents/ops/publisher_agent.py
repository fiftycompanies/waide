"""
publisher_agent.py
발행 에이전트 — 발행봇 (OPS_PUBLISHER)

역할:
  OPS_QUALITY가 PASS 판정한 콘텐츠를 플랫폼에 발행 처리.
  - 계정의 fixed_ip 정보로 발행 계정 확정
  - contents 레코드 업데이트: publish_status='published', is_active=True
  - N_SERP 순위 추적 자동 활성화 (is_active=True로 설정)
  - 슬랙 발행 완료 보고

실제 플랫폼 API(네이버 블로그 등) 연동은
추후 계정별 봇 라이브러리 도입 시 이 에이전트에서 확장한다.
현재는 DB 상태 전환 + 슬랙 보고까지만 수행.

발행 흐름:
  PUBLISH Job 수신
    ↓ _load_account()    계정 정보 (fixed_ip, url) 로드
    ↓ _publish()         publish_status → published, is_active → True
    ↓ send_publish_report()  슬랙 보고 (발행봇 페르소나)
"""
from datetime import date

from core.base_agent import BaseAgent
from core.account_manager_agent import AccountManagerAgent
from modules import slack_client


class PublisherAgent(BaseAgent):

    AGENT_TYPE = "OPS_PUBLISHER"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")

        if job_type == "PUBLISH":
            return self._handle_publish(job)
        else:
            raise ValueError(f"PublisherAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핵심 핸들러: 발행
    # ──────────────────────────────────────────────────────

    def _handle_publish(self, job: dict) -> dict:
        payload    = job.get("input_payload", {})
        client_id  = payload.get("client_id")
        content_id = payload.get("content_id")
        keyword    = payload.get("keyword", "")
        platform   = payload.get("platform", "NAVER_BLOG")
        company    = payload.get("company_name", "")

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        # 콘텐츠 조회
        content = self.db.get_content(content_id) if content_id else None
        if not content:
            self.logger.warning(
                "CONTENT_NOT_FOUND",
                f"content_id={content_id} 콘텐츠를 찾을 수 없습니다.",
                job_id=job["id"],
            )
            return {"status": "CONTENT_NOT_FOUND", "content_id": content_id}

        # 계정 정보 로드
        account_id   = payload.get("account_id") or content.get("account_id")
        account      = self._load_account(account_id)
        account_name = payload.get("account_name") or (account.get("name") if account else None)
        account_url  = account.get("url") if account else None
        fixed_ip     = account.get("fixed_ip") if account else None

        word_count = payload.get("word_count") or content.get("word_count") or 0

        self.logger.info(
            "PUBLISH_START",
            f"'{keyword}' 발행 시작 — 계정: {account_name or '미지정'}, IP: {fixed_ip or 'N/A'}",
            job_id=job["id"],
        )

        # ── START 슬랙 메시지 ────────────────────────────────────
        slack_client.send(
            f"🚀 '{keyword}' ({platform}) 발행 준비 — 계정: {account_name or '미지정'}",
            agent_type="OPS_PUBLISHER",
            channel_type="pipeline",
        )

        # ── DB 상태 전환 ──────────────────────────────────
        today = date.today().isoformat()
        self.db.update_content(content_id, {
            "publish_status":  "published",
            "is_active":       True,          # N_SERP 순위 추적 활성화
            "published_date":  today,
        })

        self.logger.success(
            "PUBLISH_DONE",
            f"'{keyword}' 발행 완료 → N_SERP 순위 추적 활성",
            job_id=job["id"],
        )

        # ── 슬랙 보고 ──────────────────────────────────────
        slack_client.send_publish_report(
            company_name=company,
            keyword=keyword,
            platform=platform,
            url=account_url,
            account_name=account_name,
            word_count=word_count,
            content_id=content_id,
        )

        return {
            "content_id":   content_id,
            "keyword":      keyword,
            "platform":     platform,
            "account_name": account_name,
            "fixed_ip":     fixed_ip,
            "published_date": today,
            "is_active":    True,
        }

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼
    # ──────────────────────────────────────────────────────

    def _load_account(self, account_id: str | None) -> dict:
        """accounts 테이블에서 계정 정보 조회."""
        if not account_id:
            return {}
        try:
            result = (
                self.db.client
                .table("accounts")
                .select("id, name, url, fixed_ip, blog_score")
                .eq("id", account_id)
                .single()
                .execute()
            )
            return result.data or {}
        except Exception:
            return {}
