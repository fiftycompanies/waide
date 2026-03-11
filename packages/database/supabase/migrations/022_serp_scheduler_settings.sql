-- ============================================================
-- 022_serp_scheduler_settings.sql
-- SERP 스케줄러 설정 테이블
-- settings 테이블: key-value 구조로 시스템 설정 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화 (서버 사이드 service key로만 접근)
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- ── SERP 스케줄러 기본값 삽입 ─────────────────────────────
INSERT INTO settings (key, value, description) VALUES
(
  'serp_scheduler',
  '{
    "enabled": true,
    "interval_hours": 24,
    "run_at_hour": 6,
    "slack_webhook_url": "",
    "slack_channel": "#serp-alerts",
    "top_n_alert": 3,
    "rank_threshold": 20
  }',
  'SERP 순위 수집 스케줄러 설정'
)
ON CONFLICT (key) DO NOTHING;
