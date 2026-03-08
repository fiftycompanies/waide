-- 061_phase7_10.sql
-- Phase 7-10: 프롬프트 편집 + 진화지식 + 검색량 + AEO 리포트
-- 실행 환경: Supabase SQL Editor

BEGIN;

-- 1. evolving_knowledge 테이블 확장 (knowledge_type, confidence 컬럼 추가)
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS knowledge_type text DEFAULT 'general';
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS evidence jsonb DEFAULT '{}';
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS confidence float DEFAULT 0.5;
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE evolving_knowledge ADD COLUMN IF NOT EXISTS learned_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_evolving_knowledge_type ON evolving_knowledge(knowledge_type);

-- 2. keywords 테이블 검색량 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS monthly_search_volume integer;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS pc_volume integer;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS mobile_volume integer;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS competition text;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS volume_updated_at timestamptz;

COMMIT;
