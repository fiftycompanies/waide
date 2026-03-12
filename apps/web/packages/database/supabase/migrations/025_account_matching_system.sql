-- ============================================================
-- 025: 계정-키워드 매칭 발행 추천 시스템
-- account_grades / keyword_difficulty /
-- publishing_recommendations / matching_feedback_log
-- ============================================================

-- ── ENUM 확장 ────────────────────────────────────────────────
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'ANALYST_MATCH';

ALTER TYPE job_type  ADD VALUE IF NOT EXISTS 'ACCOUNT_GRADE';
ALTER TYPE job_type  ADD VALUE IF NOT EXISTS 'KEYWORD_GRADE';
ALTER TYPE job_type  ADD VALUE IF NOT EXISTS 'PUBLISH_RECOMMEND';
ALTER TYPE job_type  ADD VALUE IF NOT EXISTS 'FEEDBACK_PROCESS';

-- ─────────────────────────────────────────────────────────────
-- 1. account_grades — 계정 등급 일별 스냅샷
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_grades (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  account_id          UUID          NOT NULL REFERENCES blog_accounts(id) ON DELETE CASCADE,

  -- 성과 지표
  total_published     INTEGER       NOT NULL DEFAULT 0,
  exposed_keywords    INTEGER       NOT NULL DEFAULT 0,
  exposure_rate       DECIMAL(5,2)  NOT NULL DEFAULT 0,   -- %
  avg_rank            DECIMAL(5,1),
  top3_count          INTEGER       NOT NULL DEFAULT 0,
  top10_count         INTEGER       NOT NULL DEFAULT 0,
  top3_ratio          DECIMAL(5,2)  NOT NULL DEFAULT 0,   -- %
  top10_ratio         DECIMAL(5,2)  NOT NULL DEFAULT 0,   -- %
  consistency_rate    DECIMAL(5,2)  NOT NULL DEFAULT 0,   -- 30일 순위 유지율 %

  -- 종합 등급
  account_score       DECIMAL(5,1)  NOT NULL DEFAULT 0,   -- 0~100
  grade               CHAR(1)       NOT NULL DEFAULT 'C'  -- S/A/B/C
                      CHECK (grade IN ('S','A','B','C')),
  previous_grade      CHAR(1)                             -- 이전 등급
                      CHECK (previous_grade IN ('S','A','B','C')),
  grade_change_reason TEXT,

  measured_at         DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ   DEFAULT NOW(),

  UNIQUE (account_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_account_grades_client
  ON account_grades(client_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_grades_account
  ON account_grades(account_id, measured_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2. keyword_difficulty — 키워드 난이도
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keyword_difficulty (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword_id            UUID          NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- 검색 지표
  search_volume_total   INTEGER       NOT NULL DEFAULT 0,
  competition_level     VARCHAR(10)   NOT NULL DEFAULT 'medium'
                        CHECK (competition_level IN ('low','medium','high')),
  current_rank_pc       INTEGER,
  current_rank_mo       INTEGER,
  mo_ratio              DECIMAL(5,1)  NOT NULL DEFAULT 0,  -- MO 검색 비율 %

  -- 난이도/기회 점수
  difficulty_score      DECIMAL(5,1)  NOT NULL DEFAULT 0,  -- 0~100
  grade                 CHAR(1)       NOT NULL DEFAULT 'C'
                        CHECK (grade IN ('S','A','B','C')),
  opportunity_score     DECIMAL(5,1)  NOT NULL DEFAULT 0,  -- 0~100

  measured_at           DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),

  UNIQUE (keyword_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_keyword_difficulty_client
  ON keyword_difficulty(client_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_difficulty_keyword
  ON keyword_difficulty(keyword_id, measured_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. publishing_recommendations — 발행 추천
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publishing_recommendations (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword_id              UUID          NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  account_id              UUID          NOT NULL REFERENCES blog_accounts(id) ON DELETE CASCADE,

  -- 매칭 점수
  match_score             DECIMAL(5,1)  NOT NULL DEFAULT 0,
  rank                    INTEGER       NOT NULL DEFAULT 1,  -- 추천 순위
  account_grade           CHAR(1)       CHECK (account_grade IN ('S','A','B','C')),
  keyword_grade           CHAR(1)       CHECK (keyword_grade IN ('S','A','B','C')),
  bonuses                 JSONB         NOT NULL DEFAULT '{}',
  penalties               JSONB         NOT NULL DEFAULT '{}',
  reason                  TEXT,

  -- 상태
  status                  VARCHAR(20)   NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','rejected','expired')),

  -- 피드백 (발행 후 7일 결과)
  feedback_result         VARCHAR(20)
                          CHECK (feedback_result IN ('top3','top10','top20','exposed','not_exposed')),
  feedback_rank_achieved  INTEGER,
  feedback_at             TIMESTAMPTZ,

  measured_at             DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at              TIMESTAMPTZ   DEFAULT NOW(),

  UNIQUE (keyword_id, account_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_pub_rec_client
  ON publishing_recommendations(client_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_rec_keyword
  ON publishing_recommendations(keyword_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_rec_status
  ON publishing_recommendations(status, measured_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. matching_feedback_log — 피드백 루프 기록
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matching_feedback_log (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id       UUID          NOT NULL
                          REFERENCES publishing_recommendations(id) ON DELETE CASCADE,
  keyword_id              UUID          NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  account_id              UUID          NOT NULL REFERENCES blog_accounts(id) ON DELETE CASCADE,

  predicted_grade_match   CHAR(5),     -- "A→A" 형태
  actual_result           VARCHAR(20)
                          CHECK (actual_result IN ('top3','top10','top20','exposed','not_exposed')),
  rank_achieved           INTEGER,
  days_to_rank            INTEGER,
  confidence_delta        DECIMAL(3,2) NOT NULL DEFAULT 0,
  lesson                  TEXT,

  created_at              TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_log_rec
  ON matching_feedback_log(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_log_account
  ON matching_feedback_log(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_log_keyword
  ON matching_feedback_log(keyword_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RLS: 서비스 롤 전체 허용 (agents + dashboard 공용)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE account_grades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_difficulty          ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_recommendations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_feedback_log       ENABLE ROW LEVEL SECURITY;

-- 서비스 롤 정책 (supabase_admin / service_role → 전체 접근)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'account_grades' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY "service_all" ON account_grades
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'keyword_difficulty' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY "service_all" ON keyword_difficulty
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'publishing_recommendations' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY "service_all" ON publishing_recommendations
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matching_feedback_log' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY "service_all" ON matching_feedback_log
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
