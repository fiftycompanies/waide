-- ============================================================
-- 038_content_sources_fix.sql
-- content_sources 테이블 누락 컬럼 추가
-- 에러: column content_sources.tags does not exist
-- ============================================================

-- tags 컬럼 추가 (원래 015에서 정의했으나 실제 DB에 누락)
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
