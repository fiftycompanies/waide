-- 040: 분석 로그 CRM 1단계
-- brand_analyses 테이블 확장: 영업 파이프라인 + 연락처 + 코멘트

-- CRM 파이프라인 상태 (기존 status는 분석 상태용으로 유지)
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new';
-- 'new' → 'contacted' → 'consulting' → 'contracted' → 'active' → 'churned'

-- 영업 코멘트 (JSONB 배열)
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;

-- 고객 연락처
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 마지막 활동 시간 (정렬용)
ALTER TABLE brand_analyses ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_brand_analyses_lead_status ON brand_analyses(lead_status);
CREATE INDEX IF NOT EXISTS idx_brand_analyses_sales_ref ON brand_analyses(sales_ref);
CREATE INDEX IF NOT EXISTS idx_brand_analyses_last_activity ON brand_analyses(last_activity_at DESC);

-- 기존 completed 분석건 lead_status 초기화 (analyzed_at 기준 last_activity_at)
UPDATE brand_analyses
SET last_activity_at = COALESCE(analyzed_at, created_at, now())
WHERE last_activity_at IS NULL OR last_activity_at = now();

-- consultation_requests에서 이미 연락처가 있는 건 자동 채우기
UPDATE brand_analyses ba
SET
  contact_name = COALESCE(ba.contact_name, cr.contact_name),
  contact_phone = COALESCE(ba.contact_phone, cr.contact_phone),
  contact_email = COALESCE(ba.contact_email, cr.contact_email),
  lead_status = CASE WHEN ba.lead_status = 'new' THEN 'contacted' ELSE ba.lead_status END
FROM consultation_requests cr
WHERE cr.analysis_id = ba.id
  AND ba.contact_name IS NULL
  AND cr.contact_name IS NOT NULL;
