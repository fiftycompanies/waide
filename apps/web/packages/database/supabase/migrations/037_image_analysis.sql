-- 037_image_analysis.sql
-- brand_analyses에 이미지 분석 결과 JSONB 컬럼 추가

ALTER TABLE brand_analyses
  ADD COLUMN IF NOT EXISTS image_analysis JSONB;

COMMENT ON COLUMN brand_analyses.image_analysis IS '이미지 수집 + Vision AI 분석 결과 JSONB';
