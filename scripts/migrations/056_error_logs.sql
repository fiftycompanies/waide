-- 056_error_logs.sql
-- Phase ERR-1: 에러 모니터링 시스템
-- error_logs 테이블 생성

BEGIN;

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 에러 정보
  error_message text NOT NULL,
  error_stack text,
  error_type text CHECK (error_type IN ('client', 'server', 'api', 'cron')),
  -- 컨텍스트
  page_url text,
  user_id uuid,
  user_email text,
  user_role text,
  client_id uuid,
  -- 메타데이터
  metadata jsonb DEFAULT '{}',
  browser_info text,
  -- 상태
  status text DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'ignored')),
  resolved_at timestamptz,
  resolved_by uuid,
  -- 타임스탬프
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);

COMMIT;
