-- 036_sales_agents_enhance.sql
-- 영업사원 추적 시스템 강화

-- 1. sales_agents에 성과 카운터 + 메타 컬럼 추가
ALTER TABLE sales_agents
  ADD COLUMN IF NOT EXISTS total_analyses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_consultations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. consultation_requests에 sales_ref 인덱스 (빠른 집계)
CREATE INDEX IF NOT EXISTS idx_consultation_requests_sales_ref
  ON consultation_requests(sales_ref);

-- 3. brand_analyses에 sales_ref 인덱스 (이미 있을 수 있으나 IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_brand_analyses_sales_ref
  ON brand_analyses(sales_ref);
