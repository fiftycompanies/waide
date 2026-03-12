# Infra Dev — DevOps Agent

> 담당: DB 마이그레이션, Vercel 배포, 크론 잡, 에러 모니터링, 환경변수
> 최종 업데이트: 2026-03-07

---

## 1. 담당 영역

| 영역 | 설명 |
|------|------|
| DB 마이그레이션 | 스키마 변경 SQL 작성, 멱등성 보장 |
| Vercel 배포 | vercel.json 설정, 환경변수, 빌드 검증 |
| 크론 잡 | Vercel Cron 설정, 인증, 에러 처리 |
| 에러 모니터링 | error_logs 테이블, Slack 알림 |
| 환경변수 | 관리, graceful skip 패턴 |

---

## 2. 작업 폴더

```
scripts/migrations/
├── 001~056_*.sql              # 기존 마이그레이션 (실행 완료)
├── 057_*.sql                  # 다음 마이그레이션부터 순차
└── run_all_f1_f4.sql          # 통합 멱등 마이그레이션 (참고)

vercel.json                    # Vercel 설정 (크론, 리전 등)

app/api/cron/
├── serp/route.ts              # 기존 — 일일 SERP 수집
├── search-volume/route.ts     # 기존 — 검색량 수집
├── monthly-report/route.ts    # 기존 — 월간 리포트
├── grading/route.ts           # 기존 — 계정 등급/난이도
└── aeo/route.ts               # 신규 — AEO 추적 (Phase 5)

lib/
├── scheduler.ts               # 기존 — 크론 스케줄러 헬퍼
├── slack/error-notification.ts # 기존 — Slack 에러 알림
└── utils/error-handler.ts     # 기존 — withErrorLogging() 래퍼

lib/actions/
└── error-log-actions.ts       # 기존 — 에러 로그 CRUD
```

---

## 3. 마이그레이션 규칙

### 3-1. 번호 체계

- 현재 최신: 056 (error_logs)
- 다음 마이그레이션: 057부터 순차 증가
- 파일명 형식: `NNN_설명.sql` (예: `057_questions_table.sql`)

### 3-2. SQL 작성 규칙

```sql
-- 멱등성 보장: IF NOT EXISTS, ON CONFLICT 사용
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- 컬럼 추가: IF NOT EXISTS
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- CHECK 제약 재생성: 기존 드롭 후 추가
ALTER TABLE keywords DROP CONSTRAINT IF EXISTS keywords_status_check;
ALTER TABLE keywords ADD CONSTRAINT keywords_status_check
  CHECK (status IN ('active','paused','archived','queued','refresh','suggested'));

-- 인덱스: IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_questions_keyword ON questions(keyword_id);

-- UNIQUE 제약: IF NOT EXISTS 지원 안 됨 → DO NOTHING 패턴
-- INSERT ... ON CONFLICT DO NOTHING;
```

### 3-3. 실행 방법

마이그레이션 SQL은 코드로 자동 실행하지 않음. 사용자에게 안내:

```
⚠️ 마이그레이션 실행 필요:
파일: scripts/migrations/057_questions_table.sql
방법: Supabase Dashboard → SQL Editor → 파일 내용 복사+붙여넣기 → Run
```

### 3-4. 마이그레이션 이력

| 범위 | 내용 | 상태 |
|------|------|------|
| 001~034 | 초기 ~ 기능 추가 | 실행 완료 |
| 035~044 | 확장 (sales, auth, products 등) | 실행 완료 |
| 045~052 | F1~F4 (에이전트, 채점, 벤치마크, QC) | SQL 생성 완료 |
| 053 | keyword_visibility에 구글 순위 컬럼 | SQL 생성 완료 |
| 054 | report_deliveries 테이블 | SQL 생성 완료 |
| 055 | admin_users CHECK 재생성 (sales 역할) | SQL 생성 완료 |
| 056 | error_logs 테이블 | SQL 생성 완료 |
| 057+ | AEO 관련 테이블 (Phase 3~5) | 예정 |

---

## 4. Vercel 크론 규칙

### 4-1. 현재 크론 설정 (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/serp", "schedule": "0 0 * * *" },
    { "path": "/api/cron/monthly-report", "schedule": "0 0 1 * *" }
  ]
}
```

### 4-2. 크론 라우트 구조

```typescript
// 모든 크론 라우트의 공통 패턴
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // 1. 인증 확인
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 2. 작업 실행
    const result = await doWork();

    // 3. 성공 응답
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    // 4. 에러 로깅 (에러 모니터링 연동)
    console.error('[Cron] Error:', error);
    await logError({
      error_type: 'cron',
      message: error instanceof Error ? error.message : String(error),
      context: { cron: 'cron-name' }
    });

    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

### 4-3. 신규 크론 추가 시

1. `app/api/cron/[name]/route.ts` 파일 생성
2. `vercel.json`의 `crons` 배열에 추가
3. CRON_SECRET 인증 포함
4. 에러 핸들링 + error_logs 연동

---

## 5. 환경변수 관리

### 5-1. 전체 환경변수 목록

| 변수 | 용도 | 없을 때 동작 |
|------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 앱 실행 불가 (필수) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | 앱 실행 불가 (필수) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 | 서버 액션 불가 (필수) |
| `ANTHROPIC_API_KEY` | Claude API (에이전트) | AI 에이전트 비활성 |
| `SERPER_API_KEY` | 구글 SERP (Serper.dev) | 구글 순위 추적 skip |
| `RESEND_API_KEY` | 이메일 발송 (Resend) | 이메일 발송 skip |
| `CRON_SECRET` | 크론 잡 인증 | 인증 없이 통과 |
| `SLACK_WEBHOOK_URL` | Slack 알림 | 알림 skip |
| `SLACK_ERROR_WEBHOOK_URL` | Slack 에러 알림 | SLACK_WEBHOOK_URL 폴백 |
| `NAVER_AD_API_KEY` | 네이버 광고 API | 검색량 조회 skip |
| `NAVER_AD_SECRET_KEY` | 네이버 광고 API 시크릿 | 검색량 조회 skip |
| `NAVER_AD_CUSTOMER_ID` | 네이버 광고 고객 ID | 검색량 조회 skip |
| `REPORT_FROM_EMAIL` | 리포트 발신 이메일 | 기본값 사용 |
| `PERPLEXITY_API_KEY` | Perplexity API (AEO) | AEO Perplexity 추적 skip |

### 5-2. Graceful Skip 패턴

```typescript
// 표준 패턴: 환경변수 없으면 경고 + null/빈값 반환
export async function someFunction() {
  if (!process.env.SOME_API_KEY) {
    console.warn('[Module] SOME_API_KEY not set — skipping');
    return null; // 또는 빈 배열, 기본값 등
  }
  // ... 실제 로직
}
```

### 5-3. Vercel 환경변수 설정

```
Vercel Dashboard → Settings → Environment Variables
- Production / Preview / Development 환경별 설정
- 민감한 키는 Encrypted 저장
```

---

## 6. 에러 모니터링

### 6-1. 기존 인프라

| 구성요소 | 파일 | 역할 |
|---------|------|------|
| error_logs 테이블 | 056_error_logs.sql | 에러 저장 (type, status, context) |
| logError() | lib/actions/error-log-actions.ts | 에러 DB 저장 |
| withErrorLogging() | lib/utils/error-handler.ts | 서버 액션 래퍼 |
| Slack 알림 | lib/slack/error-notification.ts | 5분 중복 제거 알림 |
| 에러 로그 페이지 | /ops/error-logs | 통계/필터/상세/상태관리 |

### 6-2. 에러 유형

```
error_type CHECK: 'client' | 'server' | 'api' | 'cron'
status CHECK: 'new' | 'acknowledged' | 'resolved' | 'ignored'
```

### 6-3. 크론 에러 연동

```typescript
// lib/scheduler.ts의 runScheduledTask()에서 자동 에러 로깅
import { logError } from '@/lib/actions/error-log-actions';

try {
  await task();
} catch (error) {
  await logError({
    error_type: 'cron',
    message: error.message,
    stack_trace: error.stack,
    context: { task: taskName }
  });
  // Slack 알림도 자동 발송 (error-notification.ts)
}
```

---

## 7. 배포 체크리스트

### 7-1. 배포 전 확인

```bash
# 1. TypeScript 타입 체크
npx tsc --noEmit

# 2. Next.js 빌드
npm run build

# 3. 환경변수 확인 (Vercel Dashboard)

# 4. 마이그레이션 실행 여부 확인
```

### 7-2. 배포 방법

```
main 브랜치에 푸시 → Vercel 자동 배포 (icn1 서울 리전)
배포 URL: https://web-five-gold-12.vercel.app
```

### 7-3. 배포 후 확인

```
1. 메인 페이지 접근 확인
2. 어드민 로그인 확인
3. 크론 수동 트리거 (필요 시)
4. 에러 로그 확인
```
