-- 051_keywords_extension.sql
-- keywords 테이블 확장: status에 'suggested' 추가, metadata/source 컬럼 추가

-- 1. status CHECK 제약 변경 (기존: active/paused/archived/queued/refresh → suggested 추가)
-- 기존 CHECK 제약 삭제 후 재생성
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- keywords 테이블의 status 관련 CHECK 제약만 찾기 (pg_constraint + pg_class 조인)
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'keywords'
    AND con.contype = 'c'  -- CHECK constraint
    AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE keywords DROP CONSTRAINT ' || v_constraint_name;
  END IF;
END $$;

-- 새 CHECK 제약 추가 (멱등: IF NOT EXISTS 패턴)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'keywords'
      AND con.conname = 'keywords_status_check'
  ) THEN
    ALTER TABLE keywords ADD CONSTRAINT keywords_status_check
      CHECK (status IN ('active', 'paused', 'archived', 'queued', 'refresh', 'suggested'));
  END IF;
END $$;

-- 2. metadata JSONB 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. source 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- source: 'manual' | 'niche_expansion' | 'csv_import' | 'gsc_discovery'
