-- 034_brand_analyses_converted.sql
-- brand_analyses status에 'converted' 추가 (브랜드 등록 연결 완료)

ALTER TABLE brand_analyses DROP CONSTRAINT IF EXISTS brand_analyses_status_check;
ALTER TABLE brand_analyses ADD CONSTRAINT brand_analyses_status_check
  CHECK (status IN ('pending', 'analyzing', 'completed', 'failed', 'converted'));
