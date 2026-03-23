-- 071_homepage_manual_workflow.sql
-- 홈페이지 빌더: 자동생성 → 수동 제작 플로우 전환
-- 실행: Supabase Dashboard SQL Editor

BEGIN;

-- 1. homepage_requests.status CHECK 재생성 (reviewing 추가, generating/failed 제거)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- 기존 status CHECK 제약 찾기
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'homepage_requests'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE homepage_requests DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE homepage_requests
  ADD CONSTRAINT homepage_requests_status_check
  CHECK (status IN ('pending', 'reviewing', 'completed', 'delivered', 'generating', 'failed'));
-- NOTE: generating/failed는 기존 데이터 호환을 위해 유지. 신규 흐름에서는 미사용.

-- 2. 신규 컬럼 추가
ALTER TABLE homepage_requests ADD COLUMN IF NOT EXISTS admin_memo TEXT;
ALTER TABLE homepage_requests ADD COLUMN IF NOT EXISTS result_url TEXT;

-- 3. 기존 generating/failed → pending 으로 정리 (선택)
-- 필요 시 아래 주석 해제:
-- UPDATE homepage_requests SET status = 'pending' WHERE status IN ('generating', 'failed');

COMMIT;
