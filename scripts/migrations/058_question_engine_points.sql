-- 058: Question Engine + Point System
-- Phase 3: questions, client_points, point_transactions, point_settings, contents extension

BEGIN;

-- 1. questions 테이블
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  question text NOT NULL,
  intent text,
  source text NOT NULL CHECK (source IN ('llm', 'paa', 'naver', 'manual')),
  language text DEFAULT 'ko',
  is_selected boolean DEFAULT false,
  content_id uuid REFERENCES contents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_keyword ON questions(keyword_id);
CREATE INDEX IF NOT EXISTS idx_questions_client ON questions(client_id);

-- 2. client_points 테이블
CREATE TABLE IF NOT EXISTS client_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_points_client ON client_points(client_id);

-- 3. point_transactions 테이블
CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('grant', 'spend', 'revoke', 'signup_bonus')),
  description text,
  content_id uuid REFERENCES contents(id),
  granted_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_tx_client ON point_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_point_tx_type ON point_transactions(type);

-- 4. point_settings 테이블
CREATE TABLE IF NOT EXISTS point_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value integer NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO point_settings (setting_key, setting_value, description)
VALUES
  ('signup_bonus', 3, '회원가입 시 무료 제공 포인트'),
  ('cost_per_content', 1, '콘텐츠 1건 생성 비용 (포인트)')
ON CONFLICT (setting_key) DO NOTHING;

-- 5. contents 테이블 확장
ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES questions(id);

-- content_type CHECK 제약 추가 (기존 제약 없으면)
-- 허용 값: blog_list/blog_review/blog_info (CLAUDE.md) + single/list/review/info (레거시) + aeo_*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contents_content_type_check'
  ) THEN
    ALTER TABLE contents ADD CONSTRAINT contents_content_type_check
      CHECK (content_type IN ('blog_list', 'blog_review', 'blog_info', 'aeo_qa', 'aeo_list', 'aeo_entity', 'single', 'list', 'review', 'info'));
  END IF;
END $$;

COMMIT;
