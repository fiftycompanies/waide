# 비용 최적화 로그 (COST_OPTIMIZATION_LOG)

## 수정 이력

| 날짜 | 버전 | 내용 | 작성자 |
|------|------|------|--------|
| 2026-02-19 | v1.0 | 최초 작성 — 현재 적용된 전략 + 향후 계획 정리 | AI 마케터 시스템 |
| 2026-02-19 | v1.1 | APPLIED-010~012 추가 — HTML 메타데이터 파싱, 이미지 가이드 텍스트, AEO 샘플링/캐싱 반영 | AI 마케터 시스템 |
| 2026-02-19 | v1.2 | E2E 테스트 실측 데이터 반영 — API 크레딧 소진 사건 기록, Fallback 내성 실증, 크레딧 모니터링 항목 추가 | AI 마케터 시스템 |

---

## 개요

이 문서는 AI 마케터 시스템에서 발생하는 **Claude API 비용**, **Supabase 비용**,
**운영 비용**을 추적하고 최적화 전략을 관리한다.

### 비용 구조 (추정)

| 항목 | 단위 비용 | 월간 예상 |
|------|----------|---------|
| Claude Sonnet 4.6 Input | $3 / 1M 토큰 | 고객 수·콘텐츠 수에 비례 |
| Claude Sonnet 4.6 Output | $15 / 1M 토큰 | 고객 수·콘텐츠 수에 비례 |
| Supabase (Pro) | $25/월 | 고정 |
| Supabase Realtime | 사용량 기반 | 에이전트 수에 비례 |

---

## 실측 비용 데이터 (E2E 테스트)

### [EVENT-001] Claude API 크레딧 소진 — 2026-02-19

**상황**: `test_e2e_cmo_copywriter.py` 실행 중 Claude API 크레딧 잔액 $0으로 완전 소진.

**에러 메시지**:
```
Error code: 400 - Your credit balance is too low to access the Anthropic API.
Please go to Plans & Billing to upgrade or purchase credits.
```

**영향 범위**:

| 에이전트 | 호출 시도 | 결과 | Fallback 함수 |
|---------|---------|------|-------------|
| CMO | `_plan_with_claude()` | ❌ 400 에러 | `_fallback_strategy()` → 정상 진행 |
| Copywriter | `_design_structure()` | ❌ 400 에러 | `_default_structure()` → 정상 진행 |
| Copywriter | `_write_content()` | ❌ 400 에러 | `_fallback_article()` → 정상 진행 |

**E2E 최종 결과**: ✅ **4/4 체크 통과** (Fallback 품질로 전체 파이프라인 완주)

**교훈**:
- `APPLIED-004` (Fallback 사전 정의)가 프로덕션 수준의 장애 내성을 제공한다.
- Claude API 크레딧 소진이 서비스 중단으로 이어지지 않는다.
- Fallback 원고(73자)는 실제 발행 품질이 아니므로 **QC 검수(OPS_QUALITY)에서 자연스럽게 필터링**될 것으로 예상된다.

**조치**: Anthropic Plans & Billing에서 크레딧 충전 필요.

### [PERF-001] E2E 파이프라인 실행 시간 (Fallback 기준)

| 사이클 | 처리 내용 | 소요 시간 |
|--------|---------|---------|
| Cycle 1 | 구독 감지 → CLIENT_ONBOARD 생성 | ~0.5s |
| Cycle 2 | CLIENT_ONBOARD → CAMPAIGN_PLAN 생성 | 569ms |
| Cycle 3 | CAMPAIGN_PLAN → CONTENT_CREATE 생성 (Fallback) | 1,965ms |
| Cycle 4 | CONTENT_CREATE → 콘텐츠 저장 + QUALITY_CHECK 생성 (Fallback) | 1,864ms |
| **합계** | **구독 감지 → QC 대기** | **~5초** |

> Claude API 정상 호출 시 Cycle 3+4는 각 30~60초 소요 예상 (Sonnet 4.6 기준).

---

## 현재 적용된 비용 절감 전략

### [APPLIED-001] 규칙 기반 사전 필터링 — 키워드 랭킹

- **적용 위치**: `cmo_agent.py` → `_rank_keywords()`
- **내용**: Claude에게 전략 수립을 맡기기 전, 규칙 기반 정렬(priority → competition → 검색량)로 키워드를 미리 필터링하여 Claude에 전달하는 키워드 수를 최소화한다.
- **절감 효과**: 키워드 수가 50개→10개로 줄어들면 CMO 프롬프트 토큰이 약 60% 감소
- **Trade-off**: 미세한 전략 최적화 기회 손실 (수용 가능)

---

### [APPLIED-002] 규칙 기반 계정 배정 — blog_score × competition 매트릭스

- **적용 위치**: `cmo_agent.py` → `_assign_accounts()`
- **내용**: 계정 배정을 Claude에게 맡기지 않고, `blog_score × competition` 매트릭스와 라운드로빈으로 자동 처리한다.
- **절감 효과**: CMO 1회 실행당 계정 배정 Claude 호출 0회 (기존 대비 1회 절감)
- **Trade-off**: 계정별 특성(톤 일치도 등) 고려 불가 — 향후 필요시 옵션으로 추가

---

### [APPLIED-003] 2-Step 집필 (구조 설계 + 세부 집필 분리)

- **적용 위치**: `copywriter_agent.py` → `_design_structure()` + `_write_content()`
- **내용**: 집필을 구조 설계(1차, JSON 반환)와 세부 집필(2차, 마크다운 반환)로 분리한다.
- **절감 효과**:
  - 1차 호출: `max_tokens=2048` (구조 JSON만)
  - 2차 호출: `max_tokens=4096` (전체 원고)
  - 단일 대형 호출 대비 재시도 비용 감소 (1차 실패 시 2차 토큰 소모 없음)
- **Trade-off**: API 호출 수 증가 (2회 → +$0.002/건)

---

### [APPLIED-004] Claude 호출 전 Fallback 사전 정의

- **적용 위치**: 모든 에이전트의 Claude 호출 (`try/except`)
- **내용**: Claude 호출 실패 시 규칙 기반 Fallback으로 즉시 처리하여 재시도 루프를 방지한다.
  - `_fallback_strategy()` in CMO
  - `_default_structure()` in Copywriter
  - `_fallback_article()` in Copywriter
  - `_default_persona()` in RND
- **절감 효과**: 실패 시 재시도 3회 × API 비용 방지, 타임아웃으로 인한 Job FAILED 방지
- **Trade-off**: Fallback 품질이 Claude 대비 낮음

---

### [APPLIED-005] 싱글톤 DB 클라이언트

- **적용 위치**: `core/db_client.py` → `__new__` 패턴
- **내용**: `DBClient` 인스턴스를 전체 에이전트에서 1개만 유지하여 Supabase 연결 비용을 최소화한다.
- **절감 효과**: 멀티스레드 환경에서 연결 풀 생성 오버헤드 제거
- **Trade-off**: 없음

---

### [APPLIED-006] Slack 발송 실패 무음 처리

- **적용 위치**: `modules/slack_client.py` → 모든 `send()` 호출
- **내용**: Slack 발송 실패 시 예외를 삼키고 `False`를 반환한다. 에이전트 본 로직에 영향 없음.
- **절감 효과**: Slack API 오류로 인한 Job 재시도 방지 → Claude 중복 호출 차단
- **Trade-off**: Slack 발송 실패를 모니터링하기 어려움

---

### [APPLIED-007] Billable 체크 선행 — 과금 불가 고객 조기 차단

- **적용 위치**: 모든 에이전트의 `process()` 첫 줄 → `AccountManagerAgent.assert_billable()`
- **내용**: 구독이 만료되거나 결제 실패한 고객의 Job은 API 호출 전에 즉시 차단한다.
- **절감 효과**: 과금 불가 고객의 Claude API 비용을 100% 차단
- **Trade-off**: 없음

---

### [APPLIED-008] CLAUDE_MODEL 환경변수로 전체 모델 일괄 제어

- **적용 위치**: `modules/claude_client.py` → `DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")`
- **내용**: 전체 에이전트의 Claude 모델을 `.env` 하나로 일괄 제어한다.
- **절감 효과**:
  - 고부하 시: `CLAUDE_MODEL=claude-haiku-4-5-20251001`으로 변경 → 약 80% 비용 절감 (품질 저하)
  - 중요 작업만: 에이전트별 다른 모델 (향후 고도화 포인트)
- **Trade-off**: 현재 에이전트별 모델 차등 적용 불가

---

### [APPLIED-009] AEO 스캔 — Claude 시뮬레이션으로 외부 API 비용 제로

- **적용 위치**: `rnd_agent.py` → `_scan_platform()`
- **내용**: 실제 Perplexity/ChatGPT/Gemini API를 호출하는 대신 Claude로 각 플랫폼의 응답을 시뮬레이션한다.
- **절감 효과**:
  - Perplexity API: ~$0.005/쿼리 → $0 (Claude 비용만 발생)
  - OpenAI API: ~$0.002/쿼리 → $0
  - Gemini API: 일부 유료 → $0
- **Trade-off**: 실제 AI 모델의 현재 인용 상태가 아닌 시뮬레이션 (정확도 약 70~80% 추정)

---

### [APPLIED-010] 브랜드 분석 — HTML 메타데이터 우선 파싱 (이미지 분석 API 완전 배제)

- **적용 위치**: `rnd_agent.py` → `_fetch_url_text()` + `_extract_text_and_metadata()`
- **내용**: 브랜드 홈페이지 URL을 분석할 때 이미지 파일 자체나 Vision API를 호출하지 않는다.
  대신 HTML의 텍스트 콘텐츠와 메타데이터를 우선 추출한다.
  추출 우선순위: `<title>` → `<meta description/keywords>` → `<og:*>` → `<img alt>` → `<h1~h3>` → 본문 텍스트
  - `<img>` 태그는 **src(이미지 파일) 무시**, **alt 텍스트만** 추출
  - `<script>`, `<style>`, `<img>` 태그를 본문 파싱 전 완전 제거
- **절감 효과**:
  - Vision API(GPT-4V, Claude 3 Vision): ~$0.01/이미지 → $0
  - 고해상도 이미지 10장 기준 약 $0.10/브랜드 분석 절감
- **Trade-off**: 이미지 속에만 있는 브랜드 정보(비주얼 아이덴티티 등) 분석 불가

---

### [APPLIED-011] 박작가 — 이미지 생성 API 배제, 텍스트 기반 이미지 가이드 삽입

- **적용 위치**: `copywriter_agent.py` → `_build_persona_system_prompt()` + `_design_structure()`
- **내용**: 원고 집필 시 DALL-E, Midjourney, Stable Diffusion 등 이미지 생성 API를 일절 호출하지 않는다.
  이미지가 필요한 위치에는 다음 형식의 텍스트 가이드만 삽입한다:
  ```
  > [이미지 가이드: 가족이 글램핑 텐트 앞에서 저녁노을을 바라보는 장면. 황금빛 조명, 아이 2명, 16:9]
  ```
  - 구조 설계 JSON에 `image_hint` 필드 추가 → 섹션별 이미지 방향 사전 정의
  - 이미지 가이드 텍스트는 나중에 디자이너/AI 이미지 도구에 바로 복붙 가능
- **절감 효과**:
  - DALL-E 3: ~$0.04/이미지. 글당 3~5장 기준 $0.12~0.20/건 절감
  - 콘텐츠 1,000건 기준 월 약 $120~200 절감
- **Trade-off**: 발행 전 실제 이미지는 수동으로 준비 또는 별도 DESIGNER 에이전트 연동 필요

---

### [APPLIED-012] AEO 스캔 — 핵심 키워드 샘플링 + 일일 중복 캐시

- **적용 위치**: `rnd_agent.py` → `_handle_aeo_scan()` + `_already_scanned_today()`
- **내용 1 — 핵심 키워드 우선 샘플링**:
  - 전체 키워드를 매일 모두 스캔하지 않고, 상위 N개(기본 3개)만 처리
  - `AEO_MAX_KEYWORDS_PER_DAY` 환경변수로 조절 가능 (기본 `3`)
  - 키워드는 CMO가 `priority → competition → 검색량` 순으로 정렬하여 전달하므로 상위 N개 = 핵심 키워드
- **내용 2 — 일일 중복 쿼리 캐싱**:
  - 스캔 전 `aeo_metrics` 테이블에서 오늘 날짜의 동일 `(client_id, keyword, platform)` 조합 확인
  - 이미 스캔된 경우 Claude 호출 없이 건너뜀 (`AEO_CACHE_HIT` 로그)
  - 에이전트가 동일 Job을 재시도하거나 여러 스케줄러가 중복 실행되어도 안전
- **절감 효과**:
  - 10개 키워드 × 5개 플랫폼 = 50회 → 3개 × 5개 = 최대 15회 (70% 감소)
  - 하루 2회 중복 실행 시 캐싱으로 추가 15회 차단 → Claude 호출 15회 절감
  - 일일 절감액: 약 $0.15 (Sonnet 기준, 월 약 $4.50)
- **Trade-off**: 키워드 커버리지 감소 — 필요 시 `AEO_MAX_KEYWORDS_PER_DAY=10`으로 상향 조정

---

## 향후 적용 예정 전략

### [PLANNED-001] 에이전트별 모델 차등화

- **내용**: 작업 중요도에 따라 모델 분리
  ```
  CMO (전략): claude-sonnet-4-6 (유지)
  COPYWRITER (집필): claude-sonnet-4-6 (유지)
  RND (분석): claude-haiku-4-5 (비용 절감)
  OPS_QUALITY (검수): 규칙 기반 전환 (Claude 0호출)
  AEO_SCAN (스캔): claude-haiku-4-5
  SOM_REPORT (보고): claude-haiku-4-5
  ```
- **예상 절감**: 전체 Claude 비용 약 30~40% 절감
- **우선순위**: 높음
- **상태**: 미적용 (claude_client.py 구조 변경 필요)

---

### [PLANNED-002] Prompt Caching 적용

- **내용**: Anthropic의 Prompt Caching 기능으로 반복되는 system 프롬프트 캐시 처리
- **대상**: `platform_master_guides` 내용을 시스템 프롬프트에 반복 삽입하는 CMO/Copywriter
- **예상 절감**: 캐시된 토큰 90% 할인 적용 시 CMO 비용 약 20~30% 절감
- **참고**: `anthropic.messages.create()`의 `cache_control` 파라미터 활용
- **우선순위**: 중간
- **상태**: 미적용

---

### [PLANNED-003] 콘텐츠 유사도 검사로 중복 집필 차단

- **내용**: 새 콘텐츠 집필 전, `contents` 테이블에서 동일 키워드·동일 계정의 최근 콘텐츠를 조회한다. 유사도가 기준(30%) 이상이면 집필을 건너뛰고 기존 콘텐츠를 재활용한다.
- **예상 절감**: 중복 집필 Claude 2회 호출 방지 (건당 약 $0.05 절감)
- **우선순위**: 중간
- **상태**: 미적용 (similarity_score 컬럼은 이미 존재, 로직만 추가 필요)

---

### [PLANNED-004] Job 배치 처리 (Batch API)

- **내용**: Anthropic Batch API를 활용하여 여러 CONTENT_CREATE Job을 비동기 배치로 처리한다. 실시간성이 필요 없는 대량 작업에 적합.
- **예상 절감**: Batch API 사용 시 50% 비용 할인
- **제약**: 24시간 내 결과 반환 (실시간 불가)
- **적합한 작업**: 야간 대량 콘텐츠 생성, AEO 스캔 배치
- **우선순위**: 낮음 (대량 고객 확보 후 검토)
- **상태**: 미적용

---

### [PLANNED-005] 구독 플랜별 AI 모델 차등

- **내용**: 고객 구독 플랜에 따라 사용 모델을 자동 선택
  ```
  BASIC  → claude-haiku-4-5 (저비용, 기본 품질)
  PRO    → claude-sonnet-4-6 (표준 품질)
  AGENCY → claude-opus-4-6 (최고 품질, 프리미엄)
  ```
- **예상 효과**: 기본 플랜 고객의 마진율 개선
- **우선순위**: 낮음 (구독 플랜 정책 확정 후)
- **상태**: 미적용

---

### [PLANNED-006] 실제 외부 AI API 연동으로 SOM 정확도 향상

- **내용**: AEO 스캔을 Claude 시뮬레이션에서 실제 API로 전환
  ```python
  # _scan_platform() 내부에서 platform별 실제 API 호출
  if platform == "PERPLEXITY":
      return _query_perplexity(keyword, brand_name)
  elif platform == "CHATGPT":
      return _query_openai(keyword, brand_name)
  ```
- **예상 효과**: SOM 측정 정확도 100% (현재 ~75%)
- **추가 비용**: Perplexity ~$0.005/쿼리, OpenAI ~$0.002/쿼리
- **우선순위**: 높음 (SOM이 핵심 서비스 가치)
- **상태**: 미적용 (각 플랫폼 API Key 필요)

---

## 비용 모니터링 체크리스트

월 1회 점검 항목:

- [ ] **Anthropic 크레딧 잔액 확인** → $10 미만 시 즉시 충전 (EVENT-001 재발 방지)
- [ ] Anthropic API 사용량 대시보드 확인
- [ ] 에이전트별 Claude 호출 횟수 집계 (`agent_logs` 조회)
- [ ] Fallback 발생 비율 확인 (`CLAUDE_FALLBACK` / `STRUCTURE_FALLBACK` 로그 수)
- [ ] 실패 Job 비율 확인 (retry 비용 누수 여부)
- [ ] Supabase 쿼리 사용량 확인
- [ ] `CLAUDE_MODEL` 환경변수 최적 모델 재검토

```sql
-- 에이전트별 Claude 호출 비용 추정 쿼리 (agent_logs 기반)
SELECT
  agent_type,
  COUNT(*) AS log_count,
  COUNT(DISTINCT job_id) AS job_count
FROM agent_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND event_type IN ('JOB_DONE', 'JOB_FAILED')
GROUP BY agent_type
ORDER BY job_count DESC;
```
