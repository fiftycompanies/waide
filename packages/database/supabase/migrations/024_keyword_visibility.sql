-- ============================================================
-- 024_keyword_visibility.sql
-- 노출 점유율 집계 테이블 신규 생성
-- ============================================================

-- ── 키워드별 일별 노출 점수 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keyword_visibility (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword_id          UUID        NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  measured_at         DATE        NOT NULL,
  rank_pc             INTEGER,                             -- 당일 PC 순위 (NULL = 미노출)
  rank_mo             INTEGER,                             -- 당일 MO 순위 (NULL = 미노출)
  visibility_score_pc DECIMAL(5,2) NOT NULL DEFAULT 0,    -- PC 점수 (0~100)
  visibility_score_mo DECIMAL(5,2) NOT NULL DEFAULT 0,    -- MO 점수 (0~100)
  search_volume_pc    INTEGER      NOT NULL DEFAULT 0,    -- 월 검색량 PC
  search_volume_mo    INTEGER      NOT NULL DEFAULT 0,    -- 월 검색량 MO
  is_exposed          BOOLEAN      NOT NULL DEFAULT false, -- 노출 여부 (PC OR MO 중 하나라도)
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(keyword_id, measured_at)
);

-- ── 고객사별 일별 집계 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_visibility_summary (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id              UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measured_at            DATE        NOT NULL,
  total_keywords         INTEGER     NOT NULL DEFAULT 0,  -- 전체 트래킹 키워드 수
  exposed_keywords       INTEGER     NOT NULL DEFAULT 0,  -- 노출된 키워드 수
  exposure_rate          DECIMAL(5,2) NOT NULL DEFAULT 0, -- 단순 노출률 (%)
  weighted_visibility_pc DECIMAL(5,2) NOT NULL DEFAULT 0, -- 가중 노출 점유율 PC (%)
  weighted_visibility_mo DECIMAL(5,2) NOT NULL DEFAULT 0, -- 가중 노출 점유율 MO (%)
  avg_rank_pc            DECIMAL(5,2),                    -- 평균 순위 PC
  avg_rank_mo            DECIMAL(5,2),                    -- 평균 순위 MO
  top3_count             INTEGER     NOT NULL DEFAULT 0,  -- 상위 3위 키워드 수
  top10_count            INTEGER     NOT NULL DEFAULT 0,  -- 상위 10위 키워드 수
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, measured_at)
);

-- ── 인덱스 ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_keyword_visibility_client_date
  ON keyword_visibility(client_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_keyword_visibility_keyword_date
  ON keyword_visibility(keyword_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_vis_summary_client_date
  ON daily_visibility_summary(client_id, measured_at DESC);

-- ── RLS 비활성화 (서비스 롤키로만 접근) ──────────────────────────────────────
ALTER TABLE keyword_visibility DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_visibility_summary DISABLE ROW LEVEL SECURITY;
