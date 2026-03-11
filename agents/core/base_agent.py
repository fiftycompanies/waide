"""
base_agent.py
모든 에이전트의 추상 기반 클래스.

동작 원리 (이벤트 기반 폴링):
  1. start() 호출 → 폴링 루프 시작
  2. POLL_INTERVAL마다 jobs 테이블에서 자신에게 배정된 PENDING Job 조회
  3. Job 발견 → status를 IN_PROGRESS로 변경 후 process() 호출
  4. process() 성공 → status DONE, output_payload 기록
  5. process() 실패 → retry_count 확인 후 재시도 또는 FAILED 처리
  6. 모든 단계가 agent_logs에 기록됨

새 에이전트 추가 방법:
  class MyAgent(BaseAgent):
      def __init__(self):
          super().__init__(agent_type="MY_AGENT_TYPE")

      def process(self, job: dict) -> dict:
          # 핵심 로직 구현
          return {"result": "..."}
"""
import os
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from .db_client import DBClient
from .logger import AgentLogger

POLL_INTERVAL = int(os.getenv("AGENT_POLL_INTERVAL", "5"))


class BaseAgent(ABC):
    """
    에이전트 기반 클래스.
    상속 후 process() 메서드만 구현하면 폴링·상태관리·로깅이 자동 처리됨.
    """

    def __init__(self, agent_type: str) -> None:
        self.agent_type = agent_type
        self.db = DBClient()
        self.logger = AgentLogger(agent_type, self.db)
        self.is_running = False

    # ──────────────────────────────────────────
    # 하위 클래스가 반드시 구현해야 하는 메서드
    # ──────────────────────────────────────────

    @abstractmethod
    def process(self, job: dict) -> dict:
        """
        에이전트의 핵심 비즈니스 로직.

        Args:
            job: jobs 테이블의 레코드 전체 (input_payload 포함)

        Returns:
            output_payload로 저장될 결과 dict

        Raises:
            Exception: 처리 실패 시. 자동으로 재시도 또는 FAILED 처리됨.
        """

    # ──────────────────────────────────────────
    # 에이전트 생명주기
    # ──────────────────────────────────────────

    def start(self) -> None:
        """에이전트 폴링 루프 시작. Ctrl+C로 종료."""
        self.is_running = True
        self.logger.info("AGENT_STARTED", f"{self.agent_type} 에이전트 시작 (폴링 주기: {POLL_INTERVAL}초)")

        try:
            while self.is_running:
                self._poll_and_process()
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            self.stop()

    def stop(self) -> None:
        """에이전트 종료."""
        self.is_running = False
        self.logger.info("AGENT_STOPPED", f"{self.agent_type} 에이전트 종료")

    def run_once(self) -> None:
        """테스트용: 폴링 1회만 실행."""
        self._poll_and_process()

    # ──────────────────────────────────────────
    # 내부 폴링 + 처리
    # ──────────────────────────────────────────

    def _poll_and_process(self) -> None:
        """PENDING Job을 조회하고 순서대로 처리."""
        pending_jobs = self.db.get_pending_jobs(self.agent_type)

        if pending_jobs:
            self.logger.info(
                "JOBS_FOUND",
                f"{len(pending_jobs)}개 PENDING Job 발견",
            )

        for job in pending_jobs:
            self._handle_job(job)

    def _handle_job(self, job: dict) -> None:
        """단일 Job 처리 전체 흐름."""
        job_id = job["id"]
        start_time = time.time()

        try:
            # 1. 픽업: PENDING → IN_PROGRESS
            self._pick_up(job_id)
            self.logger.info(
                "JOB_PICKED_UP",
                f"처리 시작: {job.get('title', job_id)}",
                job_id=job_id,
            )

            # 2. 에이전트 핵심 로직 실행
            output = self.process(job)

            # 3. 완료: IN_PROGRESS → DONE
            duration_ms = int((time.time() - start_time) * 1000)
            self._complete(job_id, output)
            self.logger.success(
                "JOB_DONE",
                f"완료: {job.get('title', job_id)} ({duration_ms}ms)",
                job_id=job_id,
                duration_ms=duration_ms,
            )

        except Exception as e:
            self._fail(job_id, str(e))
            self.logger.error(
                "JOB_FAILED",
                f"실패: {str(e)}",
                job_id=job_id,
                metadata={"error": str(e), "job_title": job.get("title")},
            )

    # ──────────────────────────────────────────
    # Job 상태 전환 (State Machine)
    # ──────────────────────────────────────────

    def _pick_up(self, job_id: str) -> None:
        """PENDING → IN_PROGRESS"""
        self.db.update_job(job_id, {
            "status": "IN_PROGRESS",
            "started_at": _now(),
        })

    def _complete(self, job_id: str, output: dict) -> None:
        """IN_PROGRESS → DONE"""
        self.db.update_job(job_id, {
            "status": "DONE",
            "output_payload": output,
            "completed_at": _now(),
        })

    def _fail(self, job_id: str, error: str) -> None:
        """
        실패 처리.
        retry_count < max_retries → PENDING으로 되돌려 재시도 대기
        retry_count >= max_retries → FAILED 확정
        """
        job = self.db.get_job(job_id)
        if not job:
            return

        retry_count = job.get("retry_count", 0)
        max_retries = job.get("max_retries", 3)

        if retry_count < max_retries:
            # 재시도: 카운터만 올리고 PENDING으로 복귀
            self.db.update_job(job_id, {
                "status": "PENDING",
                "retry_count": retry_count + 1,
                "error_message": f"[시도 {retry_count + 1}/{max_retries}] {error}",
            })
            self.logger.warning(
                "JOB_RETRY",
                f"재시도 예약 ({retry_count + 1}/{max_retries}): {error}",
                job_id=job_id,
            )
        else:
            # 최대 재시도 초과 → FAILED 확정
            self.db.update_job(job_id, {
                "status": "FAILED",
                "error_message": error,
                "completed_at": _now(),
            })

    # ──────────────────────────────────────────
    # 에이전트 체인: 하위 Job 생성
    # ──────────────────────────────────────────

    def create_child_job(
        self,
        parent_job: dict,
        job_type: str,
        assigned_agent: str,
        title: str,
        input_payload: dict,
        priority: str | None = None,
    ) -> dict | None:
        """
        현재 Job 처리 결과로 다음 에이전트에게 넘길 Job을 생성.

        예) CMO가 CONTENT_CREATE Job을 만들어 COPYWRITER에게 넘길 때 사용.
        """
        job_data = {
            "parent_job_id": parent_job["id"],
            "client_id": parent_job.get("client_id"),
            "job_type": job_type,
            "title": title,
            "assigned_agent": assigned_agent,
            "triggered_by": self.agent_type,
            "trigger_type": "AGENT",
            "priority": priority or parent_job.get("priority", "medium"),
            "input_payload": input_payload,
        }
        child = self.db.create_job(job_data)
        if child:
            self.logger.info(
                "CHILD_JOB_CREATED",
                f"→ {assigned_agent}에게 Job 전달: {title}",
                job_id=parent_job["id"],
                metadata={"child_job_id": child["id"], "child_type": job_type},
            )
        return child

    def set_quality_gate(
        self,
        job_id: str,
        result: str,          # "PASS" | "FAIL"
        score: float | None,
        notes: str,
    ) -> None:
        """품질 검수 결과를 Job에 기록."""
        self.db.update_job(job_id, {
            "quality_gate_result": result,
            "quality_gate_score": score,
            "quality_gate_notes": notes,
        })

    def notify_slack(
        self,
        message: str,
        blocks: list | None = None,
        channel_type: str | None = None,
    ) -> None:
        """
        에이전트 페르소나로 슬랙 메시지 발송.
        실패해도 예외를 삼키므로 에이전트 본 로직에 영향 없음.

        Args:
            channel_type: 'pipeline' / 'serp' / 'alerts' / None(기본 채널)
        """
        try:
            from modules import slack_client
            slack_client.send(
                message=message,
                agent_type=self.agent_type,
                blocks=blocks,
                channel_type=channel_type,
            )
        except Exception as e:
            self.logger.warning(
                "SLACK_NOTIFY_FAILED",
                f"슬랙 알림 실패 (무시): {e}",
            )


# ──────────────────────────────────────────
# 헬퍼
# ──────────────────────────────────────────

def _now() -> str:
    """ISO 8601 UTC 타임스탬프 반환."""
    return datetime.now(timezone.utc).isoformat()
