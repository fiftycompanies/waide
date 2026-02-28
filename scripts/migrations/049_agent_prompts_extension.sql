-- 049_agent_prompts_extension.sql
-- 기존 agent_prompts 테이블에 에이전트 실행 엔진용 컬럼 추가
-- 기존 컬럼: id, agent_type, prompt_section, title, content, is_active, version(int), updated_by, created_at, updated_at

-- task: agent_type + task 조합으로 프롬프트 식별 (기존 prompt_section과 병행)
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS task TEXT;

-- system_prompt: 시스템 프롬프트 (기존 content는 user template)
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- output_schema: 출력 형태 정의 (구조화된 응답 강제)
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS output_schema JSONB;

-- model: 사용할 Claude 모델
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'claude-haiku-4-5';

-- temperature: 생성 온도
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.3;

-- max_tokens: 최대 토큰
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2000;

-- metadata: A/B 테스트, 성과 데이터 등
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 인덱스: agent_type + task 조합 조회 최적화
CREATE INDEX IF NOT EXISTS idx_agent_prompts_task ON agent_prompts(agent_type, task);
