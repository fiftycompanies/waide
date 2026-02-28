-- 051_keywords_extension.sql
-- keywords 테이블 확장: status에 'suggested' 추가, metadata/source 컬럼 추가

-- 1. status CHECK 제약 변경 (기존: active/paused/archived/queued/refresh → suggested 추가)
-- 기존 CHECK 제약 삭제 후 재생성
DO $$
BEGIN
  -- 기존 CHECK 제약 찾아서 삭제
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%status%'
    AND constraint_schema = 'public'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE keywords DROP CONSTRAINT ' || constraint_name
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%status%'
      AND constraint_schema = 'public'
      LIMIT 1
    );
  END IF;
END $$;

-- 새 CHECK 제약 추가
ALTER TABLE keywords ADD CONSTRAINT keywords_status_check
  CHECK (status IN ('active', 'paused', 'archived', 'queued', 'refresh', 'suggested'));

-- 2. metadata JSONB 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. source 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- source: 'manual' | 'niche_expansion' | 'csv_import' | 'gsc_discovery'
