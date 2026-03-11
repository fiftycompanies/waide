-- ================================================================
-- 013_agent_prompts_and_requests.sql
--
-- 변경 사항:
--   1. agent_prompts    : 에이전트별 프롬프트 섹션 버전 관리 테이블
--   2. agent_requests   : 에이전트 간 작업 요청 로그 테이블
--
-- 실행: Supabase 대시보드 SQL 에디터에 붙여넣기
--       또는: psql $DATABASE_URL -f 013_agent_prompts_and_requests.sql
-- ================================================================

-- ================================================================
-- PART 1: agent_prompts
-- 에이전트 시스템 프롬프트 섹션별 버전 관리
-- ================================================================

CREATE TABLE IF NOT EXISTS agent_prompts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 식별
  agent_type      TEXT        NOT NULL,
    -- CMO | RND | COPYWRITER | OPS_QUALITY | OPS_PUBLISHER
  prompt_section  TEXT        NOT NULL,
    -- system_role | skills | rules | output_format
  title           TEXT        NOT NULL,
    -- 섹션 내 소제목 (예: "SEO 전문가 역할", "AEO 최적화 규칙")

  -- 내용
  content         TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  version         INTEGER     NOT NULL DEFAULT 1,

  -- 감사
  updated_by      TEXT        NOT NULL DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 동일 에이전트/섹션/제목의 버전 중복 방지
  UNIQUE (agent_type, prompt_section, title, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_active
  ON agent_prompts(agent_type, is_active);

COMMENT ON TABLE agent_prompts IS
  '에이전트 시스템 프롬프트 섹션별 버전 관리.
   업데이트 = 기존 is_active=FALSE + 새 version INSERT 방식으로 이력 보존.
   로드: agent_type + is_active=TRUE 조건으로 조합 후 에이전트에 주입.';

COMMENT ON COLUMN agent_prompts.prompt_section IS
  'system_role | skills | rules | output_format';

COMMENT ON COLUMN agent_prompts.is_active IS
  'TRUE=현행 버전, FALSE=이전 버전(이력 보존). 에이전트는 TRUE만 로드.';


-- ================================================================
-- PART 2: agent_requests
-- 에이전트 간 태스크 요청 로그
-- ================================================================

CREATE TABLE IF NOT EXISTS agent_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계
  client_id       UUID        REFERENCES clients(id) ON DELETE CASCADE,
  parent_job_id   UUID        REFERENCES jobs(id) ON DELETE SET NULL,

  -- 요청 당사자
  from_agent      TEXT        NOT NULL,
    -- 요청한 에이전트 (예: CMO)
  to_agent        TEXT        NOT NULL,
    -- 요청 받는 에이전트 (예: RND)

  -- 내용
  request_type    TEXT        NOT NULL,
    -- 예: KEYWORD_ANALYSIS | CONTENT_REVIEW | SEO_AUDIT
  context         JSONB       NOT NULL DEFAULT '{}',
    -- 요청 맥락 (키워드, 브랜드 정보 등)
  message         TEXT        NOT NULL,
    -- 자연어 요청 메시지
  response        TEXT,
    -- 응답 에이전트의 답변

  -- 상태
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_requests_status
  ON agent_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_requests_agents
  ON agent_requests(from_agent, to_agent);

COMMENT ON TABLE agent_requests IS
  '에이전트 간 태스크 위임/요청 로그.
   CMO가 RND에게 키워드 분석을 요청하는 등 에이전트 협업 흐름을 추적.';


-- ================================================================
-- PART 3: updated_at 트리거
-- ================================================================

CREATE TRIGGER agent_prompts_updated_at
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER agent_requests_updated_at
  BEFORE UPDATE ON agent_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- PART 4: RLS (서비스 롤만 쓰기, 어드민 UI에서 읽기)
-- ================================================================

ALTER TABLE agent_prompts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_requests ENABLE ROW LEVEL SECURITY;

-- agent_prompts: 인증된 사용자 읽기 + 서비스 롤 전체
CREATE POLICY "authenticated_read" ON agent_prompts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_role_all" ON agent_prompts FOR ALL
  USING (TRUE);

-- agent_requests: 클라이언트 워크스페이스 소속 확인
CREATE POLICY "workspace_access" ON agent_requests FOR ALL
  USING (
    client_id IS NULL
    OR EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = agent_requests.client_id
        AND wm.user_id = auth.uid()
    )
  );


-- ================================================================
-- 실행 확인
-- ================================================================

-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('agent_prompts', 'agent_requests');
