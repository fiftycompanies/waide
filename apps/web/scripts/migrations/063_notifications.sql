-- 063_notifications.sql
-- Phase 4: 알림 센터 + 알림 설정 테이블

BEGIN;

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'rank_drop', 'rank_rise', 'publish_complete', 'quota_warning', 'auto_publish_confirm'
  )),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 알림 설정 테이블
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{
    "rank_drop": true,
    "rank_rise": true,
    "publish_complete": true,
    "quota_warning": true,
    "email_enabled": false,
    "push_enabled": false
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
