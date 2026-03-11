"""
publish_recommender.py
ANALYST_MATCH — 계정-키워드 매칭 발행 추천 + 피드백 루프

역할:
  account_grades + keyword_difficulty 를 기반으로
  publishing_recommendations 를 생성한다.
  피드백 루프: 발행 후 순위를 추적하여 알고리즘 자동 보정.

처리 Job:
  PUBLISH_RECOMMEND: 추천 재계산
  FEEDBACK_PROCESS:  수락된 추천의 SERP 결과 추적

점수 공식:
  match_score = 100 - (|account_grade_num - keyword_grade_num| × 25) + Σbonuses - Σpenalties
  grade_num: S=4, A=3, B=2, C=1
"""
from datetime import date, timedelta
from typing import Optional

from core.base_agent import BaseAgent
from modules import slack_client

# ── 등급 수치 매핑 ────────────────────────────────────────────
GRADE_NUM = {"S": 4, "A": 3, "B": 2, "C": 1}

# ── 피드백 가중치 매핑 (진화 테이블) ─────────────────────────
# key: "A→A" 형태, value: confidence_delta
FEEDBACK_DELTAS = {
    "top3":       +0.05,
    "top10":      +0.02,
    "top20":       0.00,
    "exposed":     0.00,
    "not_exposed": -0.05,
}

# 월간 리포트 날짜 (매월 1일)
MONTHLY_REPORT_DAY = 1


class PublishRecommenderAgent(BaseAgent):

    AGENT_TYPE = "ANALYST_MATCH"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")
        if job_type == "PUBLISH_RECOMMEND":
            return self._handle_recommend(job)
        if job_type == "FEEDBACK_PROCESS":
            return self._handle_feedback(job)
        raise ValueError(f"PublishRecommenderAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핸들러: PUBLISH_RECOMMEND
    # ──────────────────────────────────────────────────────

    def _handle_recommend(self, job: dict) -> dict:
        payload   = job.get("input_payload", {})
        client_id = payload.get("client_id")
        today     = date.today().isoformat()
        total     = 0

        if client_id:
            client_ids = [client_id]
        else:
            res = self.db.client.from_("clients").select("id").execute()
            client_ids = [r["id"] for r in (res.data or [])]

        for cid in client_ids:
            try:
                count = self._generate_recommendations(cid, today)
                total += count
            except Exception as e:
                self.logger.warning(
                    "RECOMMEND_FAIL",
                    f"클라이언트 {cid} 추천 생성 실패: {e}",
                    job_id=job["id"],
                )

        # 매월 1일 → 월간 리포트 발송
        if date.today().day == MONTHLY_REPORT_DAY:
            self._send_monthly_report()

        self.logger.info(
            "RECOMMEND_DONE",
            f"추천 생성 완료: 총 {total}건",
            job_id=job["id"],
        )
        return {"status": "DONE", "recommendations": total}

    # ──────────────────────────────────────────────────────
    # 핸들러: FEEDBACK_PROCESS
    # ──────────────────────────────────────────────────────

    def _handle_feedback(self, job: dict) -> dict:
        """수락된 추천의 발행 후 7일 SERP 결과를 추적하여 피드백 기록."""
        cutoff  = (date.today() - timedelta(days=7)).isoformat()
        today_s = date.today().isoformat()
        updated = 0

        # status='accepted'이고 feedback_at IS NULL인 추천 조회
        res = (
            self.db.client.from_("publishing_recommendations")
            .select(
                "id, keyword_id, account_id, account_grade, keyword_grade, "
                "match_score, measured_at, client_id"
            )
            .eq("status", "accepted")
            .filter("feedback_at", "is", "null")
            .lte("measured_at", cutoff)
            .execute()
        )
        pending = res.data or []

        for rec in pending:
            try:
                self._process_single_feedback(rec, today_s)
                updated += 1
            except Exception as e:
                self.logger.warning(
                    "FEEDBACK_FAIL",
                    f"추천 {rec['id']} 피드백 처리 실패: {e}",
                    job_id=job["id"],
                )

        self.logger.info(
            "FEEDBACK_DONE",
            f"피드백 처리 완료: {updated}건",
            job_id=job["id"],
        )
        return {"status": "DONE", "processed": updated}

    # ──────────────────────────────────────────────────────
    # 추천 생성 핵심 로직
    # ──────────────────────────────────────────────────────

    def _generate_recommendations(self, client_id: str, today: str) -> int:
        # 오늘 등급 데이터 로드
        account_grades  = self._fetch_account_grades(client_id, today)
        keyword_grades  = self._fetch_keyword_grades(client_id, today)

        if not account_grades or not keyword_grades:
            return 0

        # 보정에 필요한 부가 데이터
        recent_published = self._fetch_recent_published(client_id)   # account_id → 최근 7일 발행수
        overposting_map  = self._fetch_overposting_accounts(client_id)  # account_id → 30일 발행수 > 10
        duplicate_map    = self._fetch_duplicate_map(client_id)         # keyword_id → {account_id 집합}
        synergy_map      = self._fetch_synergy_map(client_id)           # account_id → {main_keyword 집합 (노출 중)}
        failure_map      = self._fetch_failure_map(client_id)           # (acc_grade, kw_grade) → 실패 수

        records = []
        for kw in keyword_grades:
            best = []
            for acc in account_grades:
                score_data = self._calc_match_score(
                    acc, kw,
                    recent_published, overposting_map,
                    duplicate_map, synergy_map, failure_map,
                )
                best.append((score_data["score"], acc, score_data))
            # 상위 3개 계정만 추천
            best.sort(key=lambda x: x[0], reverse=True)
            for rank_idx, (score, acc, sd) in enumerate(best[:3], start=1):
                records.append({
                    "client_id":      client_id,
                    "keyword_id":     kw["keyword_id"],
                    "account_id":     acc["account_id"],
                    "match_score":    round(score, 1),
                    "rank":           rank_idx,
                    "account_grade":  acc["grade"],
                    "keyword_grade":  kw["grade"],
                    "bonuses":        sd["bonuses"],
                    "penalties":      sd["penalties"],
                    "reason":         self._build_reason(acc, kw, rank_idx, score, sd),
                    "status":         "pending",
                    "measured_at":    today,
                })

        if not records:
            return 0

        # upsert (같은 날짜 중복 방지)
        BATCH = 100
        inserted = 0
        for i in range(0, len(records), BATCH):
            batch = records[i: i + BATCH]
            self.db.client.from_("publishing_recommendations").upsert(
                batch,
                on_conflict="keyword_id,account_id,measured_at",
            ).execute()
            inserted += len(batch)

        return inserted

    # ──────────────────────────────────────────────────────
    # 매칭 점수 계산
    # ──────────────────────────────────────────────────────

    def _calc_match_score(
        self,
        acc: dict,
        kw: dict,
        recent_published: dict,
        overposting_map: dict,
        duplicate_map: dict,
        synergy_map: dict,
        failure_map: dict,
    ) -> dict:
        acc_grade = acc["grade"]
        kw_grade  = kw["grade"]
        acc_num   = GRADE_NUM.get(acc_grade, 1)
        kw_num    = GRADE_NUM.get(kw_grade, 1)

        base_score = 100 - abs(acc_num - kw_num) * 25

        bonuses   = {}
        penalties = {}

        # ── 보너스 ──────────────────────────────────────
        # +10: 같은 메인키워드 그룹에서 이미 노출 중 (시너지)
        acc_synergy = synergy_map.get(acc["account_id"], set())
        kw_main     = kw.get("main_keyword", kw.get("keyword", ""))
        if kw_main and kw_main in acc_synergy:
            bonuses["same_group"] = True

        # +10: 경쟁도 '낮음' + 계정 B급 이상
        if kw.get("competition_level") == "low" and acc_num >= 2:
            bonuses["low_competition"] = True

        # +5: 최근 7일 해당 계정 발행 없음
        if recent_published.get(acc["account_id"], 0) == 0:
            bonuses["no_recent"] = True

        # +5: 기회 점수 70 이상
        if (kw.get("opportunity_score") or 0) >= 70:
            bonuses["high_opportunity"] = True

        # ── 페널티 ──────────────────────────────────────
        # -15: 같은 키워드에 이미 발행 중
        if acc["account_id"] in duplicate_map.get(kw["keyword_id"], set()):
            penalties["duplicate"] = True

        # -10: 최근 30일 발행 10건 초과
        if overposting_map.get(acc["account_id"], False):
            penalties["overposting"] = True

        # -20: 계정 전환 또는 신규 (C등급 + 발행 < 5건)
        if acc.get("total_published", 0) < 5 and acc_grade == "C":
            penalties["new_account"] = True

        # -5: 피드백 루프 실패 이력
        combo = f"{acc_grade}→{kw_grade}"
        if failure_map.get(combo, 0) >= 2:
            penalties["feedback_fail"] = True

        # ── 최종 점수 ────────────────────────────────────
        bonus_val   = (
            bonuses.get("same_group", False)      * 10 +
            bonuses.get("low_competition", False) * 10 +
            bonuses.get("no_recent", False)       *  5 +
            bonuses.get("high_opportunity", False)*  5
        )
        penalty_val = (
            penalties.get("duplicate", False)     * 15 +
            penalties.get("overposting", False)   * 10 +
            penalties.get("new_account", False)   * 20 +
            penalties.get("feedback_fail", False) *  5
        )
        score = max(0.0, min(100.0, base_score + bonus_val - penalty_val))

        return {
            "score":    score,
            "bonuses":  bonuses,
            "penalties": penalties,
        }

    # ──────────────────────────────────────────────────────
    # 추천 사유 생성
    # ──────────────────────────────────────────────────────

    @staticmethod
    def _build_reason(
        acc: dict, kw: dict, rank: int, score: float, sd: dict
    ) -> str:
        acc_name  = acc.get("account_name", "?")
        acc_grade = acc["grade"]
        kw_text   = kw.get("keyword", "?")
        kw_grade  = kw["grade"]

        bonuses   = sd["bonuses"]
        penalties = sd["penalties"]

        parts = [f"{acc_grade}급 계정 {acc_name}을 {kw_grade}급 키워드 '{kw_text}'에 추천."]

        if bonuses.get("same_group"):
            parts.append("같은 그룹 키워드에서 이미 노출 중(시너지 +10).")
        if bonuses.get("low_competition"):
            parts.append("저경쟁 키워드 + B급 이상 계정(확실히 잡을 수 있음, +10).")
        if bonuses.get("no_recent"):
            parts.append("최근 7일 해당 계정 발행 없음(분산 효과, +5).")
        if bonuses.get("high_opportunity"):
            parts.append("기회 점수 70+ 키워드(검색량 대비 경쟁 낮음, +5).")

        if penalties.get("duplicate"):
            parts.append("⚠️ 동일 키워드 이미 발행 중(중복 -15).")
        if penalties.get("overposting"):
            parts.append("⚠️ 이번달 과다발행 주의(-10).")
        if penalties.get("new_account"):
            parts.append("⚠️ 신규/전환 계정(-20), 저경쟁 위주 배정 권장.")
        if penalties.get("feedback_fail"):
            parts.append("⚠️ 해당 등급 조합 과거 실패 이력(-5).")

        parts.append(f"매칭 {score:.0f}점.")
        return " ".join(parts)

    # ──────────────────────────────────────────────────────
    # 피드백 처리
    # ──────────────────────────────────────────────────────

    def _process_single_feedback(self, rec: dict, today: str) -> None:
        keyword_id = rec["keyword_id"]
        account_id = rec["account_id"]
        rec_id     = rec["id"]
        measured   = rec["measured_at"]
        acc_grade  = rec.get("account_grade", "B")
        kw_grade   = rec.get("keyword_grade", "B")
        client_id  = rec["client_id"]

        # 발행 이후 최신 순위 조회 (해당 keyword_id + account_id의 콘텐츠)
        rank = self._get_latest_rank(keyword_id, account_id, measured)

        # 결과 분류
        if rank is None:
            result = "not_exposed"
        elif rank <= 3:
            result = "top3"
        elif rank <= 10:
            result = "top10"
        elif rank <= 20:
            result = "top20"
        else:
            result = "not_exposed"

        # days_to_rank 계산
        days = (date.today() - date.fromisoformat(measured)).days

        # confidence_delta
        delta = FEEDBACK_DELTAS.get(result, 0.0)
        acc_num = GRADE_NUM.get(acc_grade, 1)
        kw_num  = GRADE_NUM.get(kw_grade, 1)
        grade_diff = abs(acc_num - kw_num)

        # 등급 차이 ≥ 2이고 실패 → 추가 패널티
        if result == "not_exposed" and grade_diff >= 2:
            delta -= 0.10

        # lesson 자동 생성
        lesson = self._build_lesson(
            acc={"account_id": account_id, "grade": acc_grade, "account_name": self._get_account_name(account_id)},
            kw={"keyword_id": keyword_id, "grade": kw_grade, "keyword": self._get_keyword_text(keyword_id)},
            result=result,
            rank=rank,
            grade_diff=grade_diff,
        )

        # publishing_recommendations 업데이트
        self.db.client.from_("publishing_recommendations").update({
            "feedback_result":        result,
            "feedback_rank_achieved": rank,
            "feedback_at":            today + "T00:00:00+00:00",
        }).eq("id", rec_id).execute()

        # matching_feedback_log 삽입
        self.db.client.from_("matching_feedback_log").insert({
            "recommendation_id":     rec_id,
            "keyword_id":            keyword_id,
            "account_id":            account_id,
            "predicted_grade_match": f"{acc_grade}→{kw_grade}",
            "actual_result":         result,
            "rank_achieved":         rank,
            "days_to_rank":          days,
            "confidence_delta":      delta,
            "lesson":                lesson,
        }).execute()

        # evolving_knowledge에 연동 (의미있는 피드백만)
        if result in ("top3", "top10", "not_exposed"):
            self._update_evolving_knowledge(
                client_id, acc_grade, kw_grade, result, lesson
            )

    @staticmethod
    def _build_lesson(
        acc: dict, kw: dict, result: str, rank: Optional[int], grade_diff: int
    ) -> str:
        acc_name  = acc.get("account_name", acc["account_id"])
        acc_grade = acc["grade"]
        kw_text   = kw.get("keyword", kw["keyword_id"])
        kw_grade  = kw["grade"]

        if result == "top3":
            return (
                f"{acc_name}({acc_grade}급) 계정이 '{kw_text}'({kw_grade}급)에서 {rank}위 달성. "
                f"매칭 전략 유효. 동일 등급 조합 우선 추천 계속."
            )
        if result == "top10":
            return f"TOP10 진입({rank}위). {acc_name}({acc_grade}급)→{kw_grade}급 조합 부분 성공."
        if result in ("top20", "exposed"):
            return f"{rank}위 노출. {acc_name}({acc_grade}급)→{kw_grade}급 추가 최적화 필요."
        # not_exposed
        base = f"미노출. {acc_name}({acc_grade}급)이 {kw_grade}급 키워드에 부적합 가능성."
        if grade_diff >= 2:
            base += " 등급 차이 과대 — 향후 매칭 제외 권장."
        return base

    # ──────────────────────────────────────────────────────
    # evolving_knowledge 업데이트
    # ──────────────────────────────────────────────────────

    def _update_evolving_knowledge(
        self,
        client_id: str,
        acc_grade: str,
        kw_grade: str,
        result: str,
        lesson: str,
    ) -> None:
        verdict = "confirmed" if result in ("top3", "top10") else "rejected"
        hypothesis = (
            f"{acc_grade}급 계정과 {kw_grade}급 키워드 매칭은 "
            f"{'TOP10 진입이 가능하다' if verdict == 'confirmed' else 'TOP10 진입이 어렵다'}."
        )
        self.db.insert_evolving_knowledge({
            "agent_type":  "ANALYST_MATCH",
            "client_id":   client_id,
            "hypothesis":  hypothesis,
            "action":      f"등급 조합 {acc_grade}→{kw_grade} 매칭 추천 실행",
            "outcome":     lesson,
            "verdict":     verdict,
            "tags":        ["matching", f"acc_{acc_grade}", f"kw_{kw_grade}", result],
        })

    # ──────────────────────────────────────────────────────
    # 월간 리포트 Slack
    # ──────────────────────────────────────────────────────

    def _send_monthly_report(self) -> None:
        start = (date.today().replace(day=1) - timedelta(days=1)).replace(day=1).isoformat()
        end   = date.today().isoformat()

        # 추천 통계
        res = (
            self.db.client.from_("publishing_recommendations")
            .select("id, status, feedback_result, account_grade, keyword_grade")
            .gte("measured_at", start)
            .lte("measured_at", end)
            .execute()
        )
        recs = res.data or []

        total     = len(recs)
        accepted  = sum(1 for r in recs if r["status"] == "accepted")
        evaluated = sum(1 for r in recs if r.get("feedback_result"))
        top10     = sum(1 for r in recs if r.get("feedback_result") in ("top3", "top10"))
        success_rate = (top10 / evaluated * 100) if evaluated else 0

        # 등급 조합별 성공률
        same_grade    = [r for r in recs if r["account_grade"] == r["keyword_grade"] and r.get("feedback_result")]
        diff1_grade   = [r for r in recs if r["account_grade"] != r["keyword_grade"]
                         and abs(GRADE_NUM.get(r["account_grade"],1)-GRADE_NUM.get(r["keyword_grade"],1)) == 1
                         and r.get("feedback_result")]

        same_ok  = sum(1 for r in same_grade if r["feedback_result"] in ("top3","top10"))
        diff1_ok = sum(1 for r in diff1_grade if r["feedback_result"] in ("top3","top10"))

        same_rate  = (same_ok  / len(same_grade)  * 100) if same_grade  else 0
        diff1_rate = (diff1_ok / len(diff1_grade) * 100) if diff1_grade else 0

        msg = (
            f"📊 *[매칭 알고리즘 월간 리포트]*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"총 추천: {total}건 | 수락: {accepted}건 | 결과 확인: {evaluated}건\n"
            f"성공률 (TOP10 진입): {success_rate:.0f}% ({top10}/{evaluated})\n"
            f"같은 등급 매칭: {same_rate:.0f}% ({same_ok}/{len(same_grade)}) "
            f"{'✅' if same_rate >= 70 else '⚠️'}\n"
            f"1단계 차이 매칭: {diff1_rate:.0f}% ({diff1_ok}/{len(diff1_grade)}) "
            f"{'✅' if diff1_rate >= 55 else '⚠️'}"
        )
        slack_client.send(msg, channel_type="alerts")

    # ──────────────────────────────────────────────────────
    # 부가 데이터 조회 헬퍼
    # ──────────────────────────────────────────────────────

    def _fetch_account_grades(self, client_id: str, today: str) -> list[dict]:
        res = (
            self.db.client.from_("account_grades")
            .select("account_id, grade, account_score, total_published, exposure_rate")
            .eq("client_id", client_id)
            .eq("measured_at", today)
            .execute()
        )
        # account_name도 JOIN
        accounts = res.data or []
        if not accounts:
            return []
        acc_ids = [a["account_id"] for a in accounts]
        name_res = (
            self.db.client.from_("blog_accounts")
            .select("id, account_name")
            .in_("id", acc_ids)
            .execute()
        )
        name_map = {r["id"]: r["account_name"] for r in (name_res.data or [])}
        for a in accounts:
            a["account_name"] = name_map.get(a["account_id"], a["account_id"])
        return accounts

    def _fetch_keyword_grades(self, client_id: str, today: str) -> list[dict]:
        res = (
            self.db.client.from_("keyword_difficulty")
            .select("keyword_id, grade, difficulty_score, opportunity_score, competition_level")
            .eq("client_id", client_id)
            .eq("measured_at", today)
            .execute()
        )
        kws = res.data or []
        if not kws:
            return []
        kw_ids = [k["keyword_id"] for k in kws]
        kw_res = (
            self.db.client.from_("keywords")
            .select("id, keyword, keyword as main_keyword")
            .in_("id", kw_ids)
            .execute()
        )
        kw_map = {r["id"]: r for r in (kw_res.data or [])}
        for k in kws:
            info = kw_map.get(k["keyword_id"], {})
            k["keyword"] = info.get("keyword", "")
            k["main_keyword"] = info.get("keyword", "")
        return kws

    def _fetch_recent_published(self, client_id: str) -> dict:
        """최근 7일 발행된 콘텐츠 수 by account_id"""
        cutoff = (date.today() - timedelta(days=7)).isoformat()
        res = (
            self.db.client.from_("contents")
            .select("account_id")
            .eq("client_id", client_id)
            .gte("published_at", cutoff)
            .execute()
        )
        counts: dict = {}
        for r in (res.data or []):
            aid = r.get("account_id")
            if aid:
                counts[aid] = counts.get(aid, 0) + 1
        return counts

    def _fetch_overposting_accounts(self, client_id: str) -> dict:
        """최근 30일 10건 초과 발행 계정 (account_id → True)"""
        cutoff = (date.today() - timedelta(days=30)).isoformat()
        res = (
            self.db.client.from_("contents")
            .select("account_id")
            .eq("client_id", client_id)
            .gte("published_at", cutoff)
            .execute()
        )
        counts: dict = {}
        for r in (res.data or []):
            aid = r.get("account_id")
            if aid:
                counts[aid] = counts.get(aid, 0) + 1
        return {aid: True for aid, cnt in counts.items() if cnt > 10}

    def _fetch_duplicate_map(self, client_id: str) -> dict:
        """키워드별 이미 발행된 account_id 집합"""
        res = (
            self.db.client.from_("contents")
            .select("keyword_id, account_id")
            .eq("client_id", client_id)
            .eq("publish_status", "published")
            .execute()
        )
        result: dict = {}
        for r in (res.data or []):
            kid = r.get("keyword_id")
            aid = r.get("account_id")
            if kid and aid:
                result.setdefault(kid, set()).add(aid)
        return result

    def _fetch_synergy_map(self, client_id: str) -> dict:
        """계정별 현재 노출 중인 main_keyword(keyword 텍스트) 집합"""
        # keywords 테이블에서 노출 중인 키워드 조회 (current_rank_naver_pc <= 20)
        kw_res = (
            self.db.client.from_("keywords")
            .select("id, keyword, current_rank_naver_pc")
            .eq("client_id", client_id)
            .filter("current_rank_naver_pc", "not.is", "null")
            .lte("current_rank_naver_pc", 20)
            .execute()
        )
        exposed_kws = {k["id"]: k["keyword"] for k in (kw_res.data or [])}
        if not exposed_kws:
            return {}

        # 해당 키워드의 콘텐츠에서 account_id 조회
        res = (
            self.db.client.from_("contents")
            .select("account_id, keyword_id")
            .eq("client_id", client_id)
            .in_("keyword_id", list(exposed_kws.keys()))
            .execute()
        )
        result: dict = {}
        for r in (res.data or []):
            aid = r.get("account_id")
            kid = r.get("keyword_id")
            if aid and kid and kid in exposed_kws:
                result.setdefault(aid, set()).add(exposed_kws[kid])
        return result

    def _fetch_failure_map(self, client_id: str) -> dict:
        """(acc_grade→kw_grade) 조합별 실패 수"""
        res = (
            self.db.client.from_("matching_feedback_log")
            .select("account_id, keyword_id, predicted_grade_match, actual_result")
            .execute()
        )
        counts: dict = {}
        for r in (res.data or []):
            if r.get("actual_result") == "not_exposed":
                combo = r.get("predicted_grade_match", "?")
                counts[combo] = counts.get(combo, 0) + 1
        return counts

    def _get_latest_rank(
        self, keyword_id: str, account_id: str, since: str
    ) -> Optional[int]:
        """키워드-계정 조합의 발행 후 최신 PC 순위 조회"""
        # keywords 테이블에서 현재 순위 직접 조회
        kw_res = (
            self.db.client.from_("keywords")
            .select("current_rank_naver_pc")
            .eq("id", keyword_id)
            .single()
            .execute()
        )
        return (kw_res.data or {}).get("current_rank_naver_pc")

    def _get_account_name(self, account_id: str) -> str:
        res = (
            self.db.client.from_("blog_accounts")
            .select("account_name")
            .eq("id", account_id)
            .single()
            .execute()
        )
        return (res.data or {}).get("account_name", account_id)

    def _get_keyword_text(self, keyword_id: str) -> str:
        res = (
            self.db.client.from_("keywords")
            .select("keyword")
            .eq("id", keyword_id)
            .single()
            .execute()
        )
        return (res.data or {}).get("keyword", keyword_id)
