-- ================================================================
-- 012_contents_enrich.sql
--
-- contents 테이블에 실제 발행 성과 추적 컬럼 추가
-- (기존 컬럼 유지, 신규 컬럼 추가만 — 데이터 유실 없음)
--
-- 기존 컬럼과 신규 컬럼 매핑:
--   url          → 레거시 SERP 추적용 URL (유지)
--   published_url → 실제 발행된 블로그 포스팅 URL (신규)
--   published_date DATE → 레거시 (유지)
--   published_at TIMESTAMPTZ → 정확한 발행 타임스탬프 (신규)
--   word_count    → 에이전트 생성 목표 글자수 (유지)
--   actual_word_count → 실제 발행된 본문 글자수 (신규)
--   peak_rank     → 레거시 (유지)
--   peak_rank_naver/google → 플랫폼별 분리 (신규)
--
-- 실행: psql $DATABASE_URL -f 012_contents_enrich.sql
-- ================================================================


-- ── 발행 정보 ─────────────────────────────────────────────────────

-- 실제 발행된 블로그 포스팅 URL (url 컬럼은 SERP 추적용 레거시)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS published_url     TEXT;

-- 정확한 발행 타임스탬프 (published_date는 DATE만 저장)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ;

-- 블로그에 실제 올라간 제목 (LLM이 생성한 title과 다를 수 있음)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS actual_title      TEXT;


-- ── 실측 품질 지표 ────────────────────────────────────────────────

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS actual_word_count  INTEGER;   -- 발행본 실제 글자수

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS actual_image_count INTEGER;   -- 발행본 실제 이미지 수

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS actual_h2_count    INTEGER;   -- 발행본 H2 소제목 수

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS actual_h3_count    INTEGER;   -- 발행본 H3 소제목 수


-- ── SERP 성과 ────────────────────────────────────────────────────

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS peak_rank_naver   INTEGER;   -- 네이버 최고 순위
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS peak_rank_google  INTEGER;   -- 구글 최고 순위

-- SERP 추적 활성화 여부 (URL이 등록된 후 true로 설정)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS is_tracking       BOOLEAN    DEFAULT false;


-- ── SEO 체크리스트 ───────────────────────────────────────────────

-- SEO 검수 항목별 Pass/Fail JSON
-- 예: {"keyword_density": true, "h2_count": true, "image_alt": false, ...}
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS seo_checklist     JSONB;


-- ── 인덱스 ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_contents_published_url
  ON contents(published_url) WHERE published_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contents_tracking
  ON contents(is_tracking) WHERE is_tracking = true;

CREATE INDEX IF NOT EXISTS idx_contents_peak_rank_naver
  ON contents(peak_rank_naver) WHERE peak_rank_naver IS NOT NULL;


-- ── 코멘트 ───────────────────────────────────────────────────────

COMMENT ON COLUMN contents.published_url    IS '실제 발행된 블로그 포스팅 URL. SERP 추적 활성화 트리거.';
COMMENT ON COLUMN contents.published_at     IS '정확한 발행 타임스탬프 (published_date는 레거시 DATE 타입).';
COMMENT ON COLUMN contents.actual_title     IS '실제 발행된 제목 (LLM 생성 title과 다를 수 있음).';
COMMENT ON COLUMN contents.actual_word_count  IS '발행본 실제 글자수 (word_count는 목표치).';
COMMENT ON COLUMN contents.actual_image_count IS '발행본 실제 이미지 수.';
COMMENT ON COLUMN contents.actual_h2_count    IS '발행본 H2 소제목 개수.';
COMMENT ON COLUMN contents.actual_h3_count    IS '발행본 H3 소제목 개수.';
COMMENT ON COLUMN contents.peak_rank_naver    IS '네이버 최고 순위 기록 (낮을수록 좋음). peak_rank는 레거시.';
COMMENT ON COLUMN contents.peak_rank_google   IS '구글 최고 순위 기록.';
COMMENT ON COLUMN contents.is_tracking        IS 'SERP 추적 활성화. published_url 등록 시 true로 전환.';
COMMENT ON COLUMN contents.seo_checklist      IS 'SEO 검수 항목별 통과 여부 JSON (OPS_QUALITY 에이전트가 채움).';
