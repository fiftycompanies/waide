-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 059: AEO Tracking System
-- Phase 4+5: LLM 크롤링 + Mention Detection + AEO Score + 추적 큐
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. llm_answers: LLM 답변 저장 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ai_model text NOT NULL CHECK (ai_model IN ('perplexity', 'claude', 'chatgpt', 'gemini')),
  response_text text NOT NULL,
  sources jsonb DEFAULT '[]',
  crawl_method text CHECK (crawl_method IN ('api', 'playwright')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_llm_answers_question ON llm_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_llm_answers_client ON llm_answers(client_id);
CREATE INDEX IF NOT EXISTS idx_llm_answers_model ON llm_answers(ai_model);
CREATE INDEX IF NOT EXISTS idx_llm_answers_created ON llm_answers(created_at);

-- ── 2. mentions: 브랜드 언급 감지 결과 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES llm_answers(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  is_target boolean DEFAULT false,
  position integer,
  context text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence float DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentions_answer ON mentions(answer_id);
CREATE INDEX IF NOT EXISTS idx_mentions_client ON mentions(client_id);
CREATE INDEX IF NOT EXISTS idx_mentions_target ON mentions(client_id, is_target);

-- ── 3. aeo_scores: AEO 점수 집계 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aeo_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword_id uuid REFERENCES keywords(id),
  ai_model text,
  score float NOT NULL DEFAULT 0,
  mention_count integer DEFAULT 0,
  total_queries integer DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aeo_scores_client ON aeo_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_aeo_scores_period ON aeo_scores(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_aeo_scores_client_period ON aeo_scores(client_id, period_start, period_end);

-- ── 4. aeo_tracking_queue: 추적 작업 큐 (1000+ 고객 확장성) ───────────────
CREATE TABLE IF NOT EXISTS aeo_tracking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  ai_model text NOT NULL,
  priority integer DEFAULT 2,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_aeo_queue_status ON aeo_tracking_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_aeo_queue_client ON aeo_tracking_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_aeo_queue_pending ON aeo_tracking_queue(status) WHERE status = 'pending';

-- ── 5. aeo_tracking_settings: 추적 설정 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS aeo_tracking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO aeo_tracking_settings (setting_key, setting_value, description) VALUES
  ('max_questions_per_client_per_day', '10', '고객당 일일 최대 추적 질문 수'),
  ('enabled_ai_models', '["perplexity","claude"]', '활성화된 AI 모델 JSON 배열'),
  ('repeat_count', '3', '동일 질문 반복 횟수'),
  ('cron_enabled', 'false', '자동 크론 활성화 여부'),
  ('playwright_enabled', 'false', 'Playwright 크롤링 활성화 여부')
ON CONFLICT (setting_key) DO NOTHING;

-- ── 6. point_transactions: refund 타입 추가 ────────────────────────────────
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('grant', 'spend', 'revoke', 'signup_bonus', 'refund'));

-- ── 7. contents: content_type CHECK 재설정 ──────────────────────────────────
-- 허용 값: blog_list/blog_review/blog_info (CLAUDE.md) + single/list/review/info (레거시) + aeo_*
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_type_check;
ALTER TABLE contents ADD CONSTRAINT contents_content_type_check
  CHECK (content_type IN ('blog_list', 'blog_review', 'blog_info', 'aeo_qa', 'aeo_list', 'aeo_entity', 'single', 'list', 'review', 'info'));

COMMIT;
