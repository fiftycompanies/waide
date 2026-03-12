-- ================================================================
-- 010_keywords_enrich.sql
--
-- 변경 사항:
--   keywords 테이블에 플랫폼/경쟁도/순위 등 운영 필드 추가
--   (기존 N_SERP 원본 컬럼은 유지, 신규 컬럼 추가만)
--
-- 실행: psql $DATABASE_URL -f 010_keywords_enrich.sql
-- ================================================================

-- 플랫폼 대상 (both=네이버+구글, naver, google)
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS platform           TEXT    DEFAULT 'both'
                                              CHECK (platform IN ('naver', 'google', 'both'));

-- 경쟁도 레벨 (기존 competition 컬럼은 한글 텍스트, 이 컬럼은 low/medium/high 표준값)
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS competition_level  TEXT    DEFAULT 'medium'
                                              CHECK (competition_level IN ('low', 'medium', 'high'));

-- 종합 우선순위 점수 (0~100, CMO/RND가 채움)
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS priority_score     NUMERIC(5,2) DEFAULT 0;

-- 키워드 운영 상태
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS status             TEXT    DEFAULT 'active'
                                              CHECK (status IN ('active', 'paused', 'archived'));

-- 최신 순위 스냅샷 (SERP 에이전트가 주기적으로 업데이트)
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS current_rank_naver  INTEGER;

ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS current_rank_google INTEGER;

-- 코멘트
COMMENT ON COLUMN keywords.platform          IS 'naver | google | both';
COMMENT ON COLUMN keywords.competition_level IS 'low/medium/high — 검색 경쟁도 표준 분류';
COMMENT ON COLUMN keywords.priority_score    IS '0~100 종합 우선순위. 높을수록 콘텐츠 생성 우선.';
COMMENT ON COLUMN keywords.status            IS 'active=추적 중 / paused=일시 중단 / archived=보관';
COMMENT ON COLUMN keywords.current_rank_naver  IS '가장 최근 네이버 순위. SERP_CHECK 잡이 업데이트.';
COMMENT ON COLUMN keywords.current_rank_google IS '가장 최근 구글 순위. SERP_CHECK 잡이 업데이트.';
