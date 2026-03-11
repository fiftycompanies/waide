-- 042_auth_users.sql
-- 기존 users 테이블 확장 (Supabase Auth 연동) + 초대 관리
-- 주의: 001_initial_schema.sql에서 이미 users(id, email, full_name, avatar_url, created_at, updated_at) 생성됨

-- 기존 users 테이블에 새 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client_owner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_agent_id UUID REFERENCES sales_agents(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- role CHECK 제약 추가 (기존에 없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin','admin','sales','client_owner','client_member'));
  END IF;
END $$;

-- name이 NULL이면 full_name에서 복사
UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 초대 관리
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client_owner',
  client_id UUID REFERENCES clients(id),
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
