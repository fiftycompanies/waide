-- 070_homepage_requests.sql
-- 홈페이지 제작 신청 테이블
-- 포털에서 고객이 템플릿 선택 후 제작 신청 → 어드민에서 확인 → 생성 → 전달

BEGIN;

CREATE TABLE IF NOT EXISTS homepage_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_name VARCHAR(50) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'generating', 'completed', 'delivered', 'failed')),
  note          TEXT,
  admin_note    TEXT,
  project_id    UUID REFERENCES homepage_projects(id) ON DELETE SET NULL,
  requested_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_homepage_requests_client_id ON homepage_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_homepage_requests_status ON homepage_requests(status);
CREATE INDEX IF NOT EXISTS idx_homepage_requests_created_at ON homepage_requests(created_at DESC);

-- RLS 활성화
ALTER TABLE homepage_requests ENABLE ROW LEVEL SECURITY;

-- 정책: authenticated 사용자 전체 접근 (어드민은 서비스 키로, 고객은 자기 것만)
CREATE POLICY "homepage_requests_select_own"
  ON homepage_requests FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "homepage_requests_insert_own"
  ON homepage_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- 서비스 키(어드민)는 모든 행 접근 가능 (createAdminClient 사용)

COMMIT;
