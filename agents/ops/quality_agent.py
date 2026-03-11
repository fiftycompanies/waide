"""
quality_agent.py
QC 검수 에이전트 — QC 검수봇 (OPS_QUALITY) v2

역할:
  COPYWRITER가 생성한 콘텐츠 초안을 자동 검수하고
  PASS 시 OPS_PUBLISHER에게 발행 Job을 넘긴다.

검수 기준 (총 100점, scoring_weights.qc_scoring에서 동적 로딩):
  1. 글자 수        : 20점 — target 대비 90%+→20, 70%+→10, 50%+→5
  2. 해요체 비율    : 15점 — 80%+→15, 60%+→8, 미만→0 + FAIL 트리거
  3. 키워드 밀도    : 15점 — 1~3%→15, 0.5~1% or 3~5%→8
  4. H2 구조       : 10점 — 추천형5, 리뷰형4, 정보형3 필수
  5. 이미지 홀더    : 10점 — 5+→10, 3+→5
  6. 금지 표현      : 10점 — 만점10, 금지어 1개당 -3 (최소 0)
  7. 비교표         : 10점 — 추천형만 (|가 10+개→10)
  8. CTA 포함      : 5점  — 브랜드명+URL→5, 브랜드명만→3
  9. 해시태그       : 5점  — 10~20개→5, 5~9개→3

통과 기준 : fail_threshold(70) 이상 + 해요체 haeyo_minimum(60%) 이상
결과 반영 : contents.quality_score, contents.publish_status
             jobs.quality_gate_result / score / notes
"""
import re

from core.base_agent import BaseAgent
from core.account_manager_agent import AccountManagerAgent
from modules import claude_client, slack_client


# ── 금지 표현 패턴 ────────────────────────────────────
FORBIDDEN_PATTERNS = [
    # AI 특수 표현
    r"AI\s*요약",
    r"본\s*글은",
    r"핵심\s*요약",
    # 학술체 (~이다/~한다)
    r"(?<!\w)[가-힣]+이다\s*[\.。]",
    r"(?<!\w)[가-힣]+한다\s*[\.。]",
    r"(?<!\w)[가-힣]+된다\s*[\.。]",
    r"(?<!\w)[가-힣]+있다\s*[\.。]",
    r"(?<!\w)[가-힣]+없다\s*[\.。]",
    r"(?<!\w)[가-힣]+하였다\s*[\.。]",
    r"(?<!\w)[가-힣]+되었다\s*[\.。]",
    # AI 표현
    r"종합적으로\s*(분석|정리|판단|평가)",
    r"결론적으로",
    r"이상으로",
    r"본\s*글에서는",
    r"본\s*포스트에서는",
    r"것으로\s*(보인다|판단된다|생각된다|추정된다)",
]

# 해요체 문장 종결 패턴
HAEYO_ENDINGS = [
    r"[가-힣]+요\s*[\.。!?~]",
    r"[가-힣]+요\s*$",
    r"[가-힣]+에요\s*[\.。!?~]?",
    r"[가-힣]+이에요\s*[\.。!?~]?",
    r"[가-힣]+네요\s*[\.。!?~]?",
    r"[가-힣]+거든요\s*[\.。!?~]?",
    r"[가-힣]+인데요\s*[\.。!?~]?",
    r"[가-힣]+더라고요\s*[\.。!?~]?",
    r"[가-힣]+았어요\s*[\.。!?~]?",
    r"[가-힣]+었어요\s*[\.。!?~]?",
    r"[가-힣]+했어요\s*[\.。!?~]?",
    r"[가-힣]+해요\s*[\.。!?~]?",
    r"[가-힣]+될까요\s*[\.。!?~]?",
    r"[가-힣]+할까요\s*[\.。!?~]?",
    r"[가-힣]+나요\s*[\.。!?~]?",
    r"[가-힣]+죠\s*[\.。!?~]?",
    r"[가-힣]+세요\s*[\.。!?~]?",
    r"[가-힣]+래요\s*[\.。!?~]?",
    r"[가-힣]+볼게요\s*[\.。!?~]?",
    r"[가-힣]+줄게요\s*[\.。!?~]?",
    r"[가-힣]+갈게요\s*[\.。!?~]?",
    r"[가-힣]+드려요\s*[\.。!?~]?",
    r"[가-힣]+답니다\s*[\.。!?~]?",
    r"[가-힣]+습니다\s*[\.。!?~]?",
]

# H2 필수 개수 (content_type별)
H2_REQUIREMENTS = {
    "list": 5,
    "review": 4,
    "info": 3,
    "single": 3,
    "special": 2,
}

# ── 기본 가중치 (DB 로딩 실패 시 폴백) ────────────────
DEFAULT_QC_WEIGHTS = {
    "char_count": 20,
    "haeyo_ratio": 15,
    "keyword_density": 15,
    "h2_structure": 10,
    "image_placeholders": 10,
    "forbidden_terms": 10,
    "comparison_table": 10,
    "cta_included": 5,
    "hashtags": 5,
    "fail_threshold": 70,
    "haeyo_minimum": 0.6,
}


class QualityAgent(BaseAgent):

    AGENT_TYPE = "OPS_QUALITY"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)
        self._qc_weights: dict | None = None

    def _load_qc_weights(self) -> dict:
        """scoring_weights.qc_scoring을 DB에서 로딩. 실패 시 기본값."""
        if self._qc_weights:
            return self._qc_weights
        try:
            settings = self.db.get_settings("scoring_weights")
            if settings and "qc_scoring" in settings:
                self._qc_weights = settings["qc_scoring"]
                return self._qc_weights
        except Exception as e:
            self.logger.warning("WEIGHTS_LOAD_FAIL", f"QC 가중치 로딩 실패, 기본값 사용: {e}")
        self._qc_weights = DEFAULT_QC_WEIGHTS
        return self._qc_weights

    # ──────────────────────────────────────────────────────
    # Job 디스패치
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        job_type = job.get("job_type")

        if job_type == "QUALITY_CHECK":
            return self._handle_quality_check(job)
        else:
            raise ValueError(f"QualityAgent가 처리할 수 없는 job_type: {job_type}")

    # ──────────────────────────────────────────────────────
    # 핵심 핸들러: 품질 검수 (v2)
    # ──────────────────────────────────────────────────────

    def _handle_quality_check(self, job: dict) -> dict:
        payload    = job.get("input_payload", {})
        client_id  = payload.get("client_id")
        content_id = payload.get("content_id")
        keyword    = payload.get("keyword", "")
        platform   = payload.get("platform", "NAVER_BLOG")

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        # ── 가중치 로딩 ────────────────────────────────────
        w = self._load_qc_weights()

        # ── START 슬랙 메시지 ────────────────────────────────────
        slack_client.send(
            f"🔍 '{keyword}' QC 검수 시작 — 9개 항목 v2 검수 중...",
            agent_type="OPS_QUALITY",
            channel_type="pipeline",
        )

        # 콘텐츠 본문 로드
        content = self.db.get_content(content_id) if content_id else None
        if not content:
            self.logger.warning(
                "CONTENT_NOT_FOUND",
                f"content_id={content_id} 콘텐츠를 찾을 수 없습니다.",
                job_id=job["id"],
            )
            return {"status": "CONTENT_NOT_FOUND", "content_id": content_id}

        body = content.get("body", "")

        # 글자 수: 본문에서 직접 계산 (코드 블록/주석 제외)
        clean_body_for_count = re.sub(r"```[\s\S]*?```", "", body)
        clean_body_for_count = re.sub(r"<!--[\s\S]*?-->", "", clean_body_for_count)
        char_count = len(clean_body_for_count.replace("\n", "").replace(" ", "").strip())

        # content_type 추출
        content_type = payload.get("content_type", content.get("content_type", "single")) or "single"

        # 브랜드명 (CTA 검사용)
        brand_name = payload.get("company_name", "") or content.get("brand_name", "") or ""

        # ── 9개 항목 검수 (v2) ───────────────────────────────
        checks = self._run_checks_v2(body, char_count, keyword, content_type, brand_name, w)

        # 총점 계산
        score = sum(c["score"] for c in checks)
        score = max(0.0, min(100.0, score))

        # FAIL 판정: fail_threshold 미만 OR 해요체 FAIL 트리거
        fail_threshold = w.get("fail_threshold", 70)
        force_fail = any(c.get("force_fail") for c in checks)
        passed = score >= fail_threshold and not force_fail

        result_str = "PASS" if passed else "FAIL"
        notes = " | ".join(
            f"{c['name']}: {c['score']}/{c['max']}점"
            + (f" ({c['note']})" if c.get("note") else "")
            for c in checks
        )

        self.logger.info(
            "QC_RESULT",
            f"'{keyword}' QC {result_str} ({score:.0f}/100): {notes}",
            job_id=job["id"],
        )

        # ── AI SEO 감사 (PASS된 경우만) ────────────────────
        ai_audit_notes = ""
        if passed and body:
            ai_audit = self._run_ai_seo_audit(body, keyword, platform, job["id"])
            if ai_audit:
                ai_audit_notes = f" | AI감사: {ai_audit}"
                notes = notes + ai_audit_notes

        # ── DB 반영 ────────────────────────────────────────
        new_status = "approved" if passed else "rejected"
        self.db.update_content(content_id, {
            "quality_score":  score,
            "publish_status": new_status,
        })
        self.set_quality_gate(
            job_id=job["id"],
            result=result_str,
            score=score,
            notes=notes,
        )

        # ── 슬랙 보고 ──────────────────────────────────────
        company = payload.get("company_name", "")
        slack_client.send_qc_report(
            company_name=company,
            keyword=keyword,
            platform=platform,
            result=result_str,
            score=score,
            checks=[
                {"name": c["name"], "passed": c["score"] >= c["max"] * 0.5, "note": c.get("note", "")}
                for c in checks
            ],
            content_id=content_id,
            account_name=payload.get("account_name"),
        )

        # ── PASS → OPS_PUBLISHER에 발행 Job 전달 ──────────
        if passed:
            self.create_child_job(
                parent_job=job,
                job_type="PUBLISH",
                assigned_agent="OPS_PUBLISHER",
                title=f"발행: '{keyword}' ({platform})",
                input_payload={
                    "content_id":   content_id,
                    "client_id":    client_id,
                    "keyword":      keyword,
                    "platform":     platform,
                    "company_name": company,
                    "account_id":   payload.get("account_id"),
                    "account_name": payload.get("account_name"),
                    "word_count":   char_count,
                },
            )
            self.logger.success(
                "QC_PASSED",
                f"'{keyword}' QC 통과 → 발행 대기열 등록",
                job_id=job["id"],
            )
        else:
            fail_reason = "해요체 미달 FAIL" if force_fail else f"점수 미달 ({score:.0f}<{fail_threshold})"
            self.logger.warning(
                "QC_FAILED",
                f"'{keyword}' QC 미달 ({fail_reason}) → rejected",
                job_id=job["id"],
            )

        return {
            "content_id":  content_id,
            "keyword":     keyword,
            "qc_result":   result_str,
            "qc_score":    score,
            "checks":      [{"name": c["name"], "score": c["score"], "max": c["max"]} for c in checks],
            "new_status":  new_status,
        }

    # ──────────────────────────────────────────────────────
    # v2 검수 항목 실행 (9개 항목, 감점 없는 가산제)
    # ──────────────────────────────────────────────────────

    def _run_checks_v2(
        self,
        body: str,
        char_count: int,
        keyword: str,
        content_type: str,
        brand_name: str,
        w: dict,
    ) -> list[dict]:
        """9개 항목 검수. 각 항목은 {name, score, max, note, force_fail?} 반환."""
        return [
            self._check_char_count(char_count, w.get("char_count", 20)),
            self._check_haeyo_ratio(body, w.get("haeyo_ratio", 15), w.get("haeyo_minimum", 0.6)),
            self._check_keyword_density(body, keyword, w.get("keyword_density", 15)),
            self._check_h2_structure(body, content_type, w.get("h2_structure", 10)),
            self._check_image_placeholders(body, w.get("image_placeholders", 10)),
            self._check_forbidden_terms(body, w.get("forbidden_terms", 10)),
            self._check_comparison_table(body, content_type, w.get("comparison_table", 10)),
            self._check_cta_included(body, brand_name, w.get("cta_included", 5)),
            self._check_hashtags(body, w.get("hashtags", 5)),
        ]

    # ── ① 글자 수 (20점) ────────────────────────────────
    def _check_char_count(self, char_count: int, max_pts: int) -> dict:
        target = 2000
        ratio = char_count / target if target > 0 else 0
        if ratio >= 0.9:
            pts = max_pts        # 90%+ → 만점
        elif ratio >= 0.7:
            pts = max_pts // 2   # 70%+ → 절반
        elif ratio >= 0.5:
            pts = max_pts // 4   # 50%+ → 1/4
        else:
            pts = 0
        return {
            "name": "글자 수",
            "score": pts,
            "max": max_pts,
            "note": f"{char_count:,}자 (target {target:,}자 대비 {ratio:.0%})",
        }

    # ── ② 해요체 비율 (15점) ─────────────────────────────
    def _check_haeyo_ratio(self, body: str, max_pts: int, haeyo_min: float) -> dict:
        clean = re.sub(r"```[\s\S]*?```", "", body)
        clean = re.sub(r"<!--[\s\S]*?-->", "", clean)
        clean = re.sub(r"^#{1,6}\s.*$", "", clean, flags=re.MULTILINE)
        clean = re.sub(r"\|[^\n]+\|", "", clean)
        clean = re.sub(r"\[이미지\s*가이드\s*:[^\]]*\]", "", clean)

        sentences = re.split(r"[\.。!?]\s*|\n+", clean)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]

        if len(sentences) < 3:
            return {
                "name": "해요체 비율",
                "score": max_pts,
                "max": max_pts,
                "note": "문장 수 부족 (검사 생략, 만점 처리)",
            }

        haeyo_count = 0
        for sentence in sentences:
            for pattern in HAEYO_ENDINGS:
                if re.search(pattern, sentence):
                    haeyo_count += 1
                    break

        ratio = haeyo_count / len(sentences)
        force_fail = ratio < haeyo_min

        if ratio >= 0.8:
            pts = max_pts        # 80%+ → 만점
        elif ratio >= 0.6:
            pts = max_pts // 2   # 60%+ → 절반 (8점)
        else:
            pts = 0              # 미만 → 0 + FAIL 트리거

        note = f"{ratio:.0%} ({haeyo_count}/{len(sentences)})"
        if force_fail:
            note += f" → FAIL (기준 {haeyo_min:.0%})"

        return {
            "name": "해요체 비율",
            "score": pts,
            "max": max_pts,
            "note": note,
            "force_fail": force_fail,
        }

    # ── ③ 키워드 밀도 (15점) ─────────────────────────────
    def _check_keyword_density(self, body: str, keyword: str, max_pts: int) -> dict:
        if not keyword or not body:
            return {"name": "키워드 밀도", "score": 0, "max": max_pts, "note": "키워드 미지정"}

        clean = re.sub(r"```[\s\S]*?```", "", body)
        total_len = len(clean.replace(" ", "").replace("\n", ""))
        if total_len == 0:
            return {"name": "키워드 밀도", "score": 0, "max": max_pts, "note": "본문 비어 있음"}

        kw_len = len(keyword)
        kw_count = len(re.findall(re.escape(keyword), clean, re.IGNORECASE))
        density = (kw_count * kw_len) / total_len * 100

        if 1.0 <= density <= 3.0:
            pts = max_pts        # 1~3% → 만점
        elif (0.5 <= density < 1.0) or (3.0 < density <= 5.0):
            pts = max_pts // 2   # 0.5~1% or 3~5% → 절반 (8점)
        else:
            pts = 0

        return {
            "name": "키워드 밀도",
            "score": pts,
            "max": max_pts,
            "note": f"{density:.2f}% ({kw_count}회/{total_len:,}자)",
        }

    # ── ④ H2 구조 (10점) ─────────────────────────────────
    def _check_h2_structure(self, body: str, content_type: str, max_pts: int) -> dict:
        count = len(re.findall(r"^##\s", body, re.MULTILINE))
        required = H2_REQUIREMENTS.get(content_type, 3)

        if count >= required:
            pts = max_pts        # 충족 → 만점
        elif count >= required - 1:
            pts = max_pts // 2   # 1개 부족 → 절반
        else:
            pts = 0

        return {
            "name": "H2 구조",
            "score": pts,
            "max": max_pts,
            "note": f"{count}개 (필수 {required}개, {content_type}형)",
        }

    # ── ⑤ 이미지 플레이스홀더 (10점) ──────────────────────
    def _check_image_placeholders(self, body: str, max_pts: int) -> dict:
        md_images = len(re.findall(r"!\[", body))
        guide_images = len(re.findall(r"\[이미지\s*가이드\s*:", body))
        eng_guides = len(re.findall(r"\[Image\s*Guide\s*:", body, re.IGNORECASE))
        emoji_guides = len(re.findall(r"🖼️\s*이미지\s*가이드", body))
        count = md_images + guide_images + eng_guides + emoji_guides

        if count >= 5:
            pts = max_pts        # 5+개 → 만점
        elif count >= 3:
            pts = max_pts // 2   # 3+개 → 절반
        else:
            pts = 0

        return {
            "name": "이미지 플레이스홀더",
            "score": pts,
            "max": max_pts,
            "note": f"{count}개",
        }

    # ── ⑥ 금지 표현 (10점) ───────────────────────────────
    def _check_forbidden_terms(self, body: str, max_pts: int) -> dict:
        clean = re.sub(r"```[\s\S]*?```", "", body)
        clean = re.sub(r"<!--[\s\S]*?-->", "", clean)

        violation_count = 0
        examples: list[str] = []
        for pattern in FORBIDDEN_PATTERNS:
            matches = re.findall(pattern, clean)
            violation_count += len(matches)
            if matches and len(examples) < 3:
                found = matches[0]
                examples.append(found if isinstance(found, str) else str(found))

        # 만점 10, 금지어 1개당 -3점 (최소 0)
        pts = max(0, max_pts - violation_count * 3)

        note = f"{violation_count}건 감지"
        if examples:
            note += f" 예: {examples}"

        return {
            "name": "금지 표현",
            "score": pts,
            "max": max_pts,
            "note": note,
        }

    # ── ⑦ 비교표 (10점) ──────────────────────────────────
    def _check_comparison_table(self, body: str, content_type: str, max_pts: int) -> dict:
        # 추천형(list)만 검사
        if content_type != "list":
            return {
                "name": "비교표",
                "score": max_pts,
                "max": max_pts,
                "note": "N/A (추천형만 해당, 만점 처리)",
            }

        pipe_count = body.count("|")
        if pipe_count >= 10:
            pts = max_pts  # |가 10개 이상 → 만점
        else:
            pts = 0

        return {
            "name": "비교표",
            "score": pts,
            "max": max_pts,
            "note": f"| 기호 {pipe_count}개" + (" (충족)" if pts > 0 else " (부족)"),
        }

    # ── ⑧ CTA 포함 (5점) ─────────────────────────────────
    def _check_cta_included(self, body: str, brand_name: str, max_pts: int) -> dict:
        has_url = bool(re.search(r"https?://", body))
        has_brand = bool(brand_name) and brand_name in body

        if has_brand and has_url:
            pts = max_pts        # 브랜드명 + URL → 만점 (5점)
        elif has_brand:
            pts = 3              # 브랜드명만 → 3점
        else:
            pts = 0

        note_parts = []
        if has_brand:
            note_parts.append("브랜드명 O")
        else:
            note_parts.append("브랜드명 X")
        if has_url:
            note_parts.append("URL O")
        else:
            note_parts.append("URL X")

        return {
            "name": "CTA 포함",
            "score": pts,
            "max": max_pts,
            "note": ", ".join(note_parts),
        }

    # ── ⑨ 해시태그 (5점) ─────────────────────────────────
    def _check_hashtags(self, body: str, max_pts: int) -> dict:
        hashtags = re.findall(r"#[가-힣a-zA-Z0-9_]+", body)
        count = len(hashtags)

        if 10 <= count <= 20:
            pts = max_pts        # 10~20개 → 만점 (5점)
        elif 5 <= count <= 9:
            pts = 3              # 5~9개 → 3점
        else:
            pts = 0

        return {
            "name": "해시태그",
            "score": pts,
            "max": max_pts,
            "note": f"{count}개",
        }

    # ──────────────────────────────────────────────────────
    # AI 기반 SEO 감사 + 스키마 보안 감사
    # ──────────────────────────────────────────────────────

    def _run_ai_seo_audit(
        self,
        body: str,
        keyword: str,
        platform: str,
        job_id: str,
    ) -> str:
        """
        [SKILL: SEO Analyzer] Claude로 테크니컬 SEO 정밀 분석.
        [SKILL: Security Reviewer] Schema.org JSON-LD 코드 취약점 감사.
        """
        schema_block = ""
        if "```json" in body:
            try:
                schema_block = body.split("```json", 1)[1].split("```", 1)[0].strip()[:1000]
            except Exception:
                pass

        system = (
            "당신은 최고 수준의 SEO 감사 전문가입니다.\n\n"

            "### [SKILL: SEO Analyzer — 테크니컬 SEO 정밀 분석]\n"
            "- 네이버·Google 알고리즘 관점에서 기술적 SEO 결함을 탐지한다.\n"
            "- 키워드 밀도, 헤딩 구조(H2→H3 스킵 여부), 내부 링크, 메타 설명 최적화.\n\n"

            "### [SKILL: Security Reviewer — 스키마 코드 결함 및 취약점 감사]\n"
            "- Schema.org JSON-LD의 필수 필드 누락 여부 검사.\n"
            "- 허위 @id, 가짜 datePublished, XSS/Injection 취약점 탐지.\n\n"

            "응답은 반드시 한 줄 요약으로만 (50자 이내). 형식: '[SEO감사] {결과}'"
        )

        body_preview = body[:500].replace("\n", " ")
        user = (
            f"키워드: {keyword} / 플랫폼: {platform}\n"
            f"본문 앞부분: {body_preview}\n"
            + (f"JSON-LD 스키마:\n{schema_block}" if schema_block else "스키마 없음")
        )

        try:
            result = claude_client.complete_routed(
                agent_type="OPS_QUALITY",
                system=system,
                user=user,
                task_hint="스키마 보안 감사",
                max_tokens=100,
                as_json=False,
            )
            return result.strip()[:80]
        except Exception as e:
            self.logger.warning("AI_AUDIT_FAIL", f"AI SEO 감사 실패: {e}", job_id=job_id)
            return ""
