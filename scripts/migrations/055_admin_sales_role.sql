-- 055: admin_users CHECK 제약에 'sales' 역할 추가
-- Phase STRUCT-1: 역할 기반 메뉴 분리를 위해 영업자 역할 추가

BEGIN;

-- 기존 CHECK 제약 드롭 후 재생성 (멱등)
DO $$
BEGIN
  -- admin_users role CHECK
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'admin_users' AND c.conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users DROP CONSTRAINT admin_users_role_check;
  END IF;

  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin', 'admin', 'sales', 'viewer'));
END $$;

COMMIT;
