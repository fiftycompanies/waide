-- ============================================================
-- 064_dashboard_additions.sql
-- 대시보드 리디자인: 플레이스 순위 이력, 점유율, 대표 키워드
-- ============================================================

-- ── 1. keywords 테이블 — is_primary 컬럼 추가 ──────────────────────────────
-- 클라이언트당 1개 키워드만 is_primary = true
-- 네이버 플레이스 순위 카드에 표시할 대표 키워드
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- 동일 client_id 내 is_primary = true는 1개만 허용하는 partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS keywords_client_primary_uniq
  ON keywords (client_id)
  WHERE is_primary = true;

COMMENT ON COLUMN keywords.is_primary IS '플레이스 순위 카드에 표시할 대표 키워드 여부. client_id당 1개만 true 허용.';

-- ── 2. keyword_visibility 테이블 — 점유율 컬럼 추가 ────────────────────────
-- naver_mention_count: 네이버 블로그 상위 20개 결과 중 우리 콘텐츠 노출 개수
-- google_mention_count: 구글 상위 20개 결과 중 우리 콘텐츠 노출 개수
ALTER TABLE keyword_visibility
  ADD COLUMN IF NOT EXISTS naver_mention_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_mention_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN keyword_visibility.naver_mention_count IS '네이버 블로그 검색 상위 20결과 중 당사 콘텐츠 노출 수';
COMMENT ON COLUMN keyword_visibility.google_mention_count IS '구글 검색 상위 20결과 중 당사 콘텐츠 노출 수';

-- ── 3. keyword_visibility 테이블 — 플레이스 순위 컬럼 추가 ─────────────────
-- place_rank_pc, place_rank_mo: 네이버 플레이스 검색 순위
-- 기존 rank_pc, rank_mo는 블로그/웹 검색 순위 (건드리지 않음)
ALTER TABLE keyword_visibility
  ADD COLUMN IF NOT EXISTS place_rank_pc INTEGER,
  ADD COLUMN IF NOT EXISTS place_rank_mo INTEGER;

COMMENT ON COLUMN keyword_visibility.place_rank_pc IS '네이버 플레이스 PC 검색 순위';
COMMENT ON COLUMN keyword_visibility.place_rank_mo IS '네이버 플레이스 모바일 검색 순위';

-- ── 4. place_stats_history 테이블 — 신규 생성 ──────────────────────────────
-- 플레이스 리뷰수/저장수 일별 이력 저장 (30일치만 유지)
CREATE TABLE IF NOT EXISTS place_stats_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measured_at          DATE NOT NULL,
  visitor_review_count INTEGER,
  blog_review_count    INTEGER,
  bookmark_count       INTEGER,          -- 저장수 (크롤링 실패 시 NULL 허용)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, measured_at)
);

CREATE INDEX IF NOT EXISTS place_stats_history_client_date_idx
  ON place_stats_history (client_id, measured_at DESC);

COMMENT ON TABLE place_stats_history IS '네이버 플레이스 방문자리뷰/블로그리뷰/저장수 일별 이력. 30일치만 유지.';

-- ── RLS 비활성화 (서비스 롤키로만 접근) ─────────────────────────────────────
ALTER TABLE place_stats_history DISABLE ROW LEVEL SECURITY;
