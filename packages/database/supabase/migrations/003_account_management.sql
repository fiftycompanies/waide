-- ================================================================
-- 003_account_management.sql
-- 고객관리 기능 강화
--
-- 변경 사항:
--   1. ENUM 확장: agent_type에 ACCOUNT_MANAGER,
--                 job_type에 CLIENT_ONBOARD 추가
--   2. clients 테이블: source_type, source_config, brand_guidelines 추가
--   3. subscriptions 테이블 신규 생성
--
-- 실행 순서 중요:
--   PART 1 (ALTER TYPE) 을 PART 2~3보다 먼저 실행해야 함.
--   Supabase SQL Editor에서 전체를 한 번에 실행해도 됩니다.
-- ================================================================


-- ================================================================
-- PART 1: ENUM 확장
--
-- PostgreSQL에서 ENUM 값 추가는 트랜잭션 밖에서도 동작하며,
-- IF NOT EXISTS로 중복 실행 시 오류 없이 넘어감.
-- ================================================================

-- 고객관리 에이전트 타입 추가
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'ACCOUNT_MANAGER';

-- 고객 온보딩 Job 타입 추가
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'CLIENT_ONBOARD';


-- ================================================================
-- PART 2: clients 테이블 컬럼 추가
--
-- source_type  : 콘텐츠 소스 유형 (API | GOOGLE_DRIVE | LOCAL)
-- source_config: 소스 접근에 필요한 설정 (JSONB)
--                 API          → {"api_key": "...", "base_url": "..."}
--                 GOOGLE_DRIVE → {"folder_id": "...", "spreadsheet_id": "..."}
--                 LOCAL        → {"path": "/data/client/", "extensions": [...]}
-- brand_guidelines: 콘텐츠 작성 시 지켜야 할 브랜드 가이드라인 (자유 텍스트)
--                   COPYWRITER 에이전트가 프롬프트에 주입하는 데 사용
-- ================================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS source_type TEXT
    CHECK (source_type IN ('API', 'GOOGLE_DRIVE', 'LOCAL')),
  ADD COLUMN IF NOT EXISTS source_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_guidelines TEXT;

COMMENT ON COLUMN clients.source_type IS
  '콘텐츠 소스 유형. AccountManagerAgent가 다른 에이전트에게 전달할 접근 경로 타입.';

COMMENT ON COLUMN clients.source_config IS
  '소스 접근 설정 JSONB. API: {api_key, base_url} | GOOGLE_DRIVE: {folder_id, spreadsheet_id} | LOCAL: {path, extensions}';

COMMENT ON COLUMN clients.brand_guidelines IS
  '브랜드 가이드라인 전문. COPYWRITER 에이전트 프롬프트에 직접 주입됨. 톤앤매너, 금지어, 필수 메시지 등 포함.';


-- ================================================================
-- PART 3: subscriptions 테이블 신규 생성
--
-- 역할:
--   - 고객별 결제 상태를 추적
--   - status = 'active'인 고객만 Job 생성 허용 (비즈니스 규칙)
--   - AccountManagerAgent가 신규 활성 구독을 감지해 CMO Job 자동 생성
--
-- 상태 흐름:
--   trial → active → (past_due → active | cancelled)
-- ================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- 플랜 정보
  plan_name           TEXT         NOT NULL DEFAULT 'basic'
                                   CHECK (plan_name IN ('trial', 'basic', 'pro', 'enterprise')),
  billing_cycle       TEXT         DEFAULT 'monthly'
                                   CHECK (billing_cycle IN ('monthly', 'annual', 'one_time')),
  amount              NUMERIC(12, 2),
  currency            TEXT         DEFAULT 'KRW',

  -- 결제 상태
  status              TEXT         NOT NULL DEFAULT 'trial'
                                   CHECK (status IN (
                                     'trial',      -- 무료 체험 중
                                     'active',     -- 정상 결제 완료 → Job 생성 허용
                                     'past_due',   -- 결제 실패 (유예기간)
                                     'cancelled',  -- 해지
                                     'paused'      -- 일시 중지
                                   )),
  payment_method      TEXT,        -- 'card', 'bank_transfer', 'invoice' 등
  last_payment_at     TIMESTAMPTZ,
  next_payment_at     TIMESTAMPTZ,

  -- 구독 기간
  trial_ends_at       DATE,
  started_at          DATE         DEFAULT CURRENT_DATE,
  ends_at             DATE,

  -- 온보딩 추적
  -- AccountManagerAgent가 이 구독을 감지해 CMO Job을 생성하면 여기에 기록
  -- NULL = 아직 온보딩 Job 미생성 → 에이전트가 픽업해야 할 대상
  onboarding_job_id   UUID         REFERENCES jobs(id) ON DELETE SET NULL,

  -- 계약 범위 (CMO가 캠페인 기획 시 참고)
  scope               JSONB        DEFAULT '{}'
    -- 예시:
    -- {
    --   "monthly_content_count": 20,
    --   "platforms": ["NAVER_BLOG", "TISTORY"],
    --   "keyword_count": 30,
    --   "include_report": true,
    --   "include_design": false
    -- }
  ,

  -- 외부 결제 서비스 연동 (포트원, 토스페이먼츠 등)
  external_id         TEXT,        -- 외부 결제 서비스의 구독 ID
  metadata            JSONB        DEFAULT '{}',

  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW(),

  -- 한 고객사에 활성 구독은 1개만 허용
  UNIQUE(client_id, status)
);

COMMENT ON TABLE subscriptions IS
  '고객별 결제/구독 상태. status=active인 경우만 Job 생성 허용. AccountManagerAgent가 신규 활성화를 감지해 CMO Job 자동 생성.';

COMMENT ON COLUMN subscriptions.scope IS
  '계약 범위. CMO가 캠페인 기획 시 monthly_content_count, platforms 등을 참고해 작업 규모 결정.';

COMMENT ON COLUMN subscriptions.onboarding_job_id IS
  'AccountManagerAgent가 생성한 최초 CLIENT_ONBOARD Job ID. NULL이면 아직 온보딩 미완료.';


-- ================================================================
-- PART 4: 인덱스
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_client    ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_pay  ON subscriptions(next_payment_at);

-- AccountManagerAgent 핵심 쿼리 최적화:
-- "아직 온보딩 안 된 active 구독" 을 빠르게 찾기
CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_onboard
  ON subscriptions(status, onboarding_job_id)
  WHERE status = 'active' AND onboarding_job_id IS NULL;

-- clients 소스 타입 인덱스
CREATE INDEX IF NOT EXISTS idx_clients_source_type ON clients(source_type);


-- ================================================================
-- PART 5: updated_at 트리거
-- ================================================================

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- PART 6: RLS
-- ================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_access" ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = subscriptions.client_id
        AND wm.user_id = auth.uid()
    )
  );


-- ================================================================
-- 실행 확인 쿼리:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'clients'
--   AND column_name IN ('source_type', 'source_config', 'brand_guidelines');
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'subscriptions';
-- ================================================================
