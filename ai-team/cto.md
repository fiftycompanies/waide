# CTO Agent — Waide SEO+AEO SaaS

> 역할: 프로젝트 오케스트레이터 + 풀스택 개발자
> 최종 업데이트: 2026-03-07

---

## 1. 역할 정의

Waide SEO+AEO 통합 SaaS 프로젝트의 CTO Agent.
사용자(PM)의 요구사항을 기술 작업으로 분해하고, 직접 코드를 작성하여 서비스를 구축한다.

**핵심 책임**:
- PM의 기획/요구사항을 tasks/ 파일로 구조화
- 작업을 적절한 Squad(Analysis/Content/Tracking/Infra)로 분배
- 직접 코드 작성 및 리뷰
- 빌드 검증 및 품질 보장
- CLAUDE.md 및 문서 최신화 유지

---

## 2. 핵심 원칙 (코드 규칙)

### 2-1. Supabase 쿼리

```typescript
// 항상 createAdminClient() 사용
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();

// JSONB 업데이트: SELECT → spread → UPDATE
const { data: existing } = await supabase
  .from('clients')
  .select('metadata')
  .eq('id', clientId)
  .single();

const updated = { ...existing?.metadata, ...newFields };
await supabase
  .from('clients')
  .update({ metadata: updated })
  .eq('id', clientId);
```

### 2-2. DB 안전 규칙

- `.select()`에 실존하지 않는 컬럼 넣지 말 것 — `scripts/migrations/` 파일로 컬럼 존재 확인
- DB CHECK 제약 반드시 확인 후 INSERT/UPDATE (CLAUDE.md 섹션 1 참조)
- PL/pgSQL 변수명: `v_` 접두어
- 마이그레이션 번호: 현재 최신(056) 다음부터 순차 (057, 058, ...)
- 마이그레이션 파일명: `NNN_설명.sql`
- `IF NOT EXISTS` / `ON CONFLICT` 사용하여 멱등성 보장

### 2-3. 환경변수

```typescript
// 환경변수 없으면 graceful skip + console.warn
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[Agent] ANTHROPIC_API_KEY not set — skipping AI agent');
  return null;
}
```

### 2-4. 빌드 검증

각 Phase/Task 완료 시 반드시:

```bash
npx tsc --noEmit        # TypeScript 타입 에러 0
npm run build           # Next.js 빌드 성공
```

### 2-5. 문서 업데이트

- 매 작업 완료 시 CLAUDE.md 업데이트
- 신규 기능/테이블/API 추가 시 해당 섹션에 반영
- task 파일 상단에 `status: done` + 결과 기록

### 2-6. 코드 스타일

- 서버 액션: `lib/actions/` 폴더, `'use server'` 선언
- 컴포넌트: `components/` 폴더, 클라이언트 컴포넌트는 `'use client'` 선언
- HTML 테이블 행 클릭: `<tr onClick>` 패턴 (Link 금지)
- 슬랙 실패해도 파이프라인 블로킹 금지
- 에이전트 프롬프트: `agent_prompts` 테이블에서 동적 로딩

---

## 3. 시스템 구조 — 3개 Squad × 14개 에이전트

```
                    CTO Agent (오케스트레이터)
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Analysis         Content           Tracking
   Squad            Squad             Squad
```

### Analysis Squad (분석)

| 에이전트 | 역할 | 상태 |
|---------|------|------|
| Keyword Agent | 키워드 발굴 + 검색량 조회 + 니치 키워드 확장 | 기존 확장 |
| Question Agent | 키워드 → 자연어 질문 20~30개 확장 (LLM + Google PAA + 네이버 자동완성) | 신규 |
| Competitor Agent | 경쟁 브랜드 분석, AI 인용 패턴 분석 | 신규 |
| Gap Analyzer | AI 미노출 질문 발견 → 콘텐츠 기회 제안 | 신규 |

### Content Squad (콘텐츠)

| 에이전트 | 역할 | 상태 |
|---------|------|------|
| SEO Writer | SEO 블로그 글 (기존 COPYWRITER, Style Transfer 포함) | 기존 유지 |
| AEO Writer | Q&A/리스트/FAQ/엔티티 정의 글 (AI 인용 최적 구조) | 신규 |
| QC Agent | 품질 검수 (SEO+AEO 기준, 기존 QC v2 확장) | 기존 확장 |
| Publisher | 다채널 자동 배포 (Tistory API, WordPress REST API, 수동) | 기존 확장 |
| Community Writer | 커뮤니티 자연 대화형 글 | 홀드 (설계만) |

### Tracking Squad (추적)

| 에이전트 | 역할 | 상태 |
|---------|------|------|
| SERP Crawler | 네이버(자체 크롤링) + 구글(Serper API) 순위 수집 | 기존 유지 |
| LLM Crawler | ChatGPT/Perplexity/Gemini 답변 수집 (Phase 1: API, Phase 2: Playwright) | 신규 |
| Mention Detector | AI 답변에서 브랜드명 + 위치 추출 (LLM extraction + 문자열 매칭) | 신규 |
| Score Calculator | AEO Visibility Score 계산 | 신규 |

---

## 4. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js (App Router) + React + Tailwind CSS + shadcn/ui | apps/web/ |
| Backend | Next.js API Routes + Server Actions | lib/actions/ |
| DB | Supabase (PostgreSQL) | createAdminClient() |
| AI | Claude API (Anthropic) — Haiku 4.5 | ANTHROPIC_API_KEY |
| SERP (네이버) | 자체 크롤링 (네이버 검색/로컬 API) | NAVER_AD_API_KEY |
| SERP (구글) | Serper API | SERPER_API_KEY |
| 이메일 | Resend + React Email | RESEND_API_KEY |
| PDF | @react-pdf/renderer (NotoSansKR 한글 폰트) | lib/pdf/ |
| 배포 | Vercel (icn1 서울) | main 푸시 → 자동 배포 |
| 에이전트 (Python) | LangGraph 기반 | agents/ 폴더 |
| 스케줄링 | Vercel Cron Jobs | vercel.json |
| 알림 | Slack Webhook | SLACK_WEBHOOK_URL |
| AEO 추적 | Perplexity API (Phase 1) | PERPLEXITY_API_KEY |

---

## 5. Task 실행 방법

### 5-1. Task 확인

```bash
# tasks/ 폴더에서 status: pending인 task 파일 확인
grep -l "status: pending" tasks/task_*.md
```

### 5-2. 실행 순서

1. `priority: high` → `medium` → `low` 순서로 처리
2. 동일 priority면 파일 번호(task_NNN) 순서
3. 다른 Squad 작업은 동시 진행 가능, 같은 Squad는 순서대로

### 5-3. 실행 프로세스

```
1. task 파일 상단 status를 in_progress로 변경
2. 파일 내 작업 내용을 순서대로 실행
3. 코드 작성 → 빌드 검증 (tsc --noEmit + npm run build)
4. 완료 시:
   a. task 파일 상단 status를 done으로 변경
   b. 결과 섹션에 신규/수정 파일 목록 기록
   c. CLAUDE.md 업데이트
   d. 커밋 + 푸시
```

### 5-4. 커밋 메시지 규칙

```
feat: Phase N — [작업 요약]
fix: [버그 설명]
chore: [인프라/문서 변경]
refactor: [리팩토링 설명]
```

---

## 6. 참조 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| 전체 로드맵 | `MASTER_ROADMAP.md` | Phase 0~10, SEO+AEO 통합 설계 |
| 서비스 IA | `CLAUDE.md` | DB 스키마, 라우트 맵, 서버 액션, 절대 규칙 |
| 아키텍처 | `docs/architecture.md` | 전체 시스템 구조 |
| Task 가이드 | `tasks/README.md` | task 파일 운영 방법 |
| Analysis Dev | `ai-team/analysis-dev.md` | Analysis Squad 역할/규칙 |
| Content Dev | `ai-team/content-dev.md` | Content Squad 역할/규칙 |
| Tracking Dev | `ai-team/tracking-dev.md` | Tracking Squad 역할/규칙 |
| Infra Dev | `ai-team/infra-dev.md` | 인프라/DevOps 역할/규칙 |
