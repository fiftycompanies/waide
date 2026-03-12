"""
report_agent.py
리포트 에이전트 — 리포트봇 (ANALYST_REPORT)

역할:
  SOM_REPORT Job 수신 → 주간 AI 모델 점유율(SOM) 집계 → 슬랙 보고

처리 흐름:
  SOM_REPORT Job 수신
    ↓ _aggregate_weekly_som()   aeo_metrics 주간 집계
    ↓ upsert_som_report()       som_reports 저장
    ↓ send_som_weekly_report()  슬랙 김이사 보고

SOM_REPORT Job 생성 방법 (RND 에이전트가 매주 자동 생성, 또는 수동):
  db.create_job({
      "job_type":       "SOM_REPORT",
      "assigned_agent": "ANALYST_REPORT",
      "title":          "주간 SOM 리포트 — 2026-W08",
      "input_payload":  {
          "client_id":   "<UUID>",
          "brand_id":    "<UUID>",
          "report_week": "2026-02-17",   # 해당 주 월요일
      }
  })
"""
from datetime import date, timedelta

from core.base_agent import BaseAgent
from core.account_manager_agent import AccountManagerAgent
from modules import slack_client


class ReportAgent(BaseAgent):

    AGENT_TYPE = "ANALYST_REPORT"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")

        if job_type == "SOM_REPORT":
            return self._handle_som_report(job)
        else:
            raise ValueError(f"ReportAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핵심 핸들러: 주간 SOM 리포트
    # ──────────────────────────────────────────────────────

    def _handle_som_report(self, job: dict) -> dict:
        """
        aeo_metrics를 집계하여 주간 SOM 리포트를 생성하고
        슬랙 김이사 채널로 발송한다.

        payload 키:
          client_id   : 필수
          brand_id    : 선택
          report_week : 'YYYY-MM-DD' (월요일, 없으면 이번 주 월요일)
        """
        payload     = job.get("input_payload", {})
        client_id   = payload.get("client_id")
        brand_id    = payload.get("brand_id")
        report_week = payload.get("report_week") or self._this_monday()

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        # 집계 기간: report_week(월) ~ +6일(일)
        week_start = report_week
        week_end   = self._add_days(report_week, 6)

        self.logger.info(
            "SOM_REPORT_START",
            f"SOM 집계: {week_start} ~ {week_end}",
            job_id=job["id"],
        )

        # aeo_metrics 주간 집계
        summary = self.db.get_weekly_aeo_summary(
            client_id=client_id,
            week_start=week_start,
            week_end=week_end,
        )

        if summary["total"] == 0:
            self.logger.warning(
                "SOM_NO_DATA",
                f"{week_start} 주간 AEO 스캔 데이터 없음",
                job_id=job["id"],
            )
            return {
                "status":      "NO_DATA",
                "report_week": report_week,
                "client_id":   client_id,
            }

        # 브랜드·회사 이름 조회
        brand = self.db.get_brand(brand_id) if brand_id else None
        if not brand and client_id:
            brands = self.db.get_brands_by_client(client_id)
            brand  = brands[0] if brands else None
            brand_id = brand["id"] if brand else brand_id

        brand_name = brand["name"] if brand else "브랜드"

        context = AccountManagerAgent.get_client_context(client_id)
        company = context["client"]["company_name"] if context else brand_name

        # som_reports 저장
        report_data = {
            "client_id":     client_id,
            "brand_id":      brand_id,
            "report_week":   week_start,
            "total_scans":   summary["total"],
            "cited_count":   summary["cited"],
            "citation_rate": summary["rate"],
            "top_platform":  summary["top_platform"],
            "top_keyword":   summary["top_keyword"],
            "details": {
                "by_platform": summary["by_platform"],
                "by_keyword":  summary["by_keyword"],
                "top_citations": summary["top_citations"],
            },
        }
        self.db.upsert_som_report(report_data)

        self.logger.success(
            "SOM_REPORT_SAVED",
            f"SOM 리포트 저장: {summary['cited']}/{summary['total']}회 인용 ({summary['rate']}%)",
            job_id=job["id"],
        )

        # 슬랙 김이사 보고
        slack_client.send_som_weekly_report(
            company_name=company,
            brand_name=brand_name,
            report_week=report_week,
            total_scans=summary["total"],
            cited_count=summary["cited"],
            citation_rate=summary["rate"],
            by_platform=summary["by_platform"],
            top_citations=summary["top_citations"],
            top_keyword=summary["top_keyword"],
        )

        return {
            "client_id":     client_id,
            "brand_id":      brand_id,
            "report_week":   report_week,
            "total_scans":   summary["total"],
            "cited_count":   summary["cited"],
            "citation_rate": summary["rate"],
            "top_platform":  summary["top_platform"],
            "top_keyword":   summary["top_keyword"],
        }

    # ──────────────────────────────────────────────────────
    # 내부 헬퍼
    # ──────────────────────────────────────────────────────

    @staticmethod
    def _this_monday() -> str:
        """이번 주 월요일 날짜 반환 ('YYYY-MM-DD')."""
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        return monday.isoformat()

    @staticmethod
    def _add_days(date_str: str, days: int) -> str:
        """날짜 문자열에 일수 더하기."""
        d = date.fromisoformat(date_str)
        return (d + timedelta(days=days)).isoformat()
