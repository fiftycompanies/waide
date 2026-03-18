-- 066: homepage_projects에 생성 파이프라인 관련 컬럼 추가
ALTER TABLE homepage_projects
  ADD COLUMN IF NOT EXISTS reference_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_homepage_url TEXT;

COMMENT ON COLUMN homepage_projects.reference_url IS '레퍼런스 홈페이지 URL (AI 생성 시 크롤링 대상)';
COMMENT ON COLUMN homepage_projects.brand_homepage_url IS '브랜드 기존 홈페이지 URL (있으면 추가 참조)';
