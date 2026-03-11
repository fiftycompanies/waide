"""
keyword_grader.py
ANALYST_MATCH — 키워드 난이도 계산기

역할:
  keywords 테이블의 검색량·경쟁도·현재 순위를 종합하여
  keyword_difficulty 테이블에 일별 난이도 스냅샷을 기록한다.

처리 Job:
  KEYWORD_GRADE: 특정 client_id의 전체 키워드 난이도 재계산

경쟁도 산출 (A안):
  1. 월간 검색량 구간: ~1000(low) / 1000~10000(medium) / 10000~(high)
  2. 네이버 광고 API compIdx 값 반영 (있으면)
  3. 우리 콘텐츠 상위권이면 난이도 하향 조정
  4. 데이터 부족 시 "미측정" 표시

점수 공식:
  difficulty_score = (search_demand × 30) + (competition × 40) + (exposure_gap × 30)
  등급: S(75~100) / A(55~74) / B(35~54) / C(0~34)
  opportunity_score = search_demand × (1 - competition_factor) × 100
"""
from datetime import date
from typing import Optional

from core.base_agent import BaseAgent

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


class KeywordGraderAgent(BaseAgent):

    AGENT_TYPE = "ANALYST_MATCH"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")
        if job_type == "KEYWORD_GRADE":
            return self._handle_keyword_grade(job)
        raise ValueError(f"KeywordGraderAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핵심 핸들러: KEYWORD_GRADE
    # ──────────────────────────────────────────────────────

    def _handle_keyword_grade(self, job: dict) -> dict:
        payload   = job.get("input_payload", {})
        client_id = payload.get("client_id")
        today     = date.today().isoformat()
        updated   = 0

        if client_id:
            client_ids = [client_id]
        else:
            res = self.db.client.from_("clients").select("id").execute()
            client_ids = [r["id"] for r in (res.data or [])]

        for cid in client_ids:
            keywords = self._fetch_keywords(cid)
            for kw in keywords:
                try:
                    self._grade_keyword(kw, cid, today)
                    updated += 1
                except Exception as e:
                    self.logger.warning(
                        "GRADE_KEYWORD_FAIL",
                        f"키워드 {kw.get('keyword')} 난이도 계산 실패: {e}",
                        job_id=job["id"],
                    )

        self.logger.info(
            "KEYWORD_GRADE_DONE",
            f"난이도 계산 완료: {updated}개 키워드 처리",
            job_id=job["id"],
        )
        return {"status": "DONE", "updated": updated}

    # ──────────────────────────────────────────────────────
    # 키워드 데이터 조회
    # ──────────────────────────────────────────────────────

    def _fetch_keywords(self, client_id: str) -> list[dict]:
        res = (
            self.db.client.from_("keywords")
            .select(
                "id, keyword, monthly_search_pc, monthly_search_total, "
                "monthly_search_mo, competition_level, competition_index, "
                "current_rank_naver_pc, current_rank_naver_mo, status"
            )
            .eq("client_id", client_id)
            .in_("status", ["active", "queued", "refresh"])
            .execute()
        )
        return res.data or []

    # ──────────────────────────────────────────────────────
    # 난이도 계산 로직
    # ──────────────────────────────────────────────────────

    def _grade_keyword(self, kw: dict, client_id: str, today: str) -> None:
        keyword_id = kw["id"]

        # ── 검색량 지표 ───────────────────────────────────
        total_vol = kw.get("monthly_search_total") or 0
        pc_vol    = kw.get("monthly_search_pc") or 0
        mo_vol    = kw.get("monthly_search_mo") or 0

        search_demand = self._calc_search_demand(total_vol)

        # ── 경쟁도 지표 (A안: 복합 평가) ────────────────────
        competition_level = kw.get("competition_level")
        comp_idx = kw.get("competition_index")
        rank_pc = kw.get("current_rank_naver_pc")
        rank_mo = kw.get("current_rank_naver_mo")

        competition, resolved_level = self._calc_competition_v2(
            total_vol, competition_level, comp_idx, rank_pc
        )

        # ── 노출 격차 지표 ────────────────────────────────
        exposure_gap = self._calc_exposure_gap(rank_pc)

        # ── 종합 점수 ─────────────────────────────────────
        difficulty_score = (
            search_demand * 30
            + competition  * 40
            + exposure_gap * 30
        )
        difficulty_score = round(min(100.0, difficulty_score), 1)
        grade = _score_to_grade(difficulty_score)

        # ── 기회 점수 ─────────────────────────────────────
        opportunity_score = round(search_demand * (1.0 - competition) * 100, 1)
        opportunity_score = round(min(100.0, opportunity_score), 1)

        # ── MO 비율 ───────────────────────────────────────
        if total_vol > 0:
            mo_ratio = round(mo_vol / total_vol * 100, 1)
        else:
            mo_ratio = 0.0

        self._upsert_difficulty(keyword_id, client_id, {
            "search_volume_total":  total_vol,
            "competition_level":    resolved_level,
            "current_rank_pc":      rank_pc,
            "current_rank_mo":      rank_mo,
            "mo_ratio":             mo_ratio,
            "difficulty_score":     difficulty_score,
            "grade":                grade,
            "opportunity_score":    opportunity_score,
        }, today)

        # keywords 테이블 competition_level도 갱신
        self.db.client.from_("keywords").update({
            "competition_level": resolved_level,
        }).eq("id", keyword_id).execute()

    # ──────────────────────────────────────────────────────
    # 개별 지표 계산
    # ──────────────────────────────────────────────────────

    @staticmethod
    def _calc_search_demand(volume: int) -> float:
        """검색량 → 0~1 demand 점수"""
        if volume >= 10000:
            return 1.0
        if volume >= 5000:
            return 0.85
        if volume >= 1000:
            return 0.7
        if volume >= 500:
            return 0.5
        if volume >= 100:
            return 0.35
        if volume >= 20:
            return 0.2
        return 0.1

    @staticmethod
    def _calc_competition_v2(
        volume: int,
        level: Optional[str],
        comp_idx: Optional[float],
        rank_pc: Optional[int],
    ) -> tuple[float, str]:
        """
        경쟁도 복합 평가 (A안):
        1. 검색량 기반 베이스: ~1000(low) / 1000~10000(medium) / 10000~(high)
        2. compIdx (네이버 광고 API) 있으면 반영
        3. 우리 콘텐츠 상위권이면 하향 조정
        4. 데이터 부족 시 "미측정"

        Returns: (competition_factor 0~1, resolved_level str)
        """
        has_volume = volume > 0
        has_comp = level is not None and level != ""

        # 데이터 부족: 검색량도 없고 경쟁도도 없으면 "미측정"
        if not has_volume and not has_comp and comp_idx is None:
            return (0.5, "미측정")

        # Step 1: 검색량 기반 베이스
        if volume >= 10000:
            base = 0.9
            base_level = "high"
        elif volume >= 1000:
            base = 0.6
            base_level = "medium"
        elif volume > 0:
            base = 0.3
            base_level = "low"
        else:
            base = 0.5
            base_level = "미측정"

        # Step 2: compIdx 보정 (네이버 광고 API의 "높음/중간/낮음")
        if has_comp and level in ("high", "높음"):
            base = max(base, 0.85)
            base_level = "high"
        elif has_comp and level in ("medium", "중간"):
            base = (base + 0.6) / 2
            if base_level == "low":
                base_level = "medium"
        elif has_comp and level in ("low", "낮음"):
            base = min(base, 0.35)
            base_level = "low"

        # competition_index (0~100 수치) 추가 보정
        if comp_idx is not None:
            idx_factor = min(comp_idx / 100.0, 1.0)
            base = base * 0.6 + idx_factor * 0.4

        # Step 3: 우리 콘텐츠 상위권이면 난이도 하향
        if rank_pc is not None:
            if rank_pc <= 3:
                base *= 0.7   # TOP3: 30% 하향
            elif rank_pc <= 10:
                base *= 0.85  # TOP10: 15% 하향

        competition = round(min(1.0, max(0.0, base)), 3)

        # resolved level 결정
        if competition >= 0.7:
            resolved = "high"
        elif competition >= 0.4:
            resolved = "medium"
        else:
            resolved = "low"

        return (competition, resolved)

    @staticmethod
    def _calc_competition(level: str) -> float:
        """경쟁도 → 0~1 factor (레거시 호환)"""
        mapping = {"high": 1.0, "높음": 1.0, "medium": 0.6, "중간": 0.6, "low": 0.3, "낮음": 0.3}
        return mapping.get(level, 0.6)

    @staticmethod
    def _calc_exposure_gap(rank_pc: Optional[int]) -> float:
        """현재 순위 → 0~1 exposure_gap (미노출일수록 난이도 높음)"""
        if rank_pc is None:
            return 1.0          # 미노출
        if rank_pc > 20:
            return 0.8          # 20위 밖
        if rank_pc > 10:
            return 0.6          # 11~20위
        if rank_pc > 3:
            return 0.3          # TOP10
        return 0.1              # TOP3

    # ──────────────────────────────────────────────────────
    # DB Upsert
    # ──────────────────────────────────────────────────────

    def _upsert_difficulty(
        self, keyword_id: str, client_id: str, data: dict, today: str
    ) -> None:
        record = {
            "keyword_id":  keyword_id,
            "client_id":   client_id,
            "measured_at": today,
            **data,
        }
        self.db.client.from_("keyword_difficulty").upsert(
            record,
            on_conflict="keyword_id,measured_at",
        ).execute()
