-- ============================================================
-- 023_client_type_extend.sql
-- client_type 허용값에 company / sub_client 추가
-- ============================================================

-- 기존 인라인 CHECK 제약 제거 후 새 제약 추가
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('company', 'sub_client', 'platform', 'brand', 'shop'));

-- 기본값도 company로 변경 (새 브랜드는 본사로 시작)
ALTER TABLE clients ALTER COLUMN client_type SET DEFAULT 'company';
