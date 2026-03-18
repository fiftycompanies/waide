# Phase 1 Contract: DB 스키마 확장

## 계약 개요
- **Phase**: 1
- **제목**: DB 스키마 확장
- **예상 기간**: 1일
- **선행 조건**: waide-mkt Supabase 프로젝트 접근 권한, 기존 clients/keywords/contents 테이블 존재
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-1.1: Supabase Migration SQL 파일
- **설명**: 홈페이지 서비스 전용 5개 신규 테이블을 생성하는 마이그레이션 SQL 파일. homepage_projects, homepage_materials, homepage_portfolios, homepage_reviews, homepage_inquiries 테이블을 포함한다.
- **파일**: `supabase/migrations/20260317000001_create_homepage_tables.sql`
- **검증 방법**: `supabase db push` 실행 후 에러 없이 완료, `\dt` 명령으로 5개 테이블 존재 확인

### D-1.2: RLS(Row Level Security) 정책
- **설명**: 모든 신규 테이블에 워크스페이스 기반 접근 제어 RLS 정책을 설정한다. homepage_inquiries는 비인증 사용자의 INSERT를 허용한다 (홈페이지 상담 폼 접수용).
- **파일**: `supabase/migrations/20260317000001_create_homepage_tables.sql` (동일 파일 내 포함)
- **검증 방법**: RLS 활성화 상태 확인, 워크스페이스 멤버/비멤버 접근 테스트, anon INSERT 테스트

### D-1.3: 인덱스 및 트리거
- **설명**: 자주 조회되는 컬럼에 인덱스를 생성하고, updated_at 자동 갱신 트리거를 설정한다.
- **파일**: `supabase/migrations/20260317000001_create_homepage_tables.sql` (동일 파일 내 포함)
- **검증 방법**: `\di` 명령으로 인덱스 존재 확인, UPDATE 실행 후 updated_at 자동 갱신 확인

### D-1.4: 기존 테이블 CHECK 제약조건 확장
- **설명**: contents.content_type에 'hp_blog_info', 'hp_blog_review', 'hp_page' 값을 허용하도록 CHECK 제약조건을 확장한다.
- **파일**: `supabase/migrations/20260317000002_extend_content_types.sql`
- **검증 방법**: 신규 content_type 값으로 INSERT 성공, 미허용 값으로 INSERT 시 에러 발생 확인

### D-1.5: Supabase Storage 버킷 생성
- **설명**: 포트폴리오 이미지, 로고, Before/After 사진을 저장하기 위한 'homepage-assets' Storage 버킷을 생성하고 공개 읽기 + 인증 업로드 정책을 설정한다.
- **파일**: `supabase/migrations/20260317000003_create_storage_bucket.sql`
- **검증 방법**: 버킷 존재 확인, 이미지 업로드/다운로드 테스트

### D-1.6: Down Migration (롤백용)
- **설명**: 마이그레이션 롤백을 위한 down migration SQL 파일. 생성한 테이블, 인덱스, RLS 정책, Storage 버킷을 제거한다.
- **파일**: `supabase/migrations/20260317000001_create_homepage_tables_down.sql`
- **검증 방법**: down migration 실행 후 5개 테이블 삭제 확인

### D-1.7: 스키마 문서
- **설명**: clients.brand_persona의 interior_profile 확장 스키마와 keywords.metadata의 blog_type 확장 스키마를 문서화한다.
- **파일**: `docs/schema/homepage-schema.md`
- **검증 방법**: 문서와 실제 스키마 일치 여부 대조

---

## 인수 기준 (Acceptance Criteria)

### AC-1.1: 테이블 생성
- [ ] homepage_projects 테이블이 올바른 컬럼과 타입으로 생성됨
- [ ] homepage_materials 테이블이 올바른 컬럼과 타입으로 생성됨
- [ ] homepage_portfolios 테이블이 올바른 컬럼과 타입으로 생성됨
- [ ] homepage_reviews 테이블이 올바른 컬럼과 타입으로 생성됨
- [ ] homepage_inquiries 테이블이 올바른 컬럼과 타입으로 생성됨

### AC-1.2: 외래 키 관계
- [ ] homepage_projects.client_id → clients(id) ON DELETE CASCADE 정상 동작
- [ ] homepage_materials.project_id → homepage_projects(id) ON DELETE CASCADE 정상 동작
- [ ] homepage_portfolios.project_id → homepage_projects(id) ON DELETE CASCADE 정상 동작
- [ ] homepage_reviews.project_id → homepage_projects(id) ON DELETE CASCADE 정상 동작
- [ ] homepage_inquiries.project_id → homepage_projects(id) ON DELETE CASCADE 정상 동작
- [ ] homepage_inquiries.client_id → clients(id) FK 정상 동작

### AC-1.3: CHECK 제약조건
- [ ] homepage_projects.status에 'collecting', 'building', 'build_failed', 'preview', 'live', 'suspended'만 허용
- [ ] homepage_reviews.rating에 1~5만 허용
- [ ] homepage_inquiries.status에 'new', 'contacted', 'consulting', 'contracted', 'lost'만 허용
- [ ] contents.content_type에 기존값 + 'hp_blog_info', 'hp_blog_review', 'hp_page' 허용

### AC-1.4: 인덱스
- [ ] idx_hp_projects_client (client_id) 생성됨
- [ ] idx_hp_projects_status (status) 생성됨
- [ ] idx_hp_projects_subdomain (subdomain) UNIQUE WHERE NOT NULL 생성됨
- [ ] idx_hp_materials_project (project_id) 생성됨
- [ ] idx_hp_portfolios_project (project_id) 생성됨
- [ ] idx_hp_reviews_project (project_id) 생성됨
- [ ] idx_hp_inquiries_project (project_id) 생성됨
- [ ] idx_hp_inquiries_status (status) 생성됨

### AC-1.5: RLS 정책
- [ ] 모든 5개 테이블에 RLS 활성화됨
- [ ] 워크스페이스 멤버가 자신의 클라이언트 데이터만 조회 가능
- [ ] 비멤버는 데이터 조회 불가
- [ ] homepage_inquiries에 비인증(anon) INSERT 허용

### AC-1.6: 트리거
- [ ] homepage_projects.updated_at 자동 갱신 트리거 동작
- [ ] homepage_materials.updated_at 자동 갱신 트리거 동작
- [ ] homepage_inquiries.updated_at 자동 갱신 트리거 동작

### AC-1.7: Storage
- [ ] 'homepage-assets' 버킷 생성됨
- [ ] 공개 읽기 정책 적용됨
- [ ] 인증된 사용자만 업로드 가능

### AC-1.8: 마이그레이션 가역성
- [ ] Down migration 실행으로 모든 변경사항 원복 가능

---

## 테스트 요구사항 (Test Requirements)

### T-1.1: 테이블 생성 확인
- **유형**: 통합
- **설명**: 마이그레이션 실행 후 5개 테이블의 존재 여부와 컬럼 구조를 확인한다.
- **예상 결과**: 5개 테이블 모두 존재하며 명세와 일치하는 컬럼/타입을 가진다.

### T-1.2: CASCADE DELETE 테스트
- **유형**: 통합
- **설명**: clients 레코드 삭제 시 연관된 homepage_projects가 삭제되고, homepage_projects 삭제 시 하위 materials/portfolios/reviews/inquiries가 모두 삭제되는지 확인한다.
- **예상 결과**: 상위 레코드 삭제 시 하위 레코드 자동 삭제됨.

### T-1.3: RLS 정책 테스트
- **유형**: 통합
- **설명**: 워크스페이스 멤버와 비멤버로 각각 데이터 조회를 시도하여 접근 제어가 정상 동작하는지 확인한다.
- **예상 결과**: 멤버는 자신의 워크스페이스 데이터만 조회 가능, 비멤버는 조회 불가.

### T-1.4: Anon INSERT 테스트
- **유형**: 통합
- **설명**: 비인증 사용자(anon)가 homepage_inquiries에 상담 신청을 INSERT할 수 있는지 확인한다.
- **예상 결과**: anon 사용자의 INSERT 성공.

### T-1.5: JSONB 데이터 저장/조회 테스트
- **유형**: 통합
- **설명**: homepage_projects.theme_config, seo_config, blog_config에 JSON 데이터를 저장하고 조회한다. homepage_materials.faq_items에 배열 데이터를 저장하고 조회한다.
- **예상 결과**: JSONB 데이터가 정확하게 저장/조회됨.

### T-1.6: Content Type 확장 테스트
- **유형**: 통합
- **설명**: contents 테이블에 content_type = 'hp_blog_info', 'hp_blog_review', 'hp_page'로 INSERT를 시도한다.
- **예상 결과**: 신규 content_type으로 INSERT 성공, 미정의 값으로 INSERT 시 실패.

### T-1.7: Storage 버킷 테스트
- **유형**: 통합
- **설명**: homepage-assets 버킷에 이미지 파일을 업로드하고, 공개 URL로 다운로드를 확인한다.
- **예상 결과**: 인증된 사용자 업로드 성공, 공개 URL 접근 성공.

### T-1.8: updated_at 트리거 테스트
- **유형**: 통합
- **설명**: homepage_projects 레코드를 UPDATE한 후 updated_at이 자동으로 갱신되는지 확인한다.
- **예상 결과**: UPDATE 전 후 updated_at 값이 다르며, UPDATE 시점의 타임스탬프와 일치.

---

## 의존성 (Dependencies)
- 기존 waide-mkt Supabase 프로젝트 (clients, keywords, contents 테이블 존재)
- update_updated_at_column() 함수 존재 (기존 프로젝트에서 사용 중)

## 위험 요소 (Risks)
- **기존 CHECK 제약조건 변경 리스크**: contents.content_type CHECK 제약조건 변경 시 기존 데이터에 영향을 줄 수 있음. 대응: ALTER TABLE로 기존 제약조건 DROP 후 확장된 제약조건 재생성. 기존 값은 모두 포함하므로 데이터 무결성 유지.
- **RLS 정책 성능**: 워크스페이스 멤버 조회 서브쿼리가 대량 데이터에서 성능 저하 가능. 대응: clients 테이블의 workspace_id 인덱스 확인, 필요 시 materialized view 활용.
- **update_updated_at_column() 함수 부재**: 기존 프로젝트에 해당 함수가 없을 수 있음. 대응: 마이그레이션에 CREATE OR REPLACE FUNCTION으로 포함.

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-1-detail.md`에서 통합되었습니다.

# Phase 1: DB 스키마 확장

## 개요
- **목적:** waide-mkt 기존 Supabase DB에 홈페이지 서비스 전용 테이블 5개를 추가하고, 기존 테이블의 컬럼/타입을 확장하여 홈페이지 데이터를 저장할 수 있는 기반을 마련한다.
- **예상 기간:** 1일
- **선행 조건:** waide-mkt Supabase 프로젝트 접근 권한, 기존 clients/keywords/contents 테이블 존재
- **산출물:** Supabase migration SQL 파일, 스키마 문서, RLS 정책

---

## 상세 작업 목록

### 1.1 homepage_projects 테이블 생성

#### 설명
홈페이지 프로젝트의 메인 엔티티. 클라이언트(인테리어 업체)당 1개의 프로젝트를 관리하며, 프로젝트 상태, 배포 정보, 테마 설정, SEO 설정, 블로그 발행 설정을 JSONB로 저장한다.

#### 기술 스펙
- `id`: UUID PK (gen_random_uuid)
- `client_id`: UUID FK → clients(id) ON DELETE CASCADE
- `project_name`: TEXT NOT NULL — 프로젝트 표시명
- `template_id`: TEXT NOT NULL DEFAULT 'modern-minimal' — 템플릿 식별자
- `status`: TEXT NOT NULL DEFAULT 'collecting' — 상태 머신
  - 허용값: `collecting`, `building`, `build_failed`, `preview`, `live`, `suspended`
- `subdomain`: TEXT UNIQUE — 서브도메인 (e.g., "gangnam-interior")
- `custom_domain`: TEXT — 커스텀 도메인 (선택)
- `vercel_project_id`: TEXT — Vercel 프로젝트 ID
- `vercel_deployment_url`: TEXT — 최신 배포 URL
- `theme_config`: JSONB NOT NULL DEFAULT '{}' — 테마 설정
- `seo_config`: JSONB NOT NULL DEFAULT '{}' — SEO 설정
- `blog_config`: JSONB NOT NULL DEFAULT '{}' — 블로그 발행 설정
- `total_visits`: INTEGER DEFAULT 0
- `total_inquiries`: INTEGER DEFAULT 0
- `last_deployed_at`: TIMESTAMPTZ
- `created_at`, `updated_at`: TIMESTAMPTZ

#### 파일 구조
```
supabase/migrations/
└── 20260317000001_create_homepage_tables.sql
```

#### 코드 예시
```sql
CREATE TABLE homepage_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'modern-minimal',
  status TEXT NOT NULL DEFAULT 'collecting'
    CHECK (status IN ('collecting','building','build_failed','preview','live','suspended')),
  subdomain TEXT UNIQUE,
  custom_domain TEXT,
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  theme_config JSONB NOT NULL DEFAULT '{}',
  seo_config JSONB NOT NULL DEFAULT '{}',
  blog_config JSONB NOT NULL DEFAULT '{}',
  total_visits INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  last_deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_projects_client ON homepage_projects(client_id);
CREATE INDEX idx_hp_projects_status ON homepage_projects(status);
CREATE UNIQUE INDEX idx_hp_projects_subdomain ON homepage_projects(subdomain) WHERE subdomain IS NOT NULL;

-- updated_at 자동 갱신 트리거
CREATE TRIGGER set_hp_projects_updated_at
  BEFORE UPDATE ON homepage_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 homepage_materials 테이블 생성

#### 설명
고객으로부터 수집한 자료를 저장하는 테이블. 업체 기본 정보, 서비스 정보, 브랜드 자료, SNS 계정 등을 관리한다. 프로젝트당 1:1 관계.

#### 기술 스펙
- `id`: UUID PK
- `project_id`: UUID FK → homepage_projects(id) ON DELETE CASCADE
- 필수 자료: `company_name`, `owner_name`, `phone`, `address`, `description`
- 좌표: `address_lat`, `address_lng` (FLOAT)
- 서비스 정보: `service_regions` TEXT[], `service_types` TEXT[]
- 브랜드: `logo_url`, `primary_color`, `secondary_color`
- SNS: `instagram_url`, `youtube_url`, `naver_place_url`, `naver_blog_url`
- 추가: `certifications` TEXT[], `operating_hours`, `business_number`, `faq_items` JSONB
- 상태: `is_complete` BOOLEAN, `submitted_at` TIMESTAMPTZ

#### 코드 예시
```sql
CREATE TABLE homepage_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  address_lat FLOAT,
  address_lng FLOAT,
  description TEXT NOT NULL,
  kakao_link TEXT,
  service_regions TEXT[] DEFAULT '{}',
  service_types TEXT[] DEFAULT '{}',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#10b981',
  instagram_url TEXT,
  youtube_url TEXT,
  naver_place_url TEXT,
  naver_blog_url TEXT,
  certifications TEXT[],
  operating_hours TEXT,
  business_number TEXT,
  faq_items JSONB DEFAULT '[]',
  is_complete BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_materials_project ON homepage_materials(project_id);
```

### 1.3 homepage_portfolios 테이블 생성

#### 설명
인테리어 시공 사례(포트폴리오)를 저장하는 테이블. Before/After 이미지, 공간 유형, 스타일, 평수, 예산 범위 등을 관리한다.

#### 기술 스펙
- `id`: UUID PK
- `project_id`: UUID FK → homepage_projects(id) ON DELETE CASCADE
- `title`: TEXT — 시공 사례 제목
- `slug`: TEXT — URL용 슬러그
- `space_type`: TEXT — 거실, 주방, 욕실 등
- `style`: TEXT — 모던, 북유럽 등
- `area_pyeong`: INTEGER — 평수
- `budget_range`: TEXT — 예산 범위
- `description`: TEXT — 시공 설명
- `image_urls`: TEXT[] — 완성 사진 배열
- `before_image_url`, `after_image_url`: TEXT — B/A 이미지
- `sort_order`: INTEGER DEFAULT 0
- `is_featured`: BOOLEAN DEFAULT FALSE — 메인 페이지 노출 여부

#### 코드 예시
```sql
CREATE TABLE homepage_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  title TEXT,
  slug TEXT,
  space_type TEXT,
  style TEXT,
  area_pyeong INTEGER,
  budget_range TEXT,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  before_image_url TEXT,
  after_image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_portfolios_project ON homepage_portfolios(project_id);
```

### 1.4 homepage_reviews 테이블 생성

#### 설명
고객 후기를 저장하는 테이블. 수동 입력 또는 네이버 플레이스에서 임포트할 수 있다.

#### 기술 스펙
- `id`: UUID PK
- `project_id`: UUID FK → homepage_projects(id) ON DELETE CASCADE
- `customer_name`: TEXT NOT NULL — 고객명 (마스킹)
- `rating`: INTEGER CHECK (1~5)
- `content`: TEXT NOT NULL — 후기 본문
- `project_type`: TEXT — 시공 유형
- `source`: TEXT DEFAULT 'manual' — 출처 (manual, naver_place, import)

#### 코드 예시
```sql
CREATE TABLE homepage_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  project_type TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_reviews_project ON homepage_reviews(project_id);
```

### 1.5 homepage_inquiries 테이블 생성

#### 설명
홈페이지 상담 신청 폼에서 접수된 상담 데이터를 저장하는 테이블. 상태 관리(new → contacted → consulting → contracted/lost)와 담당자 배분을 지원한다.

#### 기술 스펙
- `id`: UUID PK
- `project_id`: UUID FK → homepage_projects(id) ON DELETE CASCADE
- `client_id`: UUID FK → clients(id) — 업체 연결
- `name`, `phone`: TEXT NOT NULL — 고객 정보
- `area_pyeong`: INTEGER, `space_type`, `budget_range`, `message`: TEXT — 상담 내용
- `status`: TEXT DEFAULT 'new' — 상태 머신
- `assigned_to`: UUID — 담당자
- `notes`: TEXT — 내부 메모

#### 코드 예시
```sql
CREATE TABLE homepage_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area_pyeong INTEGER,
  space_type TEXT,
  budget_range TEXT,
  message TEXT,
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','consulting','contracted','lost')),
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_inquiries_project ON homepage_inquiries(project_id);
CREATE INDEX idx_hp_inquiries_status ON homepage_inquiries(status);
```

### 1.6 기존 테이블 확장

#### 설명
기존 clients, keywords, contents 테이블의 JSONB 스키마와 CHECK 제약조건을 확장한다.

#### 기술 스펙

**clients.brand_persona 확장 (JSONB 스키마 문서화)**
```jsonc
{
  // 기존 필드 유지
  "one_liner": "...",
  "positioning": "...",
  // ...

  // 신규 인테리어 전용 필드
  "interior_profile": {
    "service_regions": ["강남구", "서초구"],
    "service_types": ["아파트 인테리어", "리모델링"],
    "specialties": ["모던", "미니멀"],
    "avg_budget_range": "3000만~8000만",
    "experience_years": 10,
    "completed_projects": 150,
    "certifications": [],
    "operating_hours": "09:00-18:00",
    "business_number": "123-45-67890"
  }
}
```

**keywords.metadata 확장 (JSONB 스키마 문서화)**
```jsonc
{
  "blog_type": "정보성",        // "정보성" | "후기성" | "AEO"
  "content_format": "비용 분석표",
  "region": "강남구",
  "last_published_at": null,
  "publish_count": 0
}
```

**contents.content_type CHECK 확장**
```sql
-- content_type에 신규 값 추가
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_type_check;
ALTER TABLE contents ADD CONSTRAINT contents_content_type_check
  CHECK (content_type IN (
    -- 기존값
    'blog_seo', 'blog_story', 'blog_list', 'blog_review', 'blog_info',
    'aeo_qa', 'aeo_list', 'aeo_entity', 'place_info',
    -- 신규 추가
    'hp_blog_info', 'hp_blog_review', 'hp_page'
  ));
```

### 1.7 RLS(Row Level Security) 정책

#### 설명
모든 신규 테이블에 RLS를 활성화하고, 워크스페이스 기반 접근 제어를 설정한다.

#### 코드 예시
```sql
-- homepage_projects RLS
ALTER TABLE homepage_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_hp_projects"
  ON homepage_projects FOR SELECT
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_can_manage_hp_projects"
  ON homepage_projects FOR ALL
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin', 'member')
    )
  );

-- homepage_inquiries는 홈페이지에서 INSERT 가능 (anon)
CREATE POLICY "anyone_can_insert_inquiry"
  ON homepage_inquiries FOR INSERT
  WITH CHECK (true);
```

### 1.8 Supabase Storage 버킷 생성

#### 설명
포트폴리오 이미지, 로고, Before/After 사진을 저장하기 위한 Storage 버킷을 생성한다.

#### 코드 예시
```sql
-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES
  ('homepage-assets', 'homepage-assets', true);

-- 공개 읽기 허용
CREATE POLICY "public_read_homepage_assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'homepage-assets');

-- 인증된 사용자만 업로드
CREATE POLICY "auth_upload_homepage_assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'homepage-assets' AND auth.role() = 'authenticated');
```

---

## 테스트 계획
- [ ] 모든 테이블 생성 확인 (5개 신규 테이블)
- [ ] 외래 키 관계 정상 동작 (CASCADE DELETE 포함)
- [ ] 인덱스 생성 확인
- [ ] RLS 정책 테스트 — 워크스페이스 멤버만 조회 가능
- [ ] RLS 정책 테스트 — 비인증 사용자 상담 신청 INSERT 가능
- [ ] contents.content_type에 'hp_blog_info', 'hp_blog_review', 'hp_page' INSERT 가능
- [ ] JSONB 필드에 interior_profile, blog_type 구조 데이터 저장/조회 확인
- [ ] Storage 버킷 생성 및 이미지 업로드/다운로드 확인
- [ ] updated_at 트리거 동작 확인

## 완료 기준
- [ ] 5개 신규 테이블 생성 완료
- [ ] 기존 테이블 CHECK 제약조건 확장 완료
- [ ] 모든 RLS 정책 활성화 및 테스트 통과
- [ ] Storage 버킷 생성 및 정책 설정 완료
- [ ] migration 파일 작성 및 supabase db push 성공
- [ ] 스키마 문서 업데이트 완료
