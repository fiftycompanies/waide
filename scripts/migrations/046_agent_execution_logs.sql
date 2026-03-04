-- 046_agent_execution_logs.sql
-- 에이전트 실행 로그 테이블 (성과 추적 + 비용 추적)

CREATE TABLE IF NOT EXISTS agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  -- 'RND' | 'CMO' | 'COPYWRITER' | 'QC' | 'ANALYST' | 'PUBLISHER'
  task TEXT NOT NULL,
  -- 'competitor_analysis' | 'brand_persona' | 'content_create_v2' 등
  prompt_version INTEGER,
  -- agent_prompts의 version
  client_id UUID REFERENCES clients(id),
  -- 어떤 고객 관련 작업인지
  input_summary TEXT,
  -- 입력 데이터 요약 (전체 저장하면 너무 커짐)
  output_data JSONB,
  -- AI 응답 결과 (파싱된 JSON)
  model TEXT,
  -- 'claude-haiku-4-5' | 'claude-sonnet-4-5' 등
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_cost_usd NUMERIC(10, 6),
  -- 비용 추적 ($0.008 등)
  duration_ms INTEGER,
  -- 실행 시간
  status TEXT DEFAULT 'success',
  -- 'success' | 'error' | 'timeout'
  error_message TEXT,
  chain_id UUID,
  -- 체이닝 실행 시 같은 chain_id 공유
  chain_step INTEGER,
  -- 체인 내 순서 (1, 2, 3...)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_task ON agent_execution_logs(agent, task);
CREATE INDEX IF NOT EXISTS idx_agent_logs_client ON agent_execution_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_chain ON agent_execution_logs(chain_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_execution_logs(created_at);
