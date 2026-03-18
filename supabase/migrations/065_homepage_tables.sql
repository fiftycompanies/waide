-- ============================================================
-- 065_homepage_tables.sql
-- 인테리어 홈페이지 서비스 통합: 신규 5개 테이블 생성
-- 2026-03-17
-- ============================================================

-- ── 1. homepage_projects — 홈페이지 프로젝트 ─────────────────────────────────
-- 클라이언트별 홈페이지 프로젝트 관리 (1 client : N projects 가능)
CREATE TABLE IF NOT EXISTS homepage_projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- 프로젝트 기본 정보
  project_name         TEXT NOT NULL,
  template_id          TEXT NOT NULL DEFAULT 'modern-minimal',
  status               TEXT NOT NULL DEFAULT 'collecting'
                       CHECK (status IN ('collecting','building','preview','live','suspended')),

  -- 배포 정보
  subdomain            TEXT,
  custom_domain        TEXT,
  vercel_project_id    TEXT,
  vercel_deployment_url TEXT,

  -- 테마 설정 (CSS 변수 등)
  theme_config         JSONB NOT NULL DEFAULT '{}',

  -- SEO 설정 (메타태그, JSON-LD, sitemap 등)
  seo_config           JSONB NOT NULL DEFAULT '{}',

  -- 블로그 발행 설정
  blog_config          JSONB NOT NULL DEFAULT '{}',

  -- 통계
  total_visits         INTEGER NOT NULL DEFAULT 0,
  total_inquiries      INTEGER NOT NULL DEFAULT 0,
  last_deployed_at     TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hp_projects_client
  ON homepage_projects (client_id);

CREATE INDEX IF NOT EXISTS idx_hp_projects_status
  ON homepage_projects (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hp_projects_subdomain
  ON homepage_projects (subdomain) WHERE subdomain IS NOT NULL;

COMMENT ON TABLE homepage_projects IS '인테리어 홈페이지 프로젝트. template_id: modern-minimal | natural-wood | premium-dark';
COMMENT ON COLUMN homepage_projects.status IS 'collecting → building → preview → live → suspended';
COMMENT ON COLUMN homepage_projects.theme_config IS '{ primary_color, secondary_color, font_heading, font_body, logo_url, favicon_url, og_image_url }';
COMMENT ON COLUMN homepage_projects.seo_config IS '{ meta_title_template, meta_description, keywords[], json_ld_local_business, sitemap_config, robots_config }';
COMMENT ON COLUMN homepage_projects.blog_config IS '{ posts_per_month, info_ratio, review_ratio, auto_publish, target_keywords[], content_calendar[] }';

-- ── 2. homepage_materials — 고객 수집 자료 ───────────────────────────────────
-- 홈페이지 제작에 필요한 업체 기본 정보 + 브랜드 자료
CREATE TABLE IF NOT EXISTS homepage_materials (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  -- 필수 자료
  company_name         TEXT NOT NULL,
  owner_name           TEXT NOT NULL,
  phone                TEXT NOT NULL,
  address              TEXT NOT NULL,
  address_lat          FLOAT,
  address_lng          FLOAT,
  description          TEXT NOT NULL,
  kakao_link           TEXT,

  -- 서비스 정보
  service_regions      TEXT[] NOT NULL DEFAULT '{}',
  service_types        TEXT[] NOT NULL DEFAULT '{}',

  -- 브랜드 자료 (선택)
  logo_url             TEXT,
  primary_color        TEXT DEFAULT '#2563eb',
  secondary_color      TEXT DEFAULT '#10b981',

  -- SNS 계정 (선택)
  instagram_url        TEXT,
  youtube_url          TEXT,
  naver_place_url      TEXT,
  naver_blog_url       TEXT,

  -- 추가 정보 (선택)
  certifications       TEXT[],
  operating_hours      TEXT,
  business_number      TEXT,
  faq_items            JSONB NOT NULL DEFAULT '[]',

  -- 상태
  is_complete          BOOLEAN NOT NULL DEFAULT false,
  submitted_at         TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hp_materials_project
  ON homepage_materials (project_id);

COMMENT ON TABLE homepage_materials IS '홈페이지 제작용 고객 수집 자료. project 당 1개.';
COMMENT ON COLUMN homepage_materials.faq_items IS '[{ "q": "질문", "a": "답변" }]';
COMMENT ON COLUMN homepage_materials.service_regions IS '서비스 지역 배열. 예: ["강남구", "서초구"]';

-- ── 3. homepage_portfolios — 포트폴리오 (시공사례) ───────────────────────────
-- 인테리어 업체 시공 사례. Before/After 사진 포함
CREATE TABLE IF NOT EXISTS homepage_portfolios (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  title                TEXT,
  slug                 TEXT,
  space_type           TEXT,
  style                TEXT,
  area_pyeong          INTEGER,
  budget_range         TEXT,
  description          TEXT,

  -- 이미지
  image_urls           TEXT[] NOT NULL DEFAULT '{}',
  before_image_url     TEXT,
  after_image_url      TEXT,

  -- 메타
  sort_order           INTEGER NOT NULL DEFAULT 0,
  is_featured          BOOLEAN NOT NULL DEFAULT false,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hp_portfolios_project
  ON homepage_portfolios (project_id);

COMMENT ON TABLE homepage_portfolios IS '포트폴리오 (시공 사례). is_featured=true인 항목은 메인페이지에 노출.';
COMMENT ON COLUMN homepage_portfolios.space_type IS '거실, 주방, 욕실, 침실 등';
COMMENT ON COLUMN homepage_portfolios.style IS '모던, 북유럽, 클래식, 내추럴 등';

-- ── 4. homepage_reviews — 고객 후기 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homepage_reviews (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  customer_name        TEXT NOT NULL,
  rating               INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content              TEXT NOT NULL,
  project_type         TEXT,
  source               TEXT NOT NULL DEFAULT 'manual'
                       CHECK (source IN ('manual','naver_place','import')),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hp_reviews_project
  ON homepage_reviews (project_id);

COMMENT ON TABLE homepage_reviews IS '고객 후기. source: manual(직접입력), naver_place(네이버플레이스 크롤링), import(CSV 임포트)';

-- ── 5. homepage_inquiries — 상담 신청 ───────────────────────────────────────
-- 홈페이지 방문자가 남기는 상담 요청
CREATE TABLE IF NOT EXISTS homepage_inquiries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  client_id            UUID REFERENCES clients(id),

  name                 TEXT NOT NULL,
  phone                TEXT NOT NULL,
  area_pyeong          INTEGER,
  space_type           TEXT,
  budget_range         TEXT,
  message              TEXT,

  status               TEXT NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','contacted','consulting','contracted','lost')),
  assigned_to          UUID,
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hp_inquiries_project
  ON homepage_inquiries (project_id);

CREATE INDEX IF NOT EXISTS idx_hp_inquiries_status
  ON homepage_inquiries (status);

COMMENT ON TABLE homepage_inquiries IS '홈페이지 상담 신청. 방문자 → 리드 전환 추적.';
COMMENT ON COLUMN homepage_inquiries.status IS 'new → contacted → consulting → contracted | lost';

-- ── 6. RLS 비활성화 (서비스 롤키로만 접근) ───────────────────────────────────
ALTER TABLE homepage_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_inquiries DISABLE ROW LEVEL SECURITY;

-- ── 7. updated_at 자동 갱신 트리거 ──────────────────────────────────────────
-- 기존 트리거 함수가 없는 경우 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_homepage_projects
  BEFORE UPDATE ON homepage_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_homepage_materials
  BEFORE UPDATE ON homepage_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_homepage_inquiries
  BEFORE UPDATE ON homepage_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
