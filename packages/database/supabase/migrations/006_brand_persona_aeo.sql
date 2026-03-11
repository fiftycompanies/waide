-- ================================================================
-- 006_brand_persona_aeo.sql
-- 브랜드 페르소나 분석 + AEO SOM(Share of Model) 측정 시스템
--
-- 변경 사항:
--   1. ENUM 확장  : job_type에 BRAND_ANALYZE·AEO_SCAN·SOM_REPORT,
--                   agent_type에 ANALYST_REPORT 추가
--   2. brands 확장: brand_voice·target_persona·category_main·category_sub
--   3. aeo_metrics : AI 모델별 키워드 인용 추적 (SOM 원시 데이터)
--   4. som_reports : 주간 AI 모델 점유율(SOM) 집계 보고
--
-- 안전: IF NOT EXISTS / ADD VALUE IF NOT EXISTS → 기존 데이터 보존
-- ================================================================


-- ================================================================
-- PART 1: ENUM 확장
-- ================================================================

-- 브랜드 페르소나 분석 (김연구원)
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'BRAND_ANALYZE'; -- URL/텍스트 → 페르소나 추출

-- AEO 인용 스캔 (김연구원)
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'AEO_SCAN';      -- AI 모델별 브랜드 인용 체크

-- 주간 SOM 리포트 (리포트봇)
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'SOM_REPORT';    -- 주간 AI 점유율 보고

-- 리포트봇 에이전트
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'ANALYST_REPORT';


-- ================================================================
-- PART 2: brands 테이블 확장 — 페르소나 필드
-- ================================================================

-- 브랜드 보이스 / 문체 지침
-- 예: {"tone": "따뜻함/힐링", "style": "감성적", "keywords": ["자연","가족"],
--      "avoid_words": ["복잡함"], "persona_type": "family_camping",
--      "writing_rules": ["감성 스토리텔링 중심"]}
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_voice     JSONB DEFAULT '{}';

-- 타겟 페르소나 정의
-- 예: {"age_group": "30-50대", "gender_focus": "여성", "family_type": "4인 가족",
--      "lifestyle": ["캠핑 초보"], "pain_points": ["도심 스트레스"],
--      "goals": ["가족 유대감 강화"]}
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS target_persona  JSONB DEFAULT '{}';

-- 업종 대분류·소분류 (CMO 전략 분류용)
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS category_main   TEXT;  -- 예: 숙박/캠핑

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS category_sub    TEXT;  -- 예: 가족 글램핑


-- ================================================================
-- PART 3: aeo_metrics — AI 모델 인용 추적 원시 데이터
-- ================================================================

CREATE TABLE IF NOT EXISTS aeo_metrics (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id     UUID         REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id        UUID         REFERENCES clients(id)    ON DELETE CASCADE,
  brand_id         UUID         REFERENCES brands(id)     ON DELETE SET NULL,
  keyword          TEXT         NOT NULL,          -- 스캔 대상 키워드
  platform         TEXT         NOT NULL           -- 조회 플랫폼
                                CHECK (platform IN (
                                  'PERPLEXITY', 'CHATGPT', 'GEMINI',
                                  'NAVER_AI', 'GOOGLE_AEO', 'CLAUDE'
                                )),
  query_text       TEXT,                           -- 실제 질의 텍스트
  is_cited         BOOLEAN      DEFAULT FALSE,     -- 브랜드 인용 여부
  cited_rank       INTEGER,                        -- 인용 순서 (1=첫 번째)
  cited_text       TEXT,                           -- 인용된 문장
  source_url       TEXT,                           -- 인용된 출처 URL
  response_summary TEXT,                           -- AI 응답 전문 (요약)
  scanned_at       DATE         DEFAULT CURRENT_DATE,
  job_id           UUID         REFERENCES jobs(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  aeo_metrics              IS 'AI 모델별 브랜드 인용 추적. SOM(Share of Model) 계산 원시 데이터.';
COMMENT ON COLUMN aeo_metrics.is_cited     IS 'TRUE = 해당 AI 모델이 이 키워드 답변에 브랜드를 인용함';
COMMENT ON COLUMN aeo_metrics.cited_rank   IS '인용 순서. 1이면 첫 번째 출처로 사용됨 (최고 가치).';
COMMENT ON COLUMN aeo_metrics.platform     IS '스캔 대상 AI 플랫폼. CHATGPT/PERPLEXITY/GEMINI/NAVER_AI/GOOGLE_AEO/CLAUDE';


-- ================================================================
-- PART 4: som_reports — 주간 SOM 집계 보고
-- ================================================================

CREATE TABLE IF NOT EXISTS som_reports (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        UUID         REFERENCES clients(id)    ON DELETE CASCADE,
  brand_id         UUID         REFERENCES brands(id)     ON DELETE SET NULL,
  report_week      DATE         NOT NULL,    -- ISO 주 시작일 (월요일)
  total_scans      INTEGER      DEFAULT 0,   -- 해당 주 총 스캔 수
  cited_count      INTEGER      DEFAULT 0,   -- 인용된 스캔 수
  citation_rate    NUMERIC(5,2),             -- cited_count / total_scans * 100
  top_platform     TEXT,                     -- 가장 많이 인용된 플랫폼
  top_keyword      TEXT,                     -- 가장 많이 인용된 키워드
  details          JSONB        DEFAULT '{}', -- 플랫폼별·키워드별 상세 breakdown
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (client_id, brand_id, report_week)
);

COMMENT ON TABLE  som_reports           IS '주간 AI 모델 점유율(SOM) 집계. 김이사 주간 보고서 원천 데이터.';
COMMENT ON COLUMN som_reports.citation_rate IS '(cited_count / total_scans) * 100. 100%이면 모든 AI 모델에서 인용됨.';


-- ================================================================
-- PART 5: 인덱스
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_aeo_client_date
  ON aeo_metrics(client_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_aeo_cited
  ON aeo_metrics(client_id, is_cited)
  WHERE is_cited = TRUE;

CREATE INDEX IF NOT EXISTS idx_aeo_brand_platform
  ON aeo_metrics(brand_id, platform, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_som_client_week
  ON som_reports(client_id, report_week DESC);


-- ================================================================
-- PART 6: RLS 정책
-- ================================================================

ALTER TABLE aeo_metrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE som_reports  ENABLE ROW LEVEL SECURITY;

-- 서비스 키 전체 접근
CREATE POLICY "service_all_aeo_metrics"
  ON aeo_metrics FOR ALL
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_all_som_reports"
  ON som_reports FOR ALL
  USING (TRUE) WITH CHECK (TRUE);
