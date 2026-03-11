-- ============================================================
-- 017_keywords_status_extend.sql
-- keywords status CHECK 제약 재설정 (queued / refresh 추가)
-- ============================================================

DO $$
BEGIN
  -- 기존 CHECK 제약 제거
  ALTER TABLE keywords DROP CONSTRAINT IF EXISTS keywords_status_check;

  -- 새 CHECK 제약 추가 (active / paused / archived / queued / refresh)
  ALTER TABLE keywords
    ADD CONSTRAINT keywords_status_check
    CHECK (status IN ('active', 'paused', 'archived', 'queued', 'refresh'));
END;
$$;
