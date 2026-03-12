-- 062_auto_publish_settings_extend.sql
-- Phase 3 (포털): 자동발행 설정 확장 (키워드 풀 + 발행 주기)

BEGIN;

-- auto_publish_settings에 settings JSONB 컬럼 추가
ALTER TABLE auto_publish_settings ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- contents에 scheduled_at 컬럼 추가 (예약 발행)
ALTER TABLE contents ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- scheduled_at 인덱스 (크론에서 사용)
CREATE INDEX IF NOT EXISTS idx_contents_scheduled_at
  ON contents(scheduled_at)
  WHERE publish_status = 'scheduled' AND scheduled_at IS NOT NULL;

COMMIT;
