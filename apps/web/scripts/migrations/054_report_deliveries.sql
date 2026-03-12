-- 054: 월간 리포트 발송 시스템
-- Phase G-1: 월간 PDF 리포트 + 이메일 발송

-- 1. clients 테이블에 metadata JSONB 컬럼 추가 (report_settings 등 저장)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN clients.metadata IS 'JSONB: report_settings({ enabled, recipient_email }) 등';

-- 2. report_deliveries 테이블 생성
CREATE TABLE IF NOT EXISTS report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  pdf_buffer_stored BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 중복 발송 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_deliveries_client_month
  ON report_deliveries(client_id, report_month);

-- 상태별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_report_deliveries_status
  ON report_deliveries(status);

COMMENT ON TABLE report_deliveries IS '월간 리포트 발송 이력 (Phase G-1)';
