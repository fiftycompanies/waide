-- 066: contents.publish_status CHECK에 'tracking' 추가
-- published_url 입력 시 status='tracking'으로 설정하여 추적 상태 분리

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- 기존 publish_status CHECK 제약 찾기
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
  WHERE pg_class.relname = 'contents'
    AND contype = 'c'
    AND pg_get_constraintdef(pg_constraint.oid) LIKE '%publish_status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE contents DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE contents ADD CONSTRAINT contents_publish_status_check
    CHECK (publish_status IN ('draft','review','approved','published','rejected','archived','tracking'));
END $$;
