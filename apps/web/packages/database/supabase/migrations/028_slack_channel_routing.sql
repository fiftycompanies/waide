-- 028_slack_channel_routing.sql
-- Slack 알림 채널을 용도별로 분리하여 settings 테이블에 저장.
-- 기존 slack_webhook 키의 JSONB 값에 채널 라우팅 설정을 추가한다.

UPDATE settings
SET value = value || '{
  "serp_channel": "#serp-tracking",
  "pipeline_channel": "#content-pipeline",
  "alerts_channel": "#alerts"
}'::jsonb,
    updated_at = NOW()
WHERE key = 'slack_webhook';
