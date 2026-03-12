-- ================================================================
-- 007_style_transfer_serp.sql
-- Style Transfer 기능 + SERP Peak Rank 트래킹 지원
--
-- 변경 사항:
--   1. contents 확장: peak_rank, peak_rank_at, image_count,
--                     heading_structure (Style Transfer 학습용)
--   2. campaign_style_refs 신설: 사용자가 선택한 레퍼런스 글 연결
--   3. serp_results 인덱스 추가: 순위 추이 차트 쿼리 최적화
--
-- 안전: ADD COLUMN IF NOT EXISTS / IF NOT EXISTS 사용
-- ================================================================


-- ================================================================
-- PART 1: contents 테이블 확장 — Style Transfer 학습 필드
-- ================================================================

-- 역대 최고 SERP 순위 (낮을수록 좋음. 1위 달성 = 1)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS peak_rank       INTEGER;

-- 최고 순위 달성일 (ANALYST_SERP 에이전트가 매일 업데이트)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS peak_rank_at    DATE;

-- 본문 내 이미지 수 (COPYWRITER 생성 또는 발행 후 트래킹)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS image_count     INTEGER  DEFAULT 0;

-- 헤딩 구조 분석 결과 (RND 에이전트 Style Analyzer가 기록)
-- 예: {"h2_count": 4, "h3_count": 12, "faq_count": 7,
--       "avg_section_length": 280, "total_length": 2340}
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS heading_structure  JSONB  DEFAULT '{}';

COMMENT ON COLUMN contents.peak_rank IS
  '역대 최고 SERP 순위 (PC/MO 중 낮은 값 기준). ANALYST_SERP가 매일 갱신.
   Style Transfer 위젯에서 ≤ 5인 콘텐츠를 "베스트 글"로 표시.';

COMMENT ON COLUMN contents.heading_structure IS
  'RND Style Analyzer가 분석한 헤딩 구조.
   {"h2_count":4,"h3_count":12,"faq_count":7,"avg_section_length":280}';

COMMENT ON COLUMN contents.image_count IS
  '본문 내 이미지 수. 발행 시 또는 크롤링으로 트래킹.';


-- ================================================================
-- PART 2: campaign_style_refs — 캠페인별 Style Transfer 레퍼런스
--
-- 사용자가 대시보드에서 선택한 베스트 글 체크박스 선택 결과 저장.
-- CMO CAMPAIGN_PLAN Job의 input_payload에 참조.
-- ================================================================

CREATE TABLE IF NOT EXISTS campaign_style_refs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- 이 레퍼런스를 적용할 캠페인 (Job이 생성되면 연결)
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,

  -- 학습 대상 콘텐츠 목록
  content_ids     UUID[]      NOT NULL DEFAULT '{}',

  -- RND가 분석한 통합 스타일 템플릿
  -- {"avg_length": 2100, "avg_images": 7, "avg_h2": 4, "avg_h3": 11,
  --  "avg_faq": 6, "tone_keywords": ["따뜻한", "구체적"], "structure_guide": "..."}
  style_template  JSONB       DEFAULT '{}',

  -- 분석 완료 여부 (RND 에이전트가 처리 후 TRUE 설정)
  is_analyzed     BOOLEAN     DEFAULT FALSE,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE campaign_style_refs IS
  '사용자가 선택한 Style Transfer 레퍼런스 글 목록.
   RND(김연구원)가 구조를 분석하여 style_template 생성 →
   COPYWRITER(박작가)가 Few-shot 프롬프트로 활용.';

COMMENT ON COLUMN campaign_style_refs.style_template IS
  'RND가 참조 글들을 분석해 만든 통합 스타일 지침.
   COPYWRITER 프롬프트에 직접 주입됨.';


-- ================================================================
-- PART 3: 인덱스 추가
-- ================================================================

-- Style Transfer 위젯: peak_rank ≤ 5인 베스트 글 조회
CREATE INDEX IF NOT EXISTS idx_contents_peak_rank
  ON contents(client_id, peak_rank ASC NULLS LAST)
  WHERE peak_rank IS NOT NULL;

-- SERP 추이 차트: 기간별 콘텐츠 순위 조회
CREATE INDEX IF NOT EXISTS idx_serp_content_date
  ON serp_results(content_id, captured_at DESC);

-- SERP 추이 차트: 고객사 전체 키워드 순위 (client_id → contents → serp)
CREATE INDEX IF NOT EXISTS idx_serp_platform_date
  ON serp_results(search_platform, captured_at DESC);

-- campaign_style_refs 조회
CREATE INDEX IF NOT EXISTS idx_style_refs_client
  ON campaign_style_refs(client_id, created_at DESC);


-- ================================================================
-- PART 4: updated_at 트리거
-- ================================================================

CREATE TRIGGER campaign_style_refs_updated_at
  BEFORE UPDATE ON campaign_style_refs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- PART 5: RLS
-- ================================================================

ALTER TABLE campaign_style_refs ENABLE ROW LEVEL SECURITY;

-- 서비스 키 전체 접근 (에이전트)
CREATE POLICY "service_all_style_refs"
  ON campaign_style_refs FOR ALL
  USING (TRUE) WITH CHECK (TRUE);
