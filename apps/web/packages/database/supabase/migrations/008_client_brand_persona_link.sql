-- ================================================================
-- 008_client_brand_persona_link.sql
-- brand_personas에 client_id FK 추가
--
-- 목적: clients가 모든 운영 데이터의 최상위 귀속 단위가 되도록
--       brand_personas에도 client_id 컬럼을 추가한다.
--       기존 레코드는 NULL 허용 (마이그레이션 후 backfill_clients.py 실행)
-- ================================================================

ALTER TABLE brand_personas
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brand_personas_client
  ON brand_personas(client_id);

COMMENT ON COLUMN brand_personas.client_id IS
  'clients 테이블 FK. NULL = 마이그레이션 전 레거시 레코드 (backfill_clients.py로 채움)';
