-- ============================================================
-- 021_admin_system.sql
-- 어드민 계정 시스템
-- - admin_users 테이블 생성
-- - 비밀번호 해싱: bcryptjs $2b$ (Node.js 서버에서 처리)
-- - 초기 어드민 시드: admin / admin1234
-- ============================================================

-- ── admin_users 테이블 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  display_name  TEXT,
  role          TEXT    DEFAULT 'admin'
                        CHECK (role IN ('super_admin', 'admin', 'viewer')),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS 비활성화 (서버 사이드에서만 service key로 접근) ────────
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- ── 초기 어드민 시드 ──────────────────────────────────────────
-- username: admin  /  password: admin1234
-- password_hash: bcryptjs $2b$10$ (Node.js에서 생성, cost=10)
INSERT INTO admin_users (username, password_hash, display_name, role)
VALUES (
  'admin',
  '$2b$10$mGiqm.HcCOtwe14LZ1z6Ked1cA94a6I1ufGnYH0hhysyEY.kNiBnK',
  '관리자',
  'super_admin'
)
ON CONFLICT (username) DO NOTHING;

-- ── 기존 pgcrypto 해시를 사용 중이라면 아래 UPDATE로 교체 ────
-- (021_admin_system.sql 재실행 시 기존 해시를 bcryptjs 호환 해시로 교체)
UPDATE admin_users
   SET password_hash = '$2b$10$mGiqm.HcCOtwe14LZ1z6Ked1cA94a6I1ufGnYH0hhysyEY.kNiBnK',
       updated_at    = NOW()
 WHERE username = 'admin'
   AND password_hash NOT LIKE '$2b$%';
