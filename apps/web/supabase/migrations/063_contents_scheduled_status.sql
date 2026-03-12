-- Phase 1: contents.publish_status에 scheduled, pending_confirm 상태 추가 + scheduled_at 컬럼
-- 2026-03-11

-- contents.publish_status CHECK 확장
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_publish_status_check;
ALTER TABLE contents ADD CONSTRAINT contents_publish_status_check
  CHECK (publish_status IN ('draft','review','approved','published','rejected','archived','scheduled','pending_confirm'));

-- 예약 발행 시간 컬럼 추가
ALTER TABLE contents ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
