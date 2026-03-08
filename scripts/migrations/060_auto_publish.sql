-- 060_auto_publish.sql
-- Phase 6: 자동 배포 엔진 (Tistory/WordPress/Medium)
-- blog_accounts 확장 + publications + auto_publish_settings

BEGIN;

-- ═══════════════════════════════════════════
-- 1. blog_accounts 테이블 확장
-- ═══════════════════════════════════════════

-- platform CHECK 확장 (medium 추가)
DO $$ BEGIN
  ALTER TABLE blog_accounts DROP CONSTRAINT IF EXISTS blog_accounts_platform_check;
  ALTER TABLE blog_accounts ADD CONSTRAINT blog_accounts_platform_check
    CHECK (platform IN ('naver', 'tistory', 'wordpress', 'medium', 'brunch'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 인증 정보 컬럼 추가
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'manual';
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS refresh_token text;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS api_key text;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS api_secret text;

-- 플랫폼별 추가 정보
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS blog_id text;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS platform_user_id text;

-- 상태 확장
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS last_published_at timestamptz;
ALTER TABLE blog_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- auth_type CHECK
DO $$ BEGIN
  ALTER TABLE blog_accounts ADD CONSTRAINT blog_accounts_auth_type_check
    CHECK (auth_type IN ('manual', 'oauth', 'api_key'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ═══════════════════════════════════════════
-- 2. publications 테이블 (신규)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  blog_account_id uuid REFERENCES blog_accounts(id) ON DELETE SET NULL,

  platform text NOT NULL CHECK (platform IN ('tistory', 'wordpress', 'medium', 'manual')),
  external_url text,
  external_post_id text,

  status text DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed')),
  publish_type text DEFAULT 'manual' CHECK (publish_type IN ('manual', 'auto')),
  error_message text,
  retry_count integer DEFAULT 0,

  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publications_content ON publications(content_id);
CREATE INDEX IF NOT EXISTS idx_publications_client ON publications(client_id);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);

-- ═══════════════════════════════════════════
-- 3. auto_publish_settings 테이블 (신규)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auto_publish_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  is_enabled boolean DEFAULT false,
  default_platform text,
  default_blog_account_id uuid REFERENCES blog_accounts(id) ON DELETE SET NULL,

  tistory_enabled boolean DEFAULT false,
  wordpress_enabled boolean DEFAULT false,
  medium_enabled boolean DEFAULT false,

  publish_as_draft boolean DEFAULT false,
  add_canonical_url boolean DEFAULT true,
  add_schema_markup boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

COMMIT;
