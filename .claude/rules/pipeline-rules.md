# 파이프라인 설계 규칙

## 에이전트 파이프라인 불변 원칙

### 1. Job State Machine — 상태 전이 규칙

```
PENDING → IN_PROGRESS → DONE
                      → FAILED (max_retries 초과)
                      → CANCELLED (수동)
```

- 에이전트는 자신이 완료한 Job의 상태만 변경한다
- 다른 에이전트의 Job 상태는 절대 변경 금지
- FAILED된 Job은 수동 PENDING 재설정 없이 자동 재시도하지 않는다

### 2. Child Job 생성 규칙

```python
# ✅ 올바른 패턴
self.create_child_job(
    parent_job=job,
    job_type="CONTENT_CREATE",
    assigned_agent="COPYWRITER",
    title="[콘텐츠 작성] {keyword}",
    input_payload={...},
)
```

- 모든 하위 Job은 `create_child_job()`으로만 생성
- `parent_job_id`를 반드시 연결해 파이프라인 추적 가능하게 유지
- 하위 Job payload에는 `client_id`를 항상 포함

### 3. 결제 상태 확인 — 모든 에이전트 필수

```python
AccountManagerAgent.assert_billable(client_id, job_title=job.get("title", ""))
```

- 모든 `process()` 메서드 최초에 위 한 줄 실행 필수
- 미결제 클라이언트의 Job은 즉시 ValueError로 중단

### 4. Fallback 전략 — 서비스 연속성 보장

- Claude API 실패 → rule-based fallback 반환 (절대 Exception 전파 금지)
- DB 쿼리 실패 → 빈 리스트/None 반환 + WARNING 로그
- Slack 알림 실패 → 무시 (non-critical)

### 5. 비용 최적화 필수 원칙

- AEO 스캔: 하루 1회 캐싱 (중복 스캔 방지)
- 이미지 API 절대 호출 금지 (Vision API 포함)
- 모든 Claude 호출 전 필요성 체크 (캐시/rule-based 대안 우선 검토)

## 스킬 주입 규칙 (Phase 2 준수사항)

### CMO — Content Marketer

```python
# _plan_with_claude()에서 사용할 태스크 힌트
task_hint = "경쟁사 분석 포함 전략 수립" if len(keywords) > 5 else "캠페인 전략"
model = claude_client.route_model("CMO", task_hint)
```

시스템 프롬프트 구조:
1. `[SKILL: Product Strategist]` — STP 포지셔닝
2. `[SKILL: Competitive-Ads-Extractor]` — 경쟁사 빈틈 분석
3. `[SKILL: Writing Plans]` — 실행 가능한 로드맵

### RND — SEO Analyzer

시스템 프롬프트 구조:
1. `[SKILL: Technical Researcher]` — 공식 알고리즘 가이드 분석
2. `[SKILL: Data Prophet]` — 검색량 시계열 예측
3. `[SKILL: Content Research Writer]` — 팩트 발굴 및 출처 검증
4. Tavily API → 동적 웹 검색 (TAVILY_API_KEY 없으면 requests 폴백)

### COPYWRITER — SEO Specialist

시스템 프롬프트 구조:
1. `[SKILL: Technical Writer]` — 결함 없는 JSON-LD 작성
2. `[SKILL: Brainstorming]` — 다변화된 헤드라인 5개+

### OPS_QUALITY — SEO Audit

검수 흐름:
1. Rule-based 검수 (5항목, 100점) — Haiku 사용 금지, 순수 Python
2. Claude AI SEO 감사 — Sonnet 사용 (옵션, 70점 이상 통과 후)
3. Schema 보안 감사 — Sonnet 사용 (JSON-LD 코드 취약점 검사)

## 모니터링 기준

| 지표 | 정상 | 경고 |
|------|------|------|
| 파이프라인 통과율 | ≥ 80% | < 60% |
| QC PASS율 | ≥ 85% | < 70% |
| AEO 인용율 | ≥ 30% | < 15% |
| 에이전트 오류율 | < 5% | > 10% |
| 콘텐츠 평균 글자수 | ≥ 1200 | < 800 |
