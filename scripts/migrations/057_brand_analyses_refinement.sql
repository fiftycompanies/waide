-- 057: brand_analyses 보완/정제 컬럼 추가
-- Phase 2: 브랜드 분석 → 프로젝트 자동 생성

ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS refined_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS refined_strengths TEXT;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS refined_appeal TEXT;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS refined_target TEXT;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS refinement_count INTEGER DEFAULT 0;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS last_refined_at TIMESTAMPTZ;
