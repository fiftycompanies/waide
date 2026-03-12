"""
serp_agent.py
ANALYST_SERP — (Deprecated)

SERP 수집 기능은 Next.js serp-collector.ts 모듈로 이전됨.
이 에이전트는 더 이상 사용되지 않으며, 하위 호환성을 위해 유지.
기존 SERP_CHECK Job이 들어오면 SKIP 처리한다.
"""
from core.base_agent import BaseAgent


class SerpAgent(BaseAgent):

    AGENT_TYPE = "ANALYST_SERP"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    def process(self, job: dict) -> dict:
        self.logger.info(
            "SERP_DEPRECATED",
            "SERP 수집은 Next.js serp-collector.ts로 이전되었습니다. "
            "이 Job은 무시됩니다.",
            job_id=job["id"],
        )
        return {"status": "SKIP", "reason": "DEPRECATED_USE_SERP_COLLECTOR_TS"}
