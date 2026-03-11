# AI 마케터 시스템 아키텍처

## 수정 이력

| 날짜 | 버전 | 내용 | 작성자 |
|------|------|------|--------|
| 2026-02-19 | v1.0 | 최초 작성 (에이전트 파이프라인 001~006 반영) | AI 마케터 시스템 |
| 2026-02-19 | v1.1 | E2E 테스트 완료 결과 반영 — DB 스키마 제약 조건 정정, 테스트 파일 목록 추가, E2E 검증 현황 섹션 신설 | AI 마케터 시스템 |

---

## 1. 시스템 개요

**AI Agent 기반 마케팅 에이전시 자동화 시스템**

피프티컴퍼니가 운영하는 AI 마케팅 에이전시의 핵심 운영 시스템이다.
마케팅 기획(CMO) → 콘텐츠 생성(박작가) → 품질 검수(QC봇) → 발행(발행봇)까지
전 과정을 Python 에이전트가 자동 처리한다.

### 핵심 설계 원칙

- **이벤트 기반 폴링**: 에이전트는 `jobs` 테이블의 PENDING Job을 주기적으로 조회하여 처리
- **단방향 체인**: 각 에이전트는 처리 완료 시 다음 에이전트의 `create_child_job()`으로 Job 전달
- **실패 복원력**: 모든 Claude API 호출에 규칙 기반 Fallback, Job에 최대 3회 자동 재시도
- **자기 진화**: `evolving_knowledge` 테이블에 가설→실행→결과를 축적하여 전략 개선
- **단일 DB 클라이언트**: `DBClient` 싱글톤으로 전체 에이전트 공유, Supabase Service Key로 RLS 우회

---

## 2. 에이전트 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCOUNT_MANAGER (어시스턴트)                    │
│  구독 스캔 → CLIENT_ONBOARD → CMO에 CAMPAIGN_PLAN Job 전달         │
└─────────────────────┬───────────────────────────────────────────┘
                      │  CAMPAIGN_PLAN Job
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CMO (김이사)                                │
│  키워드 랭킹 → Claude 전략 수립 → 계정 배정 → CONTENT_CREATE Job    │
│  (키워드 수만큼 Copywriter Job 생성)                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │  CONTENT_CREATE Jobs (1~N개)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COPYWRITER (박작가)                             │
│  브랜드 컨텍스트 + 페르소나 로드                                     │
│  → Claude 1차: 구조 설계 (JSON blueprint)                         │
│  → Claude 2차: 집필 (마크다운, AEO 원칙 적용)                       │
│  → Schema.org JSON-LD 자동 생성                                   │
│  → contents 테이블 저장 (draft, is_active=False)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │  QUALITY_CHECK Job
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OPS_QUALITY (QC 검수봇)                         │
│  5개 항목 자동 검수 (100점 만점)                                     │
│  ≥70점: publish_status → approved                                │
│  <70점: publish_status → revision_needed, 슬랙 알림               │
└─────────────────────┬───────────────────────────────────────────┘
                      │  PUBLISH Job (PASS 시만)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OPS_PUBLISHER (발행봇)                            │
│  계정 fixed_ip 확인 → 발행 처리                                      │
│  is_active=True (N_SERP 순위 추적 자동 활성화)                       │
│  publish_status → published                                       │
└─────────────────────────────────────────────────────────────────┘

병렬 실행 에이전트 (독립 루프):

┌──────────────────────────────────────────────────────────────┐
│                       RND (김연구원)                            │
│  NEWS_MONITOR   : 보도자료 부족 감지 → 슬랙 알림                  │
│  SEMANTIC_UPDATE: 시맨틱 키워드 발굴                              │
│  BRAND_ANALYZE  : 브랜드 URL/텍스트 → 페르소나 추출 (brand_voice) │
│  AEO_SCAN       : AI 모델별 브랜드 인용 스캔 → aeo_metrics 저장  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  ANALYST_REPORT (리포트봇)                      │
│  SOM_REPORT: aeo_metrics 주간 집계 → som_reports 저장          │
│              → 슬랙 김이사 주간 SOM 보고                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Job 타입 라우팅 테이블

| job_type | assigned_agent | 생성자 | 설명 |
|----------|---------------|--------|------|
| `CLIENT_ONBOARD` | ACCOUNT_MANAGER | SYSTEM (구독 스캔) | 신규 고객 온보딩 |
| `CAMPAIGN_PLAN` | CMO | ACCOUNT_MANAGER | 캠페인 전략 수립 |
| `CONTENT_CREATE` | COPYWRITER | CMO | 콘텐츠 초안 생성 |
| `QUALITY_CHECK` | OPS_QUALITY | COPYWRITER | QC 자동 검수 |
| `PUBLISH` | OPS_PUBLISHER | OPS_QUALITY | 플랫폼 발행 |
| `NEWS_MONITOR` | RND | SCHEDULER / 수동 | 보도자료 현황 체크 |
| `SEMANTIC_UPDATE` | RND | SCHEDULER / 수동 | 시맨틱 키워드 업데이트 |
| `BRAND_ANALYZE` | RND | 수동 / ACCOUNT_MANAGER | 브랜드 페르소나 분석 |
| `AEO_SCAN` | RND | SCHEDULER / 수동 | AI 모델 인용 스캔 |
| `SOM_REPORT` | ANALYST_REPORT | RND / SCHEDULER | 주간 SOM 집계 보고 |

---

## 4. DB 스키마 관계도 및 주요 제약 조건

```
workspaces (1)
    └── clients (N)             ← 고객사
          ├── subscriptions (N)  ← 구독 플랜 (billable 체크 기준)
          ├── keywords (N)       ← 공략 키워드 목록
          ├── accounts (N)       ← 발행 블로그 계정 (fixed_ip 포함)
          ├── brands (N)         ← 브랜드 엔티티
          │     ├── brand_voice      (JSONB) ← 페르소나: 톤, 핵심 단어
          │     ├── target_persona   (JSONB) ← 타겟 독자 정의
          │     ├── eeat_signals     (JSONB) ← E-E-A-T 신뢰 데이터
          │     ├── press_history    (JSONB) ← 보도자료 히스토리
          │     └── brand_relationships (N)  ← 플랫폼↔입점업체 관계
          ├── jobs (N)           ← 에이전트 작업 큐 (이벤트 버스)
          │     ├── parent_job_id    ← Job 체인 추적
          │     ├── quality_gate_*   ← QC 결과 기록
          │     └── input/output_payload (JSONB)
          ├── contents (N)       ← AI 생성 콘텐츠
          │     ├── publish_status   ← draft→approved→published
          │     ├── is_active        ← N_SERP 순위 추적 여부
          │     ├── quality_score    ← QC 점수 (100점 만점)
          │     └── schema_data      ← Schema.org JSON-LD
          ├── aeo_metrics (N)    ← AI 모델 인용 추적 (SOM 원시 데이터)
          │     ├── platform         ← PERPLEXITY/CHATGPT/GEMINI 등
          │     ├── is_cited         ← 인용 여부
          │     └── cited_rank       ← 인용 순서 (1=첫 번째)
          └── som_reports (N)    ← 주간 SOM 집계 보고

공통 테이블:
  agent_logs (N)              ← 모든 에이전트 로그
  serp_results (N)            ← N_SERP 순위 추적 결과
  platform_master_guides (N)  ← 플랫폼별 SEO/AEO 중앙 브레인
  evolving_knowledge (N)      ← 에이전트 가설·결과 자기 진화 기록
  metrics_summary (N)         ← KPI 집계 리포트
```

### 주요 컬럼 제약 조건 (E2E 테스트로 실증 확인)

> **주의**: 아래 값 범위를 벗어나면 `CHECK constraint violation` 에러가 발생한다.

| 테이블 | 컬럼 | 타입 | 허용 값 |
|--------|------|------|---------|
| `keywords` | `priority` | TEXT | `'critical'`, `'high'`, `'medium'`, `'low'` (정수 불가) |
| `accounts` | `platform` | TEXT | `'naver'`, `'tistory'`, `'brunch'`, `'google'`, `'wordpress'`, `'youtube'` (대문자 불가) |
| `accounts` | `status` | TEXT | `'active'`, `'inactive'`, `'banned'` 등 (마이그레이션 참고) |

> CMO 에이전트 내부에서 사용하는 플랫폼 코드 `'NAVER_BLOG'`(대문자)와
> DB `accounts.platform` 필드의 `'naver'`(소문자)는 **별개의 표현**이다.
> CMO의 `_assign_accounts()`는 불일치 시 전체 계정 목록으로 fallback 처리한다.

---

## 5. DB 마이그레이션 이력

| 파일 | 내용 |
|------|------|
| `001_initial_schema.sql` | 기초 스키마 (workspaces, clients, keywords, accounts, contents, serp_results) |
| `002_agent_system.sql` | 에이전트 시스템 (jobs, agent_logs, agent_type/job_type ENUM, quality_gate 컬럼) |
| `003_account_management.sql` | 구독 관리 (subscriptions, billing, 온보딩 트리거) |
| `004_reporting_and_kpi.sql` | KPI 리포팅 (metrics_summary, target_platforms/kpi_goals 클라이언트 확장) |
| `005_entity_evolving_system.sql` | 엔티티 DB (brands, brand_relationships, platform_master_guides, evolving_knowledge) |
| `006_brand_persona_aeo.sql` | 페르소나 + AEO SOM (brand_voice/target_persona 컬럼, aeo_metrics, som_reports) |

---

## 6. 파일 구조

```
ai-marketer/
├── agents/                         # Python 에이전트 시스템
│   ├── main.py                     # 전체 시스템 엔트리포인트 (멀티스레드)
│   ├── core/
│   │   ├── base_agent.py           # 추상 기반 클래스 (폴링, 상태관리, 로깅)
│   │   ├── db_client.py            # Supabase 싱글톤 (44개 메서드)
│   │   ├── account_manager_agent.py# 구독 스캔, 청구 가능 체크
│   │   └── logger.py               # 구조화 로거 (agent_logs 테이블)
│   ├── modules/
│   │   ├── claude_client.py        # Claude API 래퍼 (JSON 파싱, Fallback)
│   │   └── slack_client.py         # Slack Webhook 클라이언트 (페르소나별 발송)
│   ├── cmo/
│   │   └── cmo_agent.py            # 캠페인 전략 수립 (키워드 랭킹, Claude 전략)
│   ├── copywriter/
│   │   └── copywriter_agent.py     # AEO 2-Step 집필 + Schema.org + 페르소나 동기화
│   ├── rnd/
│   │   └── rnd_agent.py            # R&D (보도, 시맨틱, 브랜드 분석, AEO 스캔)
│   ├── ops/
│   │   ├── quality_agent.py        # QC 자동 검수 (5개 항목, 100점)
│   │   └── publisher_agent.py      # 콘텐츠 발행 (is_active=True)
│   ├── analyst/
│   │   └── report_agent.py         # 주간 SOM 리포트 집계
│   ├── test_import_check.py        # 임포트 검증 17개 (DB 연결 불필요)
│   ├── test_e2e_account_manager.py # E2E: 구독 감지→CLIENT_ONBOARD→CMO 체인
│   └── test_e2e_cmo_copywriter.py  # E2E: CMO→Copywriter→QC 체인 (Claude API 포함)
├── packages/database/supabase/
│   └── migrations/                 # SQL 마이그레이션 파일 (001~006)
├── docs/                           # 시스템 문서
│   ├── SYSTEM_ARCHITECTURE.md      # 이 파일
│   ├── AEO_STRATEGY_GUIDE.md       # AEO/SOM 전략 가이드
│   └── COST_OPTIMIZATION_LOG.md   # 비용 최적화 이력
└── apps/                           # Next.js 대시보드 (예정)
```

---

## 7. 환경 변수 (.env)

```env
# Supabase (필수)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>

# Claude API (필수 - 에이전트 지능)
ANTHROPIC_API_KEY=<api_key>
CLAUDE_MODEL=claude-sonnet-4-6    # 전체 에이전트 모델 일괄 변경 가능

# Slack (선택 - 미설정 시 알림만 건너뜀)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# 폴링 주기 (기본 5초)
AGENT_POLL_INTERVAL=5
```

---

## 8. 실행 방법

```bash
cd agents

# 전체 에이전트 상시 실행
python main.py

# 특정 에이전트만 실행
python main.py --agents RND ANALYST_REPORT

# 단일 폴링 후 종료 (테스트)
python main.py --once

# 임포트 검증 (DB 연결 불필요)
python test_import_check.py
```

---

## 9. E2E 검증 현황

### 테스트 결과 요약 (2026-02-19)

| 테스트 파일 | 검증 체인 | 결과 | Claude API | 비고 |
|------------|---------|------|-----------|------|
| `test_import_check.py` | 17개 모듈 임포트 | ✅ 17/17 통과 | 미호출 | DB 연결 불필요 |
| `test_e2e_account_manager.py` | 구독 감지→CLIENT_ONBOARD→CMO CAMPAIGN_PLAN | ✅ 4/4 통과 | 미호출 (Rule-based) | 875ms |
| `test_e2e_cmo_copywriter.py` | CAMPAIGN_PLAN→CONTENT_CREATE→contents 저장→QUALITY_CHECK | ✅ 4/4 통과 | 크레딧 소진 → **Fallback 작동** | Fallback 품질로 통과 |

### Fallback 내성 검증 (2026-02-19)

Claude API 크레딧 소진 상태에서 전체 파이프라인이 Fallback으로 정상 완주함을 실증 확인:

| 에이전트 | Fallback 함수 | 동작 결과 |
|---------|-------------|---------|
| CMO | `_fallback_strategy()` | Rule-based 기본 전략으로 CONTENT_CREATE Job 생성 완료 |
| Copywriter | `_default_structure()` | FAQ 5개·섹션 4개 기본 구조 반환 |
| Copywriter | `_fallback_article()` | 마크다운 기본 원고 생성, contents 저장 완료 |

> **결론**: 시스템은 Claude API 완전 장애 시에도 서비스를 중단하지 않는다.
> 크레딧 충전 후 동일 파이프라인에서 Claude 응답으로 자동 전환된다.

### 미검증 에이전트 (우선순위 순)

| 에이전트 | 검증 방법 | 전제 조건 |
|---------|---------|---------|
| `OPS_QUALITY` | test_e2e_ops_pipeline.py 작성 필요 | 위 체인 완료 후 연결 |
| `OPS_PUBLISHER` | 동상 | `accounts.fixed_ip` 또는 `url` 필요 |
| `RND` (BRAND_ANALYZE) | 수동 Job 삽입 후 실행 | Claude API 크레딧 필요 |
| `RND` (AEO_SCAN) | 동상 | 006 마이그레이션 실행 + 크레딧 필요 |
| `ANALYST_REPORT` | 동상 | aeo_metrics 데이터 필요 |

---

## 10. Slack 페르소나 매핑

| 에이전트 | 슬랙 표시 이름 | 이모지 | 주요 알림 |
|---------|-------------|--------|----------|
| CMO | 김이사 (전략총괄) | 📊 | 캠페인 전략 수립 완료, 주간 SOM 리포트 |
| COPYWRITER | 박작가 (콘텐츠팀) | ✏️ | 콘텐츠 초안 생성 완료 |
| RND | 김연구원 (R&D팀) | 🔬 | 보도자료 부족 알림, AEO 인용 성공, 페르소나 분석 완료 |
| OPS_QUALITY | QC 검수봇 | ✅ | QC 통과/미달 결과 |
| OPS_PUBLISHER | 발행봇 | 🚀 | 콘텐츠 발행 완료 |
| ANALYST_REPORT | 리포트봇 | 📝 | 주간 SOM 집계 |
| SYSTEM | 시스템 알림 | 🤖 | 에러, 시스템 공지 |
