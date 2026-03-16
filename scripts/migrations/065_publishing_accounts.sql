-- 065: publishing_accounts 테이블 + contents.publishing_account_id 컬럼
-- 블로그 발행 멀티스텝 플로우를 위한 발행 채널 관리

BEGIN;

-- 1) publishing_accounts 테이블
CREATE TABLE IF NOT EXISTS publishing_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_name text NOT NULL,
  account_url text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  memo text,
  created_at timestamptz DEFAULT now()
);

-- 클라이언트+플랫폼당 기본 계정 1개만
CREATE UNIQUE INDEX IF NOT EXISTS publishing_accounts_default_idx
  ON publishing_accounts(client_id, platform)
  WHERE is_default = true;

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS publishing_accounts_client_idx
  ON publishing_accounts(client_id);

-- 2) contents 테이블에 publishing_account_id 컬럼 추가
ALTER TABLE contents ADD COLUMN IF NOT EXISTS publishing_account_id uuid REFERENCES publishing_accounts(id);

COMMIT;
