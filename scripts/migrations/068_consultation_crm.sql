-- ══════════════════════════════════════════════════════════════════════════════
-- 068: 상담 CRM 확장 — consultation_requests 테이블 CRM 기능 추가
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. status CHECK 확장 (기존 'pending','contacted','converted' + 새 상태 추가)
ALTER TABLE consultation_requests DROP CONSTRAINT IF EXISTS consultation_requests_status_check;
ALTER TABLE consultation_requests
  ADD CONSTRAINT consultation_requests_status_check
  CHECK (status IN ('pending','contacted','consulting','converted','contracted','closed'));

-- 2. CRM 관련 컬럼 추가
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS interested_items TEXT[] DEFAULT '{}';
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS marketing_score INTEGER;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web';
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS consultation_date TIMESTAMPTZ;
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE consultation_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_assigned_to ON consultation_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_last_activity ON consultation_requests(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_created_at ON consultation_requests(created_at DESC);

-- 4. 기존 데이터 보강: brand_analyses 에서 매장명/점수 역정규화
UPDATE consultation_requests cr
SET
  brand_name = COALESCE(cr.brand_name, ba.basic_info->>'name'),
  marketing_score = COALESCE(cr.marketing_score, ba.marketing_score::integer),
  last_activity_at = COALESCE(cr.last_activity_at, cr.created_at),
  updated_at = COALESCE(cr.updated_at, cr.created_at)
FROM brand_analyses ba
WHERE cr.analysis_id = ba.id
  AND (cr.brand_name IS NULL OR cr.marketing_score IS NULL);

COMMIT;
