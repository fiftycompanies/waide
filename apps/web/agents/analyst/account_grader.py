"""
account_grader.py
ANALYST_MATCH — 계정 등급 계산기

역할:
  blog_accounts 별로 성과 지표를 집계하고
  account_grades 테이블에 일별 등급 스냅샷을 기록한다.
  등급 변화 시 Slack 알림 발송.

처리 Job:
  ACCOUNT_GRADE: 특정 client_id의 전체 계정 등급 재계산

점수 공식:
  account_score = (exposure_rate × 35) + (rank_quality × 35) + (consistency × 20) + (volume_bonus × 10)
  등급: S(75~100) / A(55~74) / B(35~54) / C(0~34)
"""
from datetime import date, timedelta
from typing import Optional

from core.base_agent import BaseAgent
from modules import slack_client

# ── 등급 임계값 ──────────────────────────────────────────────
GRADE_THRESHOLDS = [
    (75, "S"),
    (55, "A"),
    (35, "B"),
    ( 0, "C"),
]


def _score_to_grade(score: float) -> str:
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "C"


def _grade_num(grade: str) -> int:
    return {"S": 4, "A": 3, "B": 2, "C": 1}.get(grade, 1)


class AccountGraderAgent(BaseAgent):

    AGENT_TYPE = "ANALYST_MATCH"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")
        if job_type == "ACCOUNT_GRADE":
            return self._handle_account_grade(job)
        raise ValueError(f"AccountGraderAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핵심 핸들러: ACCOUNT_GRADE
    # ──────────────────────────────────────────────────────

    def _handle_account_grade(self, job: dict) -> dict:
        payload   = job.get("input_payload", {})
        client_id = payload.get("client_id")

        today     = date.today().isoformat()
        updated   = 0
        promoted  = []  # (account_name, prev_grade, new_grade, reason)

        if client_id:
            client_ids = [client_id]
        else:
            # 전체 클라이언트
            res = self.db.client.from_("clients").select("id").execute()
            client_ids = [r["id"] for r in (res.data or [])]

        for cid in client_ids:
            accounts = self._fetch_accounts(cid)
            for acc in accounts:
                try:
                    result = self._grade_account(acc, cid, today)
                    if result:
                        updated += 1
                        if result.get("grade_changed"):
                            promoted.append(result)
                except Exception as e:
                    self.logger.warning(
                        "GRADE_ACCOUNT_FAIL",
                        f"계정 {acc.get('account_name')} 등급 계산 실패: {e}",
                        job_id=job["id"],
                    )

        # 등급 변화 Slack 알림
        if promoted:
            self._notify_grade_changes(promoted)

        self.logger.info(
            "ACCOUNT_GRADE_DONE",
            f"등급 계산 완료: {updated}개 계정 처리, {len(promoted)}개 등급 변화",
            job_id=job["id"],
        )
        return {"status": "DONE", "updated": updated, "grade_changes": len(promoted)}

    # ──────────────────────────────────────────────────────
    # 계정 데이터 조회
    # ──────────────────────────────────────────────────────

    def _fetch_accounts(self, client_id: str) -> list[dict]:
        res = (
            self.db.client.from_("blog_accounts")
            .select("id, account_name, platform, is_active")
            .eq("client_id", client_id)
            .eq("is_active", True)
            .execute()
        )
        return res.data or []

    def _fetch_contents_for_account(self, account_id: str, client_id: str) -> list[dict]:
        """발행된 콘텐츠 조회 + keywords 테이블에서 현재 순위 병합"""
        res = (
            self.db.client.from_("contents")
            .select("id, keyword_id, account_id, published_at")
            .eq("account_id", account_id)
            .eq("client_id", client_id)
            .eq("publish_status", "published")
            .execute()
        )
        contents = res.data or []
        if not contents:
            return []

        # keywords 테이블에서 현재 순위 조회
        kw_ids = list({c["keyword_id"] for c in contents if c.get("keyword_id")})
        if kw_ids:
            kw_res = (
                self.db.client.from_("keywords")
                .select("id, current_rank_naver_pc")
                .in_("id", kw_ids)
                .execute()
            )
            rank_map = {k["id"]: k["current_rank_naver_pc"] for k in (kw_res.data or [])}
            for c in contents:
                c["current_rank_naver_pc"] = rank_map.get(c.get("keyword_id"))

        return contents

    def _fetch_previous_grade(self, account_id: str) -> Optional[dict]:
        """어제의 등급 기록 조회"""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        res = (
            self.db.client.from_("account_grades")
            .select("grade, account_score, exposure_rate, top10_ratio")
            .eq("account_id", account_id)
            .lte("measured_at", yesterday)
            .order("measured_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def _fetch_contents_30d_ago(self, account_id: str, client_id: str) -> list[str]:
        """30일 전 노출 중이었던 keyword_id 목록"""
        d30 = (date.today() - timedelta(days=30)).isoformat()

        # 해당 계정의 콘텐츠 조회
        res2 = (
            self.db.client.from_("contents")
            .select("id, keyword_id")
            .eq("account_id", account_id)
            .eq("client_id", client_id)
            .execute()
        )
        contents = res2.data or []
        if not contents:
            return []

        content_ids = [c["id"] for c in contents]
        kw_by_content = {c["id"]: c["keyword_id"] for c in contents}

        # serp_results에서 30일 전 rank <= 20인 content_id 조회
        res = (
            self.db.client.from_("serp_results")
            .select("content_id, rank")
            .in_("content_id", content_ids)
            .eq("device", "PC")
            .lte("captured_at", d30)
            .lte("rank", 20)
            .execute()
        )
        return list({kw_by_content[r["content_id"]] for r in (res.data or []) if r["content_id"] in kw_by_content})

    # ──────────────────────────────────────────────────────
    # 점수 계산 로직
    # ──────────────────────────────────────────────────────

    def _grade_account(self, acc: dict, client_id: str, today: str) -> Optional[dict]:
        account_id   = acc["id"]
        account_name = acc["account_name"]

        contents = self._fetch_contents_for_account(account_id, client_id)
        total    = len(contents)

        if total == 0:
            # 발행 없음 → C등급 기본 저장
            score = 0.0
            grade = "C"
            self._upsert_grade(account_id, client_id, {
                "total_published": 0,
                "exposed_keywords": 0,
                "exposure_rate": 0,
                "avg_rank": None,
                "top3_count": 0,
                "top10_count": 0,
                "top3_ratio": 0,
                "top10_ratio": 0,
                "consistency_rate": 0,
                "account_score": 0,
                "grade": "C",
                "previous_grade": None,
                "grade_change_reason": "발행 이력 없음",
            }, today)
            return None

        # ── 지표 계산 ─────────────────────────────────────
        ranks = [c["current_rank_naver_pc"] for c in contents
                 if c.get("current_rank_naver_pc") is not None]

        exposed_count = len(ranks)
        exposure_rate = exposed_count / total if total > 0 else 0

        top3_count    = sum(1 for r in ranks if r <= 3)
        top10_count   = sum(1 for r in ranks if r <= 10)
        top20_count   = sum(1 for r in ranks if r <= 20)

        top3_ratio    = top3_count  / total * 100
        top10_ratio   = top10_count / total * 100

        avg_rank = sum(ranks) / len(ranks) if ranks else None

        # rank_quality 계산
        top3_r     = top3_count / total
        top10_only = (top10_count - top3_count) / total  # 4~10위
        top20_only = (top20_count - top10_count) / total  # 11~20위
        rank_quality = (top3_r * 1.0 + top10_only * 0.6 + top20_only * 0.3)

        # consistency: 30일 전 노출 키워드 중 현재도 노출 중인 비율
        old_kw = self._fetch_contents_30d_ago(account_id, client_id)
        if old_kw:
            active_kw = {c["keyword_id"] for c in contents
                         if c.get("current_rank_naver_pc") is not None}
            consistency = len(set(old_kw) & active_kw) / len(old_kw)
        else:
            consistency = 0.5  # 데이터 부족 시 중립

        # volume_bonus
        volume_bonus = min(total / 30, 1.0)

        # 종합 점수
        score = (
            exposure_rate * 35
            + rank_quality * 35
            + consistency  * 20
            + volume_bonus * 10
        )
        score = round(min(100.0, score), 1)
        grade = _score_to_grade(score)

        # ── 이전 등급 조회 ────────────────────────────────
        prev = self._fetch_previous_grade(account_id)
        previous_grade  = prev["grade"] if prev else None
        prev_exposure   = prev["exposure_rate"] if prev else 0
        prev_top10      = prev["top10_ratio"] if prev else 0

        # ── 등급 변화 이유 생성 ───────────────────────────
        reason = self._build_change_reason(
            account_name, total,
            exposure_rate, prev_exposure,
            top10_ratio, prev_top10,
            grade, previous_grade,
            consistency,
        )

        self._upsert_grade(account_id, client_id, {
            "total_published":   total,
            "exposed_keywords":  exposed_count,
            "exposure_rate":     round(exposure_rate * 100, 2),
            "avg_rank":          round(avg_rank, 1) if avg_rank else None,
            "top3_count":        top3_count,
            "top10_count":       top10_count,
            "top3_ratio":        round(top3_ratio, 2),
            "top10_ratio":       round(top10_ratio, 2),
            "consistency_rate":  round(consistency * 100, 2),
            "account_score":     score,
            "grade":             grade,
            "previous_grade":    previous_grade,
            "grade_change_reason": reason,
        }, today)

        grade_changed = (previous_grade is not None and previous_grade != grade)
        result = {
            "account_id":    account_id,
            "account_name":  account_name,
            "grade":         grade,
            "previous_grade": previous_grade,
            "reason":        reason,
            "score":         score,
            "grade_changed": grade_changed,
        }
        return result

    # ──────────────────────────────────────────────────────
    # 이유 텍스트 생성
    # ──────────────────────────────────────────────────────

    @staticmethod
    def _build_change_reason(
        name: str,
        total: int,
        exposure_rate: float,
        prev_exposure: float,
        top10_ratio: float,
        prev_top10: float,
        grade: str,
        prev_grade: Optional[str],
        consistency: float,
    ) -> str:
        if prev_grade is None:
            return f"신규 계정 발행 {total}건 기록, 초기 등급 {grade}급 책정"

        if prev_grade == grade:
            return f"등급 유지 ({grade}급). 노출률 {exposure_rate*100:.0f}%, TOP10비율 {top10_ratio:.0f}%"

        exposure_ch  = exposure_rate * 100 - prev_exposure
        top10_ch     = top10_ratio - prev_top10
        direction    = "승급" if _grade_num(grade) > _grade_num(prev_grade) else "강등"

        parts = []
        if abs(exposure_ch) >= 5:
            parts.append(f"노출률 {prev_exposure:.0f}%→{exposure_rate*100:.0f}% {'상승' if exposure_ch>0 else '하락'}")
        if abs(top10_ch) >= 5:
            parts.append(f"TOP10 비율 {prev_top10:.0f}%→{top10_ratio:.0f}% {'개선' if top10_ch>0 else '하락'}")
        if total > 10 and consistency < 0.4:
            parts.append(f"최근 30일 과다발행({total}건)으로 순위 유지율 하락")
        if total >= 10 and prev_grade == "C":
            parts.append(f"신규 계정 발행 {total}건 달성, 노출 시작")

        reason_body = ", ".join(parts) if parts else f"종합 점수 변화"
        return f"{reason_body}으로 {prev_grade}→{grade} {direction}"

    # ──────────────────────────────────────────────────────
    # DB Upsert
    # ──────────────────────────────────────────────────────

    def _upsert_grade(
        self, account_id: str, client_id: str, data: dict, today: str
    ) -> None:
        record = {
            "account_id":  account_id,
            "client_id":   client_id,
            "measured_at": today,
            **data,
        }
        self.db.client.from_("account_grades").upsert(
            record,
            on_conflict="account_id,measured_at",
        ).execute()

    # ──────────────────────────────────────────────────────
    # Slack 알림
    # ──────────────────────────────────────────────────────

    def _notify_grade_changes(self, changes: list[dict]) -> None:
        lines = ["📊 *[계정 등급 변동]*", "━━━━━━━━━━━━━━━━━━━━━━━━━━"]
        for c in changes:
            prev = c.get("previous_grade", "?")
            curr = c["grade"]
            direction = "⬆️ 승급!" if _grade_num(curr) > _grade_num(prev) else "⬇️ 강등"
            lines.append(f"*{c['account_name']}*: {prev} → {curr} {direction}")
            lines.append(f"사유: {c['reason']}")
        slack_client.send("\n".join(lines), channel_type="alerts")
