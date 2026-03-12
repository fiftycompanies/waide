-- 039: brand_analyses에 seo_audit, keyword_rankings JSONB 컬럼 추가
-- SEO 결격 사유 진단 + 키워드 순위 현황

ALTER TABLE brand_analyses
ADD COLUMN IF NOT EXISTS seo_audit JSONB,
ADD COLUMN IF NOT EXISTS keyword_rankings JSONB;

COMMENT ON COLUMN brand_analyses.seo_audit IS 'SEO 결격 사유 진단 결과 (7항목 체크)';
COMMENT ON COLUMN brand_analyses.keyword_rankings IS '키워드 순위 현황 (TOP 3 네이버 로컬 검색)';
