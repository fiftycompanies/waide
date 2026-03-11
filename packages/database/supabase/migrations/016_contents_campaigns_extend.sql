-- ============================================================
-- 016_contents_campaigns_extend.sql
-- contents + campaigns 컬럼 확장
-- ============================================================

-- 1. contents 확장
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS refreshed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_content_id  UUID REFERENCES contents(id) ON DELETE SET NULL;

-- content_type CHECK 제약 갱신 (기존 컬럼이 이미 있는 경우 CHECK만 추가)
DO $$
BEGIN
  -- content_type 컬럼이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='contents' AND column_name='content_type'
  ) THEN
    ALTER TABLE contents ADD COLUMN content_type TEXT DEFAULT 'single';
  END IF;

  -- 기존 CHECK 제약 제거 후 재설정
  BEGIN
    ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  ALTER TABLE contents
    ADD CONSTRAINT contents_content_type_check
    CHECK (content_type IN ('list', 'review', 'special', 'single', 'info'));
END;
$$;

CREATE INDEX IF NOT EXISTS idx_contents_original_content_id ON contents(original_content_id);

-- 2. campaigns 확장
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS publish_count        INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_type_ratio   JSONB DEFAULT '{"single":100}',
  ADD COLUMN IF NOT EXISTS source_ids           UUID[],
  ADD COLUMN IF NOT EXISTS target_client_ids    UUID[],
  ADD COLUMN IF NOT EXISTS content_type         TEXT DEFAULT 'single';
