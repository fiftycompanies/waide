-- ============================================================
-- 064_auth_unification.sql
-- 인증 통합: admin_users → users 단일 테이블 전환 준비
--
-- 실행 방법: Supabase Dashboard → SQL Editor에서 실행
-- ============================================================

BEGIN;

-- ─── 1. users 테이블에 auth_provider 컬럼 추가 ─────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- auth_provider CHECK 제약 (멱등)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.conname = 'users_auth_provider_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_provider_check
      CHECK (auth_provider IN ('email', 'google', 'kakao'));
  END IF;
END $$;

-- ─── 2. users 테이블 role CHECK에 'viewer' 추가 ────────────────
-- 기존: ('super_admin','admin','sales','client_owner','client_member')
-- 변경: ('super_admin','admin','sales','viewer','client_owner','client_member')
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- 기존 role CHECK 제약 찾기
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'users'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%role%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || constraint_name;
  END IF;

  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin','admin','sales','viewer','client_owner','client_member'));
END $$;

-- ─── 3. users 테이블에 avatar_url 컬럼 확인/추가 ──────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ─── 4. admin_users 테이블 DEPRECATED 표시 ─────────────────────
-- 삭제는 안정화 후. 기존 데이터 보존.
COMMENT ON TABLE public.admin_users IS
  'DEPRECATED: 2026-03 이후 신규 사용 중단. users 테이블로 통합됨. 기존 HMAC 인증 폴백용 유지.';

-- ─── 5. Supabase Auth 신규 사용자 → users 자동 생성 트리거 ─────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    auth_id,
    email,
    name,
    full_name,
    role,
    auth_provider,
    avatar_url,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'client_member',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NEW.raw_user_meta_data->>'avatar_url',
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    auth_provider = EXCLUDED.auth_provider,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 있으면 교체
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
