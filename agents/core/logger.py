"""
logger.py
에이전트 활동을 콘솔과 agent_logs 테이블에 동시에 기록.
"""
import os
from datetime import datetime


# 로그 레벨 우선순위
_LEVELS = {"DEBUG": 0, "INFO": 1, "WARNING": 2, "ERROR": 3}
_MIN_LEVEL = _LEVELS.get(os.getenv("AGENT_LOG_LEVEL", "INFO"), 1)

# 콘솔 색상 코드
_COLORS = {
    "info":    "\033[36m",   # 청록
    "success": "\033[32m",   # 초록
    "warning": "\033[33m",   # 노랑
    "error":   "\033[31m",   # 빨강
    "reset":   "\033[0m",
}


class AgentLogger:
    """
    에이전트별 로거.
    DB 기록은 agent_logs 테이블에, 콘솔 출력은 색상 포함하여 표시.
    """

    def __init__(self, agent_type: str, db) -> None:
        self.agent_type = agent_type
        self.db = db  # DBClient 인스턴스

    def _log(
        self,
        action: str,
        status: str,      # info | success | warning | error
        message: str,
        job_id: str | None = None,
        metadata: dict | None = None,
        duration_ms: int | None = None,
    ) -> None:
        # 콘솔 출력
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        color = _COLORS.get(status, "")
        reset = _COLORS["reset"]
        job_tag = f" [job:{job_id[:8]}]" if job_id else ""
        print(f"{color}[{ts}] [{self.agent_type}] [{status.upper()}]{job_tag} {action}: {message}{reset}")

        # DB 기록 (level 필터 적용)
        level_map = {"info": "INFO", "success": "INFO", "warning": "WARNING", "error": "ERROR"}
        if _LEVELS.get(level_map.get(status, "INFO"), 1) >= _MIN_LEVEL:
            log_entry: dict = {
                "agent_type": self.agent_type,
                "action": action,
                "status": status,
                "message": message,
                "metadata": metadata or {},
            }
            if job_id:
                log_entry["job_id"] = job_id
            if duration_ms is not None:
                log_entry["duration_ms"] = duration_ms

            self.db.insert_agent_log(log_entry)

    # ── 편의 메서드 ──────────────────────────────

    def info(self, action: str, message: str, **kwargs) -> None:
        self._log(action, "info", message, **kwargs)

    def success(self, action: str, message: str, **kwargs) -> None:
        self._log(action, "success", message, **kwargs)

    def warning(self, action: str, message: str, **kwargs) -> None:
        self._log(action, "warning", message, **kwargs)

    def error(self, action: str, message: str, **kwargs) -> None:
        self._log(action, "error", message, **kwargs)
