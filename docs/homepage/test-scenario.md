# WIDEWILD 홈페이지 서비스 — 테스트 시나리오

## 현재 상태 및 접근 방법

### Admin 대시보드 현황

> **현재 admin은 독립 실행 불가능한 상태입니다.**

`/admin/` 디렉토리에는 컴포넌트(`.tsx`)와 Server Actions(`.ts`)만 존재하며,
Next.js 앱으로 실행하기 위한 `package.json`, `app/layout.tsx`, `app/page.tsx`가 없습니다.

#### 실행 가능하게 만들기 위한 필수 작업

```
admin/                          ← 현재: 컴포넌트/액션만 존재
├── actions/                    ✅ 완료
├── components/                 ✅ 완료
├── types/                      ✅ 완료
├── package.json                ❌ 필요
├── next.config.ts              ❌ 필요
├── tsconfig.json               ❌ 필요
├── app/
│   ├── layout.tsx              ❌ 필요
│   ├── page.tsx                ❌ 필요 (→ ProjectList 렌더)
│   ├── globals.css             ❌ 필요
│   ├── new/page.tsx            ❌ 필요 (→ CreateProjectForm)
│   ├── [id]/page.tsx           ❌ 필요 (→ ProjectDetail)
│   ├── [id]/collect/page.tsx   ❌ 필요 (→ CollectionWizard)
│   ├── [id]/keywords/page.tsx  ❌ 필요 (→ KeywordManager)
│   ├── [id]/deploy/page.tsx    ❌ 필요 (→ DeployPanel)
│   ├── [id]/blog/page.tsx      ❌ 필요 (→ BlogManager)
│   └── monitoring/page.tsx     ❌ 필요 (→ DashboardView)
└── .env.local                  ❌ 필요
```

#### 필요한 환경변수 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VERCEL_API_TOKEN=xxxx
VERCEL_TEAM_ID=team_xxxx
RESEND_API_KEY=re_xxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
WEBHOOK_SECRET=whsec_xxxx
```

---

## 테스트 전 준비 사항

### 1. Supabase 프로젝트 생성

```bash
# Supabase CLI 설치 (미설치 시)
npm install -g supabase

# 프로젝트 초기화 및 마이그레이션 실행
cd /Users/kk/Desktop/claude/homepage
supabase init
supabase db push     # 또는 마이그레이션 순서대로 실행
```

```sql
-- 마이그레이션 수동 실행 순서
-- 1. supabase/migrations/001_homepage_projects.sql
-- 2. supabase/migrations/002_homepage_materials.sql
-- 3. supabase/migrations/003_homepage_portfolios.sql
-- 4. supabase/migrations/004_homepage_reviews.sql
-- 5. supabase/migrations/005_homepage_inquiries.sql
-- 6. supabase/migrations/006_schema_extensions.sql
-- 7. supabase/migrations/007_storage_buckets.sql
-- 8. supabase/migrations/seed_sample_data.sql
```

### 2. 시드 데이터 확인

`seed_sample_data.sql`이 삽입하는 데이터:

| 테이블 | 레코드 수 | 내용 |
|--------|-----------|------|
| clients | 2 | 드림인테리어, 모던하우스 |
| homepage_projects | 2 | modern-minimal(live), natural-wood(collecting) |
| homepage_materials | 1 | 드림인테리어 자료 (5단계 완료) |
| homepage_portfolios | 5 | 강남 아파트, 서초 빌라, 송파 주택, 분당 오피스텔, 판교 신축 |
| homepage_reviews | 5 | 별점 3~5, 다양한 소스 |
| homepage_inquiries | 5 | 상태: new(2), contacted(1), consulting(1), contracted(1) |

---

## Phase 1: DB 스키마 테스트

### 테스트 시나리오 1-1: 테이블 존재 확인

```sql
-- Supabase SQL Editor에서 실행
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'homepage_%'
ORDER BY table_name;
```

**기대 결과:** 5개 테이블
- homepage_inquiries
- homepage_materials
- homepage_portfolios
- homepage_projects
- homepage_reviews

---

### 테스트 시나리오 1-2: CHECK 제약조건 검증

```sql
-- 유효하지 않은 status → 에러 발생해야 함
INSERT INTO homepage_projects (client_id, project_name, status)
VALUES ('00000000-0000-0000-0000-000000000001', '테스트', 'invalid_status');
-- 기대: ERROR - new row for relation "homepage_projects" violates check constraint

-- 유효한 status → 성공해야 함
INSERT INTO homepage_projects (client_id, project_name, status)
VALUES ('00000000-0000-0000-0000-000000000001', '테스트 프로젝트', 'collecting');
-- 기대: INSERT 0 1

-- rating 범위 테스트 (0은 실패, 5는 성공)
INSERT INTO homepage_reviews (project_id, customer_name, content, rating)
VALUES ('시드데이터_프로젝트_ID', '테스트고객', '좋아요', 0);
-- 기대: ERROR - violates check constraint

INSERT INTO homepage_reviews (project_id, customer_name, content, rating)
VALUES ('시드데이터_프로젝트_ID', '테스트고객', '좋아요', 5);
-- 기대: INSERT 0 1
```

**합격 기준:** 유효하지 않은 값 → 에러, 유효한 값 → 성공

---

### 테스트 시나리오 1-3: CASCADE 삭제 확인

```sql
-- 1. 프로젝트에 연결된 하위 데이터 수 확인
SELECT
  (SELECT count(*) FROM homepage_portfolios WHERE project_id = '대상_ID') as portfolios,
  (SELECT count(*) FROM homepage_reviews WHERE project_id = '대상_ID') as reviews,
  (SELECT count(*) FROM homepage_inquiries WHERE project_id = '대상_ID') as inquiries;

-- 2. 프로젝트 삭제
DELETE FROM homepage_projects WHERE id = '대상_ID';

-- 3. 하위 데이터도 삭제되었는지 확인
SELECT count(*) FROM homepage_portfolios WHERE project_id = '대상_ID';
-- 기대: 0
```

---

### 테스트 시나리오 1-4: RLS 정책 — 익명 상담 INSERT

```sql
-- anon 키로 Supabase REST API 호출
curl -X POST 'https://xxxx.supabase.co/rest/v1/homepage_inquiries' \
  -H 'apikey: ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "project_id": "시드데이터_프로젝트_ID",
    "customer_name": "홍길동",
    "phone": "010-1234-5678",
    "space_type": "아파트",
    "status": "new"
  }'
```

**기대 결과:** 201 Created (익명 사용자도 상담 신청 가능)

---

### 테스트 시나리오 1-5: updated_at 트리거

```sql
-- 1. 현재 updated_at 확인
SELECT updated_at FROM homepage_projects WHERE id = '대상_ID';

-- 2. 1초 대기 후 UPDATE
UPDATE homepage_projects SET project_name = '업데이트된 이름' WHERE id = '대상_ID';

-- 3. updated_at이 변경되었는지 확인
SELECT updated_at FROM homepage_projects WHERE id = '대상_ID';
```

**합격 기준:** updated_at이 자동으로 현재 시간으로 갱신

---

### 테스트 시나리오 1-6: Storage 버킷

```sql
SELECT id, name, public FROM storage.buckets WHERE name LIKE 'homepage-%';
```

**기대 결과:** 4개 버킷
| name | public |
|------|--------|
| homepage-assets | true |
| homepage-logos | true |
| homepage-portfolios | true |
| homepage-certifications | false |

---

## Phase 2: 어드민 UI 테스트

> **전제 조건:** Admin Next.js 앱이 셋업되어 `localhost:3001`에서 실행 중

### 테스트 시나리오 2-1: 프로젝트 목록 조회

1. `/dashboard/homepage` 접속
2. 시드 데이터의 프로젝트 2개가 카드 형태로 표시되는지 확인
3. 상단에 통계 카드 6개 표시 확인 (전체, collecting, building, preview, live, suspended)
4. 상태 필터 탭 클릭 → 해당 상태만 필터링

**합격 기준:**
- [ ] 프로젝트 카드에 이름, 상태 배지, 템플릿명, 서브도메인 표시
- [ ] 상태 필터 정상 동작
- [ ] 검색 필드에 "드림" 입력 → 해당 프로젝트만 표시
- [ ] 빈 검색 결과 시 "프로젝트가 없습니다" 메시지

---

### 테스트 시나리오 2-2: 프로젝트 생성

1. "새 프로젝트" 버튼 클릭
2. 클라이언트 검색 (Combobox에서 "드림" 검색)
3. 프로젝트명 입력: "테스트 프로젝트"
4. 템플릿 선택: "모던 미니멀" 카드 클릭
5. 서브도메인 자동 생성 확인 ("test-peurojekteu" 등)
6. "중복 확인" → "사용 가능" 표시
7. "프로젝트 생성" 버튼 클릭
8. 프로젝트 상세 페이지로 리다이렉트

**합격 기준:**
- [ ] 클라이언트 미선택 시 생성 버튼 비활성화
- [ ] 서브도메인 실시간 중복 체크 동작
- [ ] 생성 후 상태 = 'collecting'
- [ ] DB에 레코드 생성 확인

---

### 테스트 시나리오 2-3: 자료 수집 5단계 위저드

**Step 1 — 기본 정보:**
- 업체명: "테스트 인테리어"
- 대표명: "홍길동"
- 전화: "02-1234-5678"
- 주소: "서울 강남구 역삼동 123"
- 소개: "20년 전통의 인테리어 전문 업체입니다."
- "다음" 버튼 클릭

**Step 2 — 서비스 정보:**
- 시공 지역: "강남구", "서초구", "송파구" 선택 (칩 UI)
- 서비스 유형: "아파트 인테리어", "빌라 인테리어" 선택
- "다음" 버튼 클릭

**Step 3 — 브랜드 & SNS:**
- 메인 컬러: #3B82F6 선택
- 서브 컬러: #10B981 선택
- 인스타그램: "https://instagram.com/test_interior"
- 네이버 블로그: "https://blog.naver.com/test_interior"
- "다음" 버튼 클릭

**Step 4 — FAQ:**
- FAQ 1: "시공 기간은 얼마나 걸리나요?" / "보통 4~6주 소요됩니다."
- FAQ 2: "견적은 어떻게 받나요?" / "무료 상담 후 현장 방문을 통해 견적서를 제공합니다."
- "FAQ 추가" 버튼으로 동적 추가 확인
- "다음" 버튼 클릭

**Step 5 — 템플릿 & 완료:**
- 템플릿 선택 확인 (이미 선택된 상태)
- "수집 완료" 버튼 클릭

**합격 기준:**
- [ ] 각 단계에서 "다음" 클릭 시 자동 저장 (페이지 새로고침해도 데이터 유지)
- [ ] 프로그레스 바가 단계별로 진행
- [ ] 5단계 완료 시 → `is_complete = true`
- [ ] 프로젝트 상태가 `collecting` → `building`으로 변경

---

### 테스트 시나리오 2-4: 포트폴리오 관리

1. 프로젝트 상세 → "포트폴리오" 탭
2. "포트폴리오 추가" 클릭
3. 입력:
   - 제목: "강남 아파트 30평 리모델링"
   - 공간유형: "아파트"
   - 스타일: "모던"
   - 평수: 30
   - 설명: "전체 리모델링 사례입니다."
   - 이미지 URL: (테스트 이미지 URL)
4. 저장
5. 순서 이동 (화살표 버튼)
6. "메인 노출" 토글
7. 수정/삭제

**합격 기준:**
- [ ] CRUD 모두 정상 동작
- [ ] 순서 변경 시 sort_order 업데이트
- [ ] is_featured 토글 시 즉시 반영

---

### 테스트 시나리오 2-5: 후기 관리

1. "후기" 탭 → "후기 추가"
2. 입력:
   - 고객명: "김철수"
   - 평점: 별 5개 클릭
   - 내용: "매우 만족합니다. 깔끔한 시공 감사합니다."
   - 소스: "manual"
3. 저장 후 평균 평점 표시 확인

**합격 기준:**
- [ ] 별점 UI 클릭 시 1~5 사이 값만 허용
- [ ] 평균 평점 계산 정확
- [ ] 수정/삭제 동작

---

### 테스트 시나리오 2-6: 상담 관리

1. "상담" 탭 → 시드 데이터 상담 5건 표시 확인
2. 상태 필터: "new" 클릭 → 2건만 표시
3. 상담 항목 클릭 → 상세 패널 슬라이드
4. 상태 변경: "new" → "contacted"
5. 내부 메모 작성 및 저장
6. 전화 링크 (tel:) 동작 확인

**합격 기준:**
- [ ] 상태별 필터 카운트 정확
- [ ] 상태 변경 → DB 즉시 반영
- [ ] 메모 저장/로드 정상

---

## Phase 3: SEO 키워드 자동 생성 테스트

### 테스트 시나리오 3-1: 키워드 매트릭스 검증

```typescript
import { REGIONS, KEYWORD_PATTERNS } from '@/lib/keywords/seo-keyword-matrix';

console.log('지역 수:', REGIONS.length);        // 기대: >= 132
console.log('패턴 수:', KEYWORD_PATTERNS.length); // 기대: >= 124
```

---

### 테스트 시나리오 3-2: 키워드 자동 생성

1. 프로젝트 상세 → "키워드" 탭 (KeywordManager)
2. "키워드 자동 생성" 버튼 클릭
3. 진행 상태 표시 (로딩 스피너)
4. 완료 후 통계 확인:
   - 총 생성 수
   - homepage_seo / blog_target 분류
   - 정보성 / 후기성 비율

**테스트 데이터:**
- 프로젝트의 service_regions: ['강남구', '서초구', '송파구']
- 프로젝트의 service_types: ['아파트 인테리어', '빌라 인테리어']

**기대 결과:**
- 3 지역 x 지역 필요 패턴 수 + 지역 독립 패턴 수 = 수백 개 키워드 생성
- 키워드 예시: "강남구 아파트 인테리어", "서초구 빌라 리모델링 비용", "송파구 인테리어 업체 추천"

---

### 테스트 시나리오 3-3: 중복 방지

1. 동일 프로젝트에서 "키워드 자동 생성" 다시 클릭
2. "이미 생성된 키워드가 있습니다" 메시지 또는 0건 생성

**합격 기준:** 중복 키워드 0건

---

### 테스트 시나리오 3-4: 키워드 재생성

1. "키워드 재생성" 버튼 클릭
2. 기존 자동생성 키워드 삭제 확인
3. 새로 생성 확인
4. 수동 추가한 키워드는 유지되는지 확인

**합격 기준:** 수동 키워드 유지, 자동 키워드만 교체

---

### 테스트 시나리오 3-5: 프리뷰 기능

1. "프리뷰" 버튼 클릭
2. DB에 저장하지 않고 생성될 키워드 목록 표시
3. 카테고리별/소스별 분류 확인

**합격 기준:** DB 변경 없이 목록만 표시

---

## Phase 4: 템플릿 A (modern-minimal) 테스트

### 테스트 시나리오 4-1: 빌드 검증

```bash
cd /Users/kk/Desktop/claude/homepage/templates/modern-minimal
npm install
npm run build
```

**합격 기준:** 에러 없이 빌드 완료

---

### 테스트 시나리오 4-2: 10개 섹션 렌더링 확인

```bash
npm run dev
# http://localhost:3000 접속
```

**체크리스트:**
- [ ] Hero: 배경 이미지/그라데이션, CTA 버튼 2개
- [ ] Stats: 숫자 카운트업 애니메이션
- [ ] Portfolio: 그리드 레이아웃, 필터 버튼
- [ ] BeforeAfter: 드래그 슬라이더 (좌우 드래그 시 분할선 이동)
- [ ] Services: 서비스 카드 표시
- [ ] Process: 단계별 타임라인
- [ ] Reviews: 고객 후기 캐러셀
- [ ] Blog: 최신 블로그 3개 카드
- [ ] FAQ: 아코디언 토글 동작
- [ ] ContactCTA: 상담 신청 폼

---

### 테스트 시나리오 4-3: 상담 폼 제출

1. ContactCTA 섹션의 폼 작성:
   - 이름: "테스트 고객"
   - 연락처: "010-9999-8888"
   - 공간유형: "아파트"
   - 평수: "30"
   - 예산: "3000만원 이하"
   - 메시지: "테스트 상담입니다"
2. 제출 버튼 클릭

**합격 기준:**
- [ ] POST /api/inquiry → 200 응답
- [ ] homepage_inquiries 테이블에 레코드 생성
- [ ] 성공 메시지 표시

---

### 테스트 시나리오 4-4: SEO 메타태그 확인

```bash
# 페이지 소스 확인
curl http://localhost:3000 | grep -E '<title>|<meta|application/ld\+json'
```

**체크리스트:**
- [ ] `<title>` 태그에 업체명 포함
- [ ] `<meta name="description">` 존재
- [ ] OpenGraph 태그 (og:title, og:description, og:image)
- [ ] LocalBusiness JSON-LD 스크립트
- [ ] `/sitemap.xml` 접근 가능
- [ ] `/robots.txt` 접근 가능

---

### 테스트 시나리오 4-5: 블로그 페이지

1. `/blog` 접속 → 블로그 목록 표시
2. 글 클릭 → `/blog/[slug]` 상세 페이지
3. Article JSON-LD 존재 확인

**합격 기준:**
- [ ] 목록에 제목, 날짜, 타입 배지 표시
- [ ] 상세 페이지에 본문 HTML 렌더링
- [ ] 메타태그 정상 생성

---

### 테스트 시나리오 4-6: 반응형 확인

Chrome DevTools → Device Toolbar:

| 기기 | 해상도 | 확인 항목 |
|------|--------|-----------|
| iPhone SE | 375x667 | 네비게이션 햄버거, 1열 레이아웃 |
| iPad | 768x1024 | 2열 그리드, 네비 변환 |
| Desktop | 1440x900 | 3열 그리드, 풀 네비 |

---

## Phase 5: 배포 파이프라인 테스트

### 테스트 시나리오 5-1: 서브도메인 생성

```typescript
import { generateSubdomain, validateSubdomain } from '@/lib/deploy/subdomain-manager';

// 한글 → 로마자 변환 테스트
console.log(generateSubdomain('드림인테리어'));     // dream-interior 또는 유사
console.log(generateSubdomain('모던하우스'));        // modeon-hauseu 또는 유사
console.log(validateSubdomain('dream-interior'));   // { valid: true }
console.log(validateSubdomain('a'));               // { valid: false } (너무 짧음)
console.log(validateSubdomain('admin'));            // { valid: false } (예약어)
```

---

### 테스트 시나리오 5-2: 배포 트리거 (Admin UI)

> **전제:** Vercel API Token 설정 필요

1. 프로젝트 상세 → "배포" 탭 (DeployPanel)
2. 현재 상태 확인 (StatusBadge)
3. "배포" 버튼 클릭
4. 빌드 중 프로그레스 표시
5. 배포 완료 후 프리뷰 URL 링크

**합격 기준:**
- [ ] 상태 변화: collecting → building → preview/live
- [ ] 프리뷰 URL 접속 가능
- [ ] 배포 이력에 기록 추가

---

### 테스트 시나리오 5-3: Webhook 수신

```bash
# 성공 이벤트 시뮬레이션
curl -X POST http://localhost:3000/api/webhook/vercel \
  -H 'Content-Type: application/json' \
  -H 'x-vercel-signature: COMPUTED_HMAC' \
  -d '{
    "type": "deployment.succeeded",
    "payload": {
      "deployment": {
        "url": "test-abc123.vercel.app",
        "projectId": "prj_xxxx"
      }
    }
  }'

# 잘못된 서명 테스트
curl -X POST http://localhost:3000/api/webhook/vercel \
  -H 'Content-Type: application/json' \
  -H 'x-vercel-signature: invalid_signature' \
  -d '{"type":"deployment.succeeded"}'
```

**합격 기준:**
- [ ] 올바른 서명 → 200, 상태 'live' 업데이트
- [ ] 잘못된 서명 → 401

---

### 테스트 시나리오 5-4: 롤백

1. 배포 이력에서 이전 배포 선택
2. "롤백" 버튼 클릭
3. 해당 버전으로 활성화

**합격 기준:** 롤백 후 이전 버전의 URL 접속 가능

---

## Phase 6: 블로그 발행 테스트

### 테스트 시나리오 6-1: 초기 블로그 8개 생성

1. 프로젝트 상세 → "블로그" 탭 (BlogManager)
2. "초기 블로그 생성" 버튼 클릭
3. 8개 블로그 생성 확인

**합격 기준:**
- [ ] 정보성 4개 + 후기성 4개 = 8개
- [ ] 각 블로그에 title, slug, body, main_keyword 존재
- [ ] Article JSON-LD schema_markup 존재
- [ ] publish_status = 'published'

---

### 테스트 시나리오 6-2: 월간 스케줄 생성

1. "월간 스케줄 생성" 버튼 클릭
2. 이번 달 나머지 일정에 블로그 배정 확인

**합격 기준:**
- [ ] blog_config.posts_per_month 기반 스케줄 생성
- [ ] 3~4일 간격 배분
- [ ] 미발행 키워드 우선 선택 (publish_count 기반)
- [ ] 정보성/후기성 비율 반영

---

### 테스트 시나리오 6-3: 발행 / 발행 취소

1. 특정 포스트 선택 → "발행" 버튼
2. publications 테이블에 기록 확인
3. 홈페이지 /blog에 표시 확인
4. "발행 취소" 버튼 → publish_status = 'draft'

**합격 기준:**
- [ ] 발행 후 publications 테이블에 레코드 생성
- [ ] 발행 취소 후 status = 'unpublished'

---

### 테스트 시나리오 6-4: 발행 통계

1. 통계 카드 확인:
   - 총 발행 수
   - 이번 달 발행 수
   - 정보성 / 후기성 비율
2. 6개월 월별 추이

**합격 기준:** 수치가 실제 데이터와 일치

---

## Phase 7: 템플릿 B/C 테스트

### 테스트 시나리오 7-1: Template B (natural-wood) 빌드

```bash
cd /Users/kk/Desktop/claude/homepage/templates/natural-wood
npm install
npm run build
```

**합격 기준:** 에러 없이 빌드 완료

---

### 테스트 시나리오 7-2: Template B 시각 확인

```bash
npm run dev  # http://localhost:3000
```

**체크리스트:**
- [ ] 배경색: 웜 화이트 (#FEFCF9)
- [ ] 메인 컬러: 우드 브라운 (#8B6914)
- [ ] 제목 폰트: Noto Serif KR (세리프)
- [ ] 둥근 모서리 (rounded-3xl)
- [ ] Hero: 패럴랙스 스크롤 효과
- [ ] Portfolio: 2열 메이슨리 레이아웃
- [ ] Reviews: 1개씩 표시 + 좌우 화살표
- [ ] 10개 섹션 모두 렌더링

---

### 테스트 시나리오 7-3: Template C (premium-dark) 빌드

```bash
cd /Users/kk/Desktop/claude/homepage/templates/premium-dark
npm install
npm run build
```

**합격 기준:** 에러 없이 빌드 완료

---

### 테스트 시나리오 7-4: Template C 시각 확인

```bash
npm run dev  # http://localhost:3000
```

**체크리스트:**
- [ ] 배경색: 다크 (#0A0A0A)
- [ ] 악센트 컬러: 골드 (#C9A96E)
- [ ] 제목 폰트: Playfair Display (세리프)
- [ ] 각진 모서리 (no rounded)
- [ ] Hero: 시네마틱 페이드인 (duration: 1.2s)
- [ ] Portfolio: 라이트박스 갤러리
- [ ] Nav: 영문 라벨 (PORTFOLIO, SERVICE 등)
- [ ] Blog: "JOURNAL" 타이틀
- [ ] FAQ: +/- 토글 아이콘 (ChevronDown 대신)
- [ ] 10개 섹션 모두 렌더링

---

### 테스트 시나리오 7-5: 3개 템플릿 동일 데이터 확인

동일한 환경변수(HOMEPAGE_PROJECT_ID)로 3개 템플릿 실행:

```bash
# 각각 다른 포트에서 실행
cd templates/modern-minimal && PORT=3001 npm run dev &
cd templates/natural-wood && PORT=3002 npm run dev &
cd templates/premium-dark && PORT=3003 npm run dev &
```

**합격 기준:**
- [ ] 3개 템플릿 모두 동일한 업체명, 포트폴리오, 후기, 블로그 표시
- [ ] 디자인(색상, 폰트, 레이아웃)만 다름
- [ ] 상담 폼 제출 → 동일 테이블에 INSERT

---

## Phase 8: 모니터링 & 알림 테스트

### 테스트 시나리오 8-1: 대시보드 데이터 조회

1. "모니터링" 탭 (DashboardView) 접속
2. KPI 카드 4개 확인:
   - 월 방문수 + 전월 대비 증감률
   - 월 상담수 + 전월 대비 증감률
   - 전환율 (%)
   - 블로그 발행 수
3. 기간 필터 변경 (day/week/month)

**합격 기준:**
- [ ] KPI 수치 표시 (0이라도 정상)
- [ ] 기간 변경 시 데이터 업데이트
- [ ] 일별 방문 추이 차트 표시
- [ ] 유입경로 분포 표시

---

### 테스트 시나리오 8-2: 운영 대시보드

1. OpsOverview 페이지 접속
2. 전체 라이브 프로젝트 수 확인
3. 프로젝트별 테이블 정렬

**합격 기준:**
- [ ] 총 방문수/상담수/평균 전환율 표시
- [ ] 프로젝트별 방문, 상담, 전환율 정확
- [ ] 정렬 기능 (방문수/상담수/전환율)

---

### 테스트 시나리오 8-3: Slack 알림 테스트

1. 알림 설정에서 Slack Webhook URL 입력
2. "테스트 알림 발송" 버튼 클릭

**합격 기준:**
- [ ] Slack 채널에 테스트 메시지 수신
- [ ] Block Kit 형식 (헤더, 필드, 버튼)

---

### 테스트 시나리오 8-4: 이메일 알림 테스트

1. 상담 폼에서 새 상담 제출
2. widewildonline@gmail.com 수신 확인

**합격 기준:**
- [ ] HTML 형식 이메일 수신
- [ ] 고객명, 연락처, 공간유형 등 정보 포함

---

### 테스트 시나리오 8-5: 월간 리포트 생성

1. "월간 리포트 생성" 버튼 클릭 (2026년 3월)
2. HTML 리포트 생성 확인

**합격 기준:**
- [ ] 홈페이지 통계 섹션 (방문, 상담, 전환율)
- [ ] 블로그 통계 섹션 (발행 수, 인기 글)
- [ ] SEO 통계 섹션 (키워드 수, 순위)

---

## 전체 E2E 시나리오: 신규 고객 온보딩 플로우

> 이 시나리오는 Phase 1~8 전체를 관통하는 통합 테스트입니다.

### Step 1: 프로젝트 생성 (Phase 2)
1. Admin → "새 프로젝트"
2. 클라이언트: "테스트 인테리어" 선택
3. 템플릿: "모던 미니멀"
4. 서브도메인: "test-interior"
5. 생성 → status = 'collecting'

### Step 2: 자료 수집 (Phase 2)
1. 5단계 위저드 진행 (테스트 데이터 입력)
2. 완료 → status = 'building'

### Step 3: 키워드 자동 생성 (Phase 3)
1. 자료 수집 완료 시 자동 트리거 또는 수동 "키워드 생성"
2. 키워드 목록 확인

### Step 4: 초기 블로그 생성 (Phase 6)
1. "초기 블로그 생성" → 8개 생성
2. 블로그 목록 확인

### Step 5: 배포 (Phase 5)
1. "배포" 버튼 → Vercel에 프로젝트 생성
2. 환경변수 자동 주입
3. 빌드 완료 → status = 'live'

### Step 6: 홈페이지 확인 (Phase 4)
1. `https://test-interior.waide.kr` 접속
2. 10개 섹션 렌더링 확인
3. 블로그 8개 표시 확인
4. 상담 폼 제출

### Step 7: 알림 수신 (Phase 8)
1. 상담 폼 제출 → Slack 알림 수신
2. 이메일 알림 수신

### Step 8: 모니터링 확인 (Phase 8)
1. 대시보드에서 방문수 1 증가 확인
2. 상담 1건 추가 확인

### Step 9: 템플릿 변경 (Phase 7)
1. 프로젝트 설정에서 template_id → 'premium-dark' 변경
2. 재배포 → 다크 테마 확인

### Step 10: 월간 리포트 (Phase 8)
1. 월간 리포트 생성
2. HTML 리포트 확인

---

## 합격/불합격 판정 기준

| 등급 | 기준 | 의미 |
|------|------|------|
| **PASS** | 해당 Phase의 모든 테스트 시나리오 통과 | 프로덕션 배포 가능 |
| **PASS (조건부)** | 핵심 기능 통과, 일부 보조 기능 미통과 | 조건부 배포, 보완 필요 |
| **FAIL** | 핵심 기능 1개 이상 미통과 | 배포 불가, 수정 필수 |

### Phase별 핵심 기능 (FAIL 판정 기준)

| Phase | 핵심 기능 (하나라도 실패 시 FAIL) |
|-------|----------------------------------|
| 1 | 5개 테이블 생성, CHECK 제약조건, RLS 동작 |
| 2 | 프로젝트 CRUD, 자료수집 위저드, 상담 관리 |
| 3 | 키워드 자동 생성, 중복 방지 |
| 4 | 빌드 성공, 10개 섹션 렌더링, 상담 폼 동작 |
| 5 | Vercel 배포 트리거, Webhook 수신 |
| 6 | 초기 블로그 8개 생성, 발행/발행취소 |
| 7 | Template B/C 빌드 성공, 10개 섹션 렌더링 |
| 8 | 대시보드 데이터 조회, 알림 발송 |

---

## 즉시 테스트 가능한 항목 (Admin 없이)

Admin 앱 셋업 전에도 테스트 가능한 항목:

### 1. DB 스키마 (Phase 1)
Supabase SQL Editor에서 마이그레이션 실행 후 테스트 시나리오 1-1 ~ 1-6 수행

### 2. 랜딩 페이지 (이미 배포됨)
https://landing-psi-gilt.vercel.app 에서:
- 모든 섹션 렌더링 확인
- 상담 폼 제출 테스트
- 반응형 확인

### 3. 템플릿 빌드 (Phase 4, 7)
```bash
# .env.local에 Supabase 변수 설정 후
cd templates/modern-minimal && npm install && npm run build
cd templates/natural-wood && npm install && npm run build
cd templates/premium-dark && npm install && npm run build
```

### 4. 키워드 매트릭스 (Phase 3)
```bash
# Node REPL에서 확인
node -e "
const m = require('./lib/keywords/seo-keyword-matrix');
console.log('지역:', m.REGIONS.length);
console.log('패턴:', m.KEYWORD_PATTERNS.length);
"
```

---

## 다음 단계: Admin 앱 셋업 요청

위 테스트를 전부 수행하려면 Admin Next.js 앱 셋업이 필요합니다.

```
필요한 작업:
1. admin/package.json 생성 (Next.js 16 + Supabase + Tailwind)
2. admin/app/ 라우트 페이지 생성 (7개 경로)
3. admin/.env.local 환경변수 설정
4. npm run dev → localhost:3001 실행
```

이 작업을 요청하시면 바로 진행하겠습니다.
