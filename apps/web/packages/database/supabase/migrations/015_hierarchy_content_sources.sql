-- ============================================================
-- 015_hierarchy_content_sources.sql  [수정됨 2025-02-23]
-- clients 계층 구조 + content_sources 테이블
-- ============================================================

-- 1. clients 계층 구조 컬럼 추가
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'brand' CHECK (client_type IN ('platform', 'brand', 'shop'));

CREATE INDEX IF NOT EXISTS idx_clients_parent_id ON clients(parent_id);

-- 2. content_sources 테이블 신규 생성
CREATE TABLE IF NOT EXISTS content_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_type   TEXT NOT NULL CHECK (source_type IN ('blog', 'url', 'text', 'pdf', 'video', 'image', 'api', 'review')),
  title         TEXT,
  url           TEXT,
  content_data  JSONB DEFAULT '{}',
  usage_mode    TEXT DEFAULT 'reference' CHECK (usage_mode IN ('reference', 'style', 'fact', 'cta')),
  tags          TEXT[] DEFAULT '{}',
  used_count    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_sources_client_id ON content_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_content_sources_is_active ON content_sources(is_active);

-- RLS
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;

-- 서비스 롤 전체 허용
CREATE POLICY IF NOT EXISTS "service_role_content_sources"
  ON content_sources FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
