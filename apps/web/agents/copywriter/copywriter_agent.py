"""
copywriter_agent.py
콘텐츠 작성 에이전트 — 박작가 (콘텐츠팀)

역할:
  - CMO로부터 CONTENT_CREATE Job 수신
  - Claude 3-Step 집필 (소스 매칭 → 구조+제목 설계 → 본문 집필)
  - Style Transfer: 참조 소스 구조 평균(H2/H3/이미지/글자수)을 목표로 집필
  - 브랜드 스타일 가이드(content_style_guide) 적용: 톤, CTA, 마무리 멘트
  - AEO 원칙: 엔티티 중심 단정적 문장, 상단 AI 요약 답변(200자), 마크다운 표/리스트
  - Schema.org JSON-LD 자동 생성
  - 완료 시 슬랙 보고

집필 흐름:
  CONTENT_CREATE Job 수신
    ↓ _load_brand_context()    brands E-E-A-T + 플랫폼 관계 로드
    ↓ _load_sources()          참조 소스 + 브랜드 페르소나 + Style Transfer 계산
    ↓ _load_platform_guide()   중앙 브레인 AEO/SEO 지침
    ↓ _design_structure()      Claude 1차: JSON 구조 설계 + 제목 생성
    ↓ _write_content()         Claude 2차: 실제 집필 (마크다운) + 소스 참조
    ↓ _generate_schema_ld()    Schema.org JSON-LD 자동 생성
    ↓ _save_content()          contents 테이블 저장
    ↓ send_content_draft_report()  Slack 보고
"""
import json
from datetime import date

from core.base_agent import BaseAgent
from core.account_manager_agent import AccountManagerAgent
from modules import claude_client, slack_client

# 프롬프트 모듈
from copywriter.prompts.title_prompt import (
    build_title_system_prompt,
    build_title_user_prompt,
)
from copywriter.prompts.body_prompt import (
    build_body_system_prompt,
    build_body_user_prompt,
)
from copywriter.prompts.list_prompt import (
    build_list_system_prompt,
    build_list_user_prompt,
)
from copywriter.prompts.review_prompt import (
    build_review_system_prompt,
    build_review_user_prompt,
)
from copywriter.prompts.info_prompt import (
    build_info_system_prompt,
    build_info_user_prompt,
)
from rnd.prompts.source_match_prompt import match_sources_rule_based


class CopywriterAgent(BaseAgent):

    AGENT_TYPE = "COPYWRITER"

    def __init__(self) -> None:
        super().__init__(agent_type=self.AGENT_TYPE)

    # ──────────────────────────────────────────────────────
    # 핵심 처리 흐름
    # ──────────────────────────────────────────────────────

    def process(self, job: dict) -> dict:
        payload   = job.get("input_payload", {})
        client_id = payload.get("client_id")
        keyword   = payload.get("keyword", "")
        platform  = payload.get("platform", "NAVER_BLOG")

        AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))

        self.logger.info(
            "WRITING_START",
            f"'{keyword}' ({platform}) 집필 시작",
            job_id=job["id"],
        )

        # ── START 슬랙 메시지 ────────────────────────────────────
        slack_client.send(
            f"✍️ '{keyword}' ({platform}) 원고 작성 시작 — AI 집필 대기 중...",
            agent_type="COPYWRITER",
            channel_type="pipeline",
        )

        # ── 1. 브랜드 컨텍스트 로드 ──────────────────────────────
        brand, platform_brand, sub_brands = self._load_brand_context(client_id)

        # ── 2. 소스 + 브랜드 페르소나 + Style Transfer 로드 ──────
        source_ctx = self._load_sources(client_id, keyword, payload.get("sub_keyword"), payload.get("source_ids"))
        style_guide = source_ctx.get("style_guide")

        self.logger.info(
            "SOURCES_LOADED",
            f"소스 {source_ctx['source_count']}개 로드, "
            f"Style Transfer: H2={source_ctx['st_targets'].get('avg_h2', 'N/A')}, "
            f"글자수={source_ctx['st_targets'].get('target_word_count', 'N/A')}",
            job_id=job["id"],
        )

        # ── 3. 플랫폼 가이드 로드 (중앙 브레인) ──────────────────
        guide = (
            self.db.get_platform_guide(platform, "AEO")
            or self.db.get_platform_guide(platform, "SEO")
            or {}
        )
        key_signals = guide.get("key_signals", {})

        # ── 4. 구조 설계 + 제목 생성 (Claude 1차) ──────────────
        structure = self._design_structure(
            payload, brand, key_signals, style_guide,
            source_ctx.get("competitor_titles", []),
        )

        # 1차에서 생성된 제목을 payload에 반영
        title_final = structure.get("title_final") or payload.get("content_title", keyword)
        payload["content_title"] = title_final

        self.logger.info(
            "STRUCTURE_DESIGNED",
            f"구조 설계 완료: 섹션 {len(structure.get('sections', []))}개, "
            f"FAQ {len(structure.get('faq', []))}개, 제목: '{title_final[:30]}'",
            job_id=job["id"],
        )

        # ── 5. 세부 집필 (Claude 2차) — 소스 참조 + Style Transfer
        body = self._write_content(
            payload, brand, structure, key_signals,
            source_ctx=source_ctx,
            style_guide=style_guide,
        )
        word_count = len(body.replace("\n", " ").split())
        self.logger.info(
            "CONTENT_WRITTEN",
            f"집필 완료: {word_count:,}자",
            job_id=job["id"],
        )

        # ── 6. Schema.org JSON-LD 생성 ───────────────────────────
        schema_ld = self._generate_schema_ld(
            payload=payload,
            brand=brand,
            platform_brand=platform_brand,
            sub_brands=sub_brands,
            structure=structure,
        )
        schema_types = [node.get("@type", "") for node in schema_ld.get("@graph", [])]

        # ── 7. 본문에 스키마 블록 첨부 ──────────────────────────
        full_body = (
            body
            + "\n\n---\n\n"
            + "<!-- Schema.org JSON-LD (자동 생성) -->\n"
            + "```json\n"
            + json.dumps(schema_ld, ensure_ascii=False, indent=2)
            + "\n```"
        )

        # ── 8. contents 테이블 저장 ──────────────────────────────
        content_record = self._save_content(job, payload, full_body, structure, word_count)
        content_id = content_record["id"] if content_record else None

        self.logger.success(
            "CONTENT_SAVED",
            f"contents 테이블 저장 완료 (id: {str(content_id)[:8]}...)"
            if content_id else "keyword_id 없음 — DB 저장 건너뜀",
            job_id=job["id"],
        )

        # ── 9. OPS_QUALITY에 검수 Job 전달 ──────────────────────
        faq_items = structure.get("faq", [])
        if content_id:
            self.create_child_job(
                parent_job=job,
                job_type="QUALITY_CHECK",
                assigned_agent="OPS_QUALITY",
                title=f"QC 검수: '{keyword}' ({platform})",
                input_payload={
                    "content_id":   str(content_id),
                    "client_id":    client_id,
                    "keyword":      keyword,
                    "platform":     platform,
                    "company_name": payload.get("company_name", ""),
                    "word_count":   word_count,
                    "faq_count":    len(faq_items),
                    "ai_summary":   structure.get("ai_summary", ""),
                    "account_id":   payload.get("account_id"),
                    "account_name": payload.get("account_name"),
                    "content_type": payload.get("content_type", "single"),
                },
            )

        # ── 10. 슬랙 보고 (박작가 페르소나) ──────────────────────
        slack_client.send_content_draft_report(
            company_name=payload.get("company_name", ""),
            keyword=keyword,
            platform=platform,
            content_title=title_final,
            ai_summary=structure.get("ai_summary", ""),
            word_count=word_count,
            schema_types=schema_types,
            faq_count=len(faq_items),
            account_name=payload.get("account_name"),
            content_id=str(content_id) if content_id else None,
        )

        return {
            "client_id":    client_id,
            "keyword":      keyword,
            "platform":     platform,
            "content_id":   str(content_id) if content_id else None,
            "content_title": title_final,
            "word_count":   word_count,
            "faq_count":    len(faq_items),
            "ai_summary":   structure.get("ai_summary", ""),
            "schema_types": schema_types,
            "source_count": source_ctx["source_count"],
        }

    # ──────────────────────────────────────────────────────
    # 헬퍼 1: 브랜드 컨텍스트 로드
    # ──────────────────────────────────────────────────────

    def _load_brand_context(
        self, client_id: str
    ) -> tuple[dict | None, dict | None, list[dict]]:
        """
        brands, platform_brand, sub_brands를 로드.

        반환:
          brand          : 첫 번째 브랜드 (E-E-A-T, press_history 포함)
          platform_brand : 이 브랜드가 속한 플랫폼 (isPartOf 관계)
          sub_brands     : 이 브랜드가 플랫폼이면 하위 입점업체
        """
        brands = self.db.get_brands_by_client(client_id)
        brand  = brands[0] if brands else None

        platform_brand: dict | None = None
        sub_brands: list[dict]      = []

        if brand:
            if brand.get("is_platform"):
                sub_brands = self.db.get_sub_brands(brand["id"])
            else:
                platform_brand = self.db.get_parent_brand(brand["id"])

        return brand, platform_brand, sub_brands

    # ──────────────────────────────────────────────────────
    # 헬퍼 1.5: 소스 + 브랜드 페르소나 + Style Transfer
    # ──────────────────────────────────────────────────────

    def _load_sources(
        self,
        client_id: str,
        keyword: str,
        sub_keyword: str | None = None,
        job_source_ids: list[str] | None = None,
    ) -> dict:
        """
        참조 소스 로드 + 규칙 기반 매칭 + Style Transfer 통계 계산.

        반환:
          source_count       : 매칭된 소스 수
          matched_sources    : 매칭된 소스 목록
          matched_source_ids : 매칭된 소스 ID 목록
          source_context     : 프롬프트용 소스 텍스트 블록
          competitor_titles  : 경쟁사 소스 제목 목록 (제목 생성 참고용)
          st_targets         : Style Transfer 목표 구조 통계
          style_guide        : content_style_guide (브랜드 페르소나)
        """
        result = {
            "source_count": 0,
            "matched_sources": [],
            "matched_source_ids": [],
            "source_context": "",
            "competitor_titles": [],
            "st_targets": {},
            "style_guide": None,
            "brand_persona": None,
        }

        try:
            # 1. 브랜드 페르소나 로드 (default_source_ids + style_guide)
            persona = self.db.get_brand_persona(client_id)
            default_source_ids = []
            if persona:
                default_source_ids = persona.get("default_source_ids") or []
                result["style_guide"] = persona.get("content_style_guide") or {}
                result["brand_persona"] = persona

            # 2. 소스 로드 (캠페인 지정 소스 OR 전체 소스)
            if job_source_ids:
                all_sources = self.db.get_content_sources_by_ids(job_source_ids)
            else:
                all_sources = self.db.get_content_sources(client_id, limit=30)

            if not all_sources:
                return result

            # 3. 규칙 기반 소스 매칭 (Claude 호출 없이 비용 최적화)
            match_result = match_sources_rule_based(
                keyword=keyword,
                sources=all_sources,
                default_source_ids=default_source_ids,
                max_total=8,
            )

            matched_ids = [m["id"] for m in match_result["matched_sources"] if m.get("id")]
            matched_sources = [s for s in all_sources if s.get("id") in set(matched_ids)]

            result["matched_sources"] = matched_sources
            result["matched_source_ids"] = matched_ids
            result["source_count"] = len(matched_sources)

            # 4. 경쟁사 제목 추출 (제목 생성 참고용)
            result["competitor_titles"] = [
                s.get("title", "")
                for s in matched_sources
                if s.get("source_type") == "competitor" and s.get("title")
            ]

            # 5. Style Transfer 목표 통계 계산
            result["st_targets"] = self._calc_style_transfer_targets(matched_sources)

            # 6. 소스 컨텍스트 텍스트 블록 생성 (프롬프트용)
            result["source_context"] = self._build_source_context_block(matched_sources)

        except Exception as e:
            self.logger.warning("SOURCE_LOAD_FAIL", f"소스 로드 실패, 계속 진행: {e}")

        return result

    def _calc_style_transfer_targets(self, sources: list[dict]) -> dict:
        """
        소스의 content_structure 통계를 평균화하여 Style Transfer 목표 반환.
        own_best 소스를 우선 사용하고, 없으면 전체 소스 사용.
        """
        own_best = [s for s in sources if s.get("source_type") == "own_best"]
        target_sources = own_best if own_best else sources

        if not target_sources:
            return {"target_word_count": 2500, "avg_h2": 5, "avg_h3": 8, "avg_images": 6}

        word_counts = []
        h2_counts = []
        h3_counts = []
        img_counts = []

        for s in target_sources:
            cs = s.get("content_structure") or {}
            if cs.get("word_count"):
                word_counts.append(cs["word_count"])
            if cs.get("h2_count") is not None:
                h2_counts.append(cs["h2_count"])
            if cs.get("h3_count") is not None:
                h3_counts.append(cs["h3_count"])
            if cs.get("image_count") is not None:
                img_counts.append(cs["image_count"])

        def avg(lst, default):
            return round(sum(lst) / len(lst)) if lst else default

        target_wc = max(avg(word_counts, 2500), 2500)  # 최소 2500자

        return {
            "target_word_count": target_wc,
            "avg_h2": max(avg(h2_counts, 5), 4),      # 최소 4개 (SEO 규칙)
            "avg_h3": max(avg(h3_counts, 8), 4),
            "avg_images": max(avg(img_counts, 6), 6),  # 최소 6개 (D.I.A+ 규칙)
        }

    def _build_source_context_block(self, sources: list[dict]) -> str:
        """소스 목록을 프롬프트용 텍스트 블록으로 변환."""
        if not sources:
            return ""

        blocks = []
        for i, s in enumerate(sources[:8], 1):
            st = s.get("source_type", "unknown")
            title = s.get("title") or "(제목 없음)"
            usage = "스타일 참조" if st == "own_best" else "정보 참조"
            text = (s.get("content_text") or "")[:1500]  # 각 소스 최대 1500자

            block = f"### 소스 #{i} [{st}] — {usage}\n**제목**: {title}"
            if s.get("url"):
                block += f"\n**URL**: {s['url']}"

            cs = s.get("content_structure") or {}
            if cs:
                block += f"\n**구조**: {cs.get('word_count', 0)}자, H2={cs.get('h2_count', 0)}, H3={cs.get('h3_count', 0)}, 이미지={cs.get('image_count', 0)}"

            peak = cs.get("peak_rank")
            if peak:
                block += f", 최고순위={peak}위"

            if text:
                block += f"\n**본문 발췌**:\n{text}"

            blocks.append(block)

        return "\n\n".join(blocks)

    # ──────────────────────────────────────────────────────
    # 헬퍼 2: 구조 설계 + 제목 생성 (Claude 1차 호출)
    # ──────────────────────────────────────────────────────

    def _design_structure(
        self,
        payload: dict,
        brand: dict | None,
        key_signals: dict,
        style_guide: dict | None = None,
        competitor_titles: list[str] | None = None,
    ) -> dict:
        """
        Claude로 콘텐츠 JSON 구조를 설계한다.
        title_prompt.py의 프롬프트 빌더를 활용하여 제목도 동시에 생성.

        실패 시 규칙 기반 기본 구조 반환.
        """
        # 시스템 프롬프트: 제목 생성 규칙 + 구조 설계 규칙 통합
        title_sys = build_title_system_prompt(style_guide)
        system = (
            title_sys + "\n\n"
            "### [SKILL: Technical Writer — 구조화 문서 설계]\n"
            "- 섹션 타입(text/table/list)을 정확히 지정하고 혼용하지 않는다.\n"
            "- FAQ는 최소 5개 이상, 질문은 실제 검색 쿼리 형태로 작성한다.\n"
            "- AI 요약 답변은 반드시 200자 이내 단정적 문장으로 작성한다.\n\n"
            "반드시 JSON 형식으로만 응답하세요."
        )

        # 브랜드 E-E-A-T 요약
        eeat_summary = self._build_eeat_summary(brand)

        # 최근 보도자료
        press_refs = self._build_press_refs(brand)

        user = f"""## 콘텐츠 구조 설계 + 제목 생성 요청

**키워드**: {payload.get("keyword")}
**서브키워드**: {payload.get("sub_keyword") or "없음"}
**제목 방향**: {payload.get("content_title") or "SEO 최적화된 제목 자동 생성"}
**콘텐츠 관점**: {payload.get("content_angle") or "키워드 중심 정보성 포스트"}
**필수 포함 포인트**: {json.dumps(payload.get("key_points", []), ensure_ascii=False)}
**목표 글자 수**: {payload.get("target_length", 2500)}자

**브랜드명**: {brand["name"] if brand else "없음"}
**브랜드 신뢰도(E-E-A-T)**: {eeat_summary}
**인용 가능한 보도자료**:
{press_refs or "없음"}

**경쟁사 상위 노출 제목** (차별화 필수):
{chr(10).join(f'  - {t}' for t in (competitor_titles or [])[:10]) or "없음"}

**플랫폼 AEO 핵심 지침**:
{json.dumps(key_signals, ensure_ascii=False, indent=2) if key_signals else "기본 SEO 원칙 적용"}

---
아래 JSON 형식으로만 응답하세요:

```json
{{
  "title_candidates": [
    {{"title": "후보 제목 1 (30~45자, 키워드 앞배치)", "angle": "숫자형"}},
    {{"title": "후보 제목 2", "angle": "의문형"}},
    {{"title": "후보 제목 3", "angle": "비교형"}},
    {{"title": "후보 제목 4", "angle": "방법론"}},
    {{"title": "후보 제목 5", "angle": "경험형"}}
  ],
  "title_final": "최종 추천 제목 (클릭율 + SEO 최적화)",
  "title_reason": "선정 이유 (1문장)",
  "ai_summary": "200자 이내 핵심 답변 — 단정적 문장('A는 B이다')으로 작성",
  "sections": [
    {{
      "title": "섹션 제목",
      "type": "text | table | list",
      "content_hint": "이 섹션에서 다룰 내용 방향",
      "table_columns": ["컬럼1", "컬럼2"],
      "image_hint": "이미지 방향 (null이면 불필요)"
    }}
  ],
  "faq": [
    {{"question": "실제 검색 쿼리 형태의 질문?", "answer_hint": "단정적으로 답할 방향"}}
  ],
  "eeat_citation_hint": "본문에 활용할 브랜드 신뢰도 인용 방향 (수치 포함, 1문장)"
}}
```"""

        try:
            return claude_client.complete_routed(
                agent_type="COPYWRITER",
                system=system,
                user=user,
                task_hint="콘텐츠 구조 설계 및 헤드라인 브레인스토밍",
                as_json=True,
            )
        except Exception as e:
            self.logger.warning("STRUCTURE_FALLBACK", f"구조 설계 실패, 기본값 사용: {e}")
            return self._default_structure(payload)

    def _build_eeat_summary(self, brand: dict | None) -> str:
        """브랜드 E-E-A-T 정보를 요약 문자열로 반환."""
        if not brand:
            return "정보 없음"
        eeat = brand.get("eeat_signals", {}) or {}
        exp = eeat.get("expertise", {})
        auth = eeat.get("authoritativeness", {})
        tr = eeat.get("trustworthiness", {})
        parts = []
        if exp.get("evidence"):
            parts.append(f"전문성: {', '.join(exp['evidence'][:2])}")
        if auth.get("press_count"):
            parts.append(f"보도 {auth['press_count']}건")
        if tr.get("reviews_avg"):
            parts.append(f"평점 {tr['reviews_avg']}점({tr.get('reviews_count', 0)}개)")
        return " | ".join(parts) if parts else "정보 없음"

    def _build_press_refs(self, brand: dict | None) -> str:
        """보도자료 요약 문자열 반환."""
        if not brand:
            return ""
        history = (brand.get("press_history") or [])[:3]
        if not history:
            return ""
        return "\n".join(
            f"- {p.get('title', '')} ({p.get('media', '')})"
            for p in history
        )

    def _default_structure(self, payload: dict) -> dict:
        """Claude 실패 시 규칙 기반 기본 구조."""
        kw = payload.get("keyword", "키워드")
        return {
            "title_final": payload.get("content_title") or f"{kw} 완벽 가이드 — 선택 기준부터 추천까지",
            "ai_summary": f"{kw}에 대한 핵심 정보를 정리한다. 선택 기준, 추천 옵션, 주의사항을 단계별로 안내한다.",
            "sections": [
                {"title": f"{kw}란?", "type": "text", "content_hint": "정의와 특징"},
                {"title": "핵심 선택 기준", "type": "table", "content_hint": "비교 기준 정리", "table_columns": ["구분", "설명"]},
                {"title": "추천 옵션 TOP 5", "type": "list", "content_hint": "상위 추천 목록"},
                {"title": "실제 이용 후기 및 팁", "type": "text", "content_hint": "경험 기반 팁"},
                {"title": "주의사항", "type": "list", "content_hint": "실제 이용 시 주의점"},
            ],
            "faq": [
                {"question": f"{kw} 어떻게 선택하나요?", "answer_hint": "핵심 기준 제시"},
                {"question": f"{kw} 가격은 얼마인가요?", "answer_hint": "가격 범위 제시"},
                {"question": f"{kw} 예약은 어떻게 하나요?", "answer_hint": "예약 방법 안내"},
                {"question": f"{kw} 초보자도 괜찮나요?", "answer_hint": "초보자 적합성"},
                {"question": f"{kw} 성수기는 언제인가요?", "answer_hint": "시즌 정보"},
            ],
            "eeat_citation_hint": "브랜드 운영 경험과 전문성을 수치로 인용한다.",
        }

    # ──────────────────────────────────────────────────────
    # 헬퍼 3: 세부 집필 (Claude 2차 호출)
    # ──────────────────────────────────────────────────────

    def _write_content(
        self,
        payload: dict,
        brand: dict | None,
        structure: dict,
        key_signals: dict,
        source_ctx: dict | None = None,
        style_guide: dict | None = None,
    ) -> str:
        """
        content_type에 따라 타입별 프롬프트 빌더를 선택하여 원고를 작성.
        list → list_prompt, review → review_prompt, info → info_prompt
        기타(single/special) → body_prompt (기존 방식)

        실패 시 기본 포맷 원고 반환.
        """
        client_id = payload.get("client_id")
        content_type = payload.get("content_type", "single")

        # evolving_knowledge 블록
        ek_block = self._get_ek_block(client_id)

        # E-E-A-T 요약
        eeat_summary = self._build_eeat_summary(brand)
        press_refs = self._build_press_refs(brand)

        # Style Transfer 목표
        st_targets = (source_ctx or {}).get("st_targets", {})
        source_context = (source_ctx or {}).get("source_context", "")

        # target_length: Style Transfer 목표 또는 payload 설정값
        target_length = st_targets.get("target_word_count") or payload.get("target_length", 2500)

        # DB에서 타입별 커스텀 프롬프트 로드
        db_prompts = {}
        if content_type in ("list", "review", "info"):
            try:
                db_prompts = self.db.get_content_prompts(content_type)
            except Exception:
                pass

        # ── 브랜드 변수 준비 (DB 프롬프트의 {brand_name} 등 치환용) ──
        persona = (source_ctx or {}).get("brand_persona") or {}
        brand_vars = {
            "brand_name": (brand.get("name") if brand else "") or persona.get("name", ""),
            "brand_homepage_url": persona.get("homepage_url") or (brand.get("official_url") if brand else "") or "",
            "brand_tone": "",
        }
        tone_settings = persona.get("tone_voice_settings") or (brand.get("tone_voice_settings") if brand else {}) or {}
        brand_vars["brand_tone"] = tone_settings.get("tone", "")

        def _inject_vars(text: str) -> str:
            """DB 프롬프트의 {brand_name}, {brand_homepage_url}, {brand_tone}을 실제 값으로 치환."""
            for k, v in brand_vars.items():
                text = text.replace("{" + k + "}", v)
            return text

        # ── 공통 규칙 + DB 프롬프트 처리 ──
        from copywriter.prompts.common_rules import get_common_rules
        common_rules_text = db_prompts.get("common_rules") or get_common_rules()

        db_system = db_prompts.get("system")
        db_user = db_prompts.get("user")

        if db_system:
            # 공통 규칙을 시스템 프롬프트 앞에 자동 삽입 + 브랜드 변수 주입
            db_system = common_rules_text + "\n\n" + db_system
            db_system = _inject_vars(db_system)
        if db_user:
            db_user = _inject_vars(db_user)

        # 공통 프롬프트 빌드 파라미터
        prompt_kwargs = dict(
            brand=brand,
            style_guide=style_guide,
            evolving_knowledge=ek_block,
            db_prompt=db_system,
        )
        user_kwargs = dict(
            keyword=payload.get("keyword", ""),
            title=payload.get("content_title", ""),
            sub_keyword=payload.get("sub_keyword"),
            content_angle=payload.get("content_angle"),
            target_length=target_length,
            brand_name=brand.get("name") if brand else None,
            eeat_summary=eeat_summary,
            press_refs=press_refs or None,
            key_signals=key_signals,
            structure=structure,
            source_context=source_context or None,
            style_transfer_targets=st_targets if st_targets else None,
            db_prompt=db_user,
        )

        # 타입별 프롬프트 빌더 선택
        if content_type == "list":
            system = build_list_system_prompt(**prompt_kwargs)
            user = build_list_user_prompt(**user_kwargs)
        elif content_type == "review":
            system = build_review_system_prompt(**prompt_kwargs)
            user = build_review_user_prompt(**user_kwargs)
        elif content_type == "info":
            system = build_info_system_prompt(**prompt_kwargs)
            user = build_info_user_prompt(**user_kwargs)
        else:
            # 기존 body_prompt 사용 (single, special 등)
            system = build_body_system_prompt(**prompt_kwargs)
            user = build_body_user_prompt(**user_kwargs)

        try:
            return claude_client.complete_routed(
                agent_type="COPYWRITER",
                system=system,
                user=user,
                task_hint="블로그 포스트 집필",  # MED(Sonnet)
                max_tokens=8192,
                as_json=False,
            )
        except Exception as e:
            self.logger.warning("WRITE_FALLBACK", f"집필 실패, 기본 템플릿 사용: {e}")
            return self._fallback_article(payload, structure)

    def _get_ek_block(self, client_id: str | None) -> str:
        """
        evolving_knowledge에서 활성 지식(confirmed+pending)을 가져와
        시스템 프롬프트에 주입할 텍스트 블록으로 변환.
        """
        try:
            records = self.db.get_active_knowledge(
                agent_type="COPYWRITER",
                client_id=client_id,
                limit=5,
            )
            if not records:
                return ""
            lines = []
            for r in records:
                verdict = "확정" if r.get("verdict") == "confirmed" else "검토중"
                lines.append(f"- [{verdict}] {r.get('hypothesis', '')}")
                if r.get("outcome"):
                    lines.append(f"  -> 결과: {r['outcome']}")
            return (
                "\n\n### [진화 지식] 과거 성과 데이터 기반 집필 규칙\n"
                + "\n".join(lines)
                + "\n위 패턴을 집필에 반영하되, AEO 원칙을 최우선으로 준수한다."
            )
        except Exception:
            return ""

    def _fallback_article(self, payload: dict, structure: dict) -> str:
        """Claude 실패 시 기본 구조 마크다운 반환."""
        kw = payload.get("keyword", "키워드")
        title = payload.get("content_title") or f"{kw} 완벽 가이드"
        ai_summary = structure.get("ai_summary", f"{kw}에 대한 핵심 정보를 정리한 가이드이다.")
        faq_lines = "\n\n".join(
            f"**Q. {f['question']}**\n\nA. {f.get('answer_hint', '추가 정보를 확인하세요.')}"
            for f in structure.get("faq", [])
        )

        sections = structure.get("sections", [])
        body_parts = []
        for sec in sections:
            body_parts.append(f"## {sec.get('title', '')}\n\n{sec.get('content_hint', '')}에 대한 내용이다.\n")
            body_parts.append("> [이미지 가이드: 이 섹션 관련 이미지]\n")

        return (
            f"# {title}\n\n"
            f"## AI 요약 답변\n\n> {ai_summary}\n\n"
            f"---\n\n"
            + "\n".join(body_parts)
            + f"\n## FAQ\n\n{faq_lines}"
        )

    # ──────────────────────────────────────────────────────
    # 헬퍼 4: Schema.org JSON-LD 생성
    # ──────────────────────────────────────────────────────

    def _generate_schema_ld(
        self,
        payload: dict,
        brand: dict | None,
        platform_brand: dict | None,
        sub_brands: list[dict],
        structure: dict,
    ) -> dict:
        """
        Schema.org JSON-LD를 자동 생성한다.

        @graph 구성:
          1. Article       — 블로그 포스트 본체
          2. FAQPage       — FAQ 섹션
          3. LocalBusiness/Organization — 브랜드 엔티티
        """
        graph: list[dict] = []
        today = date.today().isoformat()

        # ── Article ───────────────────────────────────────
        article: dict = {
            "@type":         "Article",
            "headline":      payload.get("content_title", payload.get("keyword")),
            "description":   structure.get("ai_summary", ""),
            "keywords":      ", ".join(filter(None, [
                                payload.get("keyword"),
                                payload.get("sub_keyword"),
                             ])),
            "datePublished": today,
            "inLanguage":    "ko",
        }
        if brand:
            article["author"] = {
                "@type": brand.get("entity_type", "Organization"),
                "name":  brand.get("name"),
                "url":   brand.get("official_url"),
            }
            article["publisher"] = article["author"]
        graph.append(article)

        # ── FAQPage ───────────────────────────────────────
        faq_items = structure.get("faq", [])
        if faq_items:
            graph.append({
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name":  item.get("question", ""),
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text":  item.get("answer_hint", item.get("answer", "")),
                        },
                    }
                    for item in faq_items
                ],
            })

        # ── Brand Entity (LocalBusiness / Organization) ───
        if brand:
            entity_type = brand.get("entity_type", "LocalBusiness")
            entity: dict = {
                "@type": entity_type,
                "name":  brand.get("name"),
            }
            if brand.get("official_url"):
                entity["@id"] = brand["official_url"]
                entity["url"] = brand["official_url"]

            sns = brand.get("sns_links") or {}
            if sns:
                entity["sameAs"] = [v for v in sns.values() if v]

            if platform_brand and platform_brand.get("name"):
                entity["isPartOf"] = {
                    "@type": platform_brand.get("entity_type", "Organization"),
                    "name":  platform_brand["name"],
                }
                if platform_brand.get("official_url"):
                    entity["isPartOf"]["@id"]  = platform_brand["official_url"]
                    entity["isPartOf"]["url"]   = platform_brand["official_url"]

            if sub_brands:
                entity["member"] = [
                    {
                        "@type": sb.get("entity_type", "LocalBusiness"),
                        "@id":   sb.get("official_url", ""),
                        "name":  sb.get("name", ""),
                    }
                    for sb in sub_brands
                    if sb.get("name")
                ]

            graph.append(entity)

        return {"@context": "https://schema.org", "@graph": graph}

    # ──────────────────────────────────────────────────────
    # 헬퍼 5: contents 테이블 저장
    # ──────────────────────────────────────────────────────

    def _save_content(
        self,
        job: dict,
        payload: dict,
        body: str,
        structure: dict,
        word_count: int,
    ) -> dict | None:
        """
        AI 생성 원고를 contents 테이블에 저장.
        keyword_id가 없으면 FK 제약 위반이므로 저장 건너뜀.
        """
        keyword_id = payload.get("keyword_id")
        if not keyword_id:
            return None

        ai_summary = structure.get("ai_summary", "")
        meta_desc  = ai_summary[:160] if ai_summary else payload.get("keyword", "")

        tags: list[str] = list(filter(None, [
            payload.get("keyword"),
            payload.get("sub_keyword"),
        ]))

        content_data = {
            "keyword_id":       keyword_id,
            "account_id":       payload.get("account_id"),
            "title":            payload.get("content_title"),
            "body":             body,
            "meta_description": meta_desc,
            "content_type":     payload.get("content_type", "single"),
            "word_count":       word_count,
            "publish_status":   "draft",
            "generated_by":     "ai",
            "is_active":        False,
            "job_id":           job["id"],
            "client_id":        payload.get("client_id"),
            "tags":             tags,
        }

        return self.db.create_content(content_data)
