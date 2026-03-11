-- ═══════════════════════════════════════════════════════════
-- 027: 크론 스케줄러 실행 이력 + 추가 스케줄러 설정
-- ═══════════════════════════════════════════════════════════

-- 크론 실행 이력 테이블
CREATE TABLE IF NOT EXISTS cron_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name    TEXT NOT NULL,      -- 'serp_collection', 'search_volume', 'grading'
  status       TEXT NOT NULL DEFAULT 'running'
               CHECK (status IN ('running', 'success', 'failed')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  duration_ms  INTEGER,
  details      JSONB DEFAULT '{}',
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_task
  ON cron_logs (task_name, started_at DESC);

-- 검색량 갱신 스케줄러 기본 설정
INSERT INTO settings (key, value, description)
VALUES (
  'search_volume_scheduler',
  '{"enabled": true, "cron_day": 1, "run_at_hour": 4}',
  '검색량 갱신 스케줄러 설정 (매월 N일 N시)'
) ON CONFLICT (key) DO NOTHING;

-- 계정 등급 + 발행 추천 스케줄러 기본 설정
INSERT INTO settings (key, value, description)
VALUES (
  'grading_scheduler',
  '{"enabled": true, "cron_weekday": 1, "run_at_hour": 5}',
  '계정 등급/키워드 난이도/발행 추천 스케줄러 설정 (매주 N요일 N시)'
) ON CONFLICT (key) DO NOTHING;
