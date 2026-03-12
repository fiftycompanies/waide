-- ================================================================
-- 009_clients_enrich_and_persona_unique.sql
--
-- 변경 사항:
--   1. clients 테이블에 is_active/industry/website_url/blog_url 추가
--   2. 기존 clients.status → is_active 동기화
--   3. brand_personas 중복 비활성화 (같은 client_id를 가진 오래된 페르소나)
--   4. brand_personas(client_id) 부분 UNIQUE 인덱스 (is_active=true 기준 1:1)
--
-- 실행: psql $DATABASE_URL -f 009_clients_enrich_and_persona_unique.sql
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- PART 1: clients 컬럼 추가
-- ────────────────────────────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS industry     TEXT,
  ADD COLUMN IF NOT EXISTS website_url  TEXT,
  ADD COLUMN IF NOT EXISTS blog_url     TEXT;

-- 기존 status 기반 is_active 초기화 (status='active' → true, 나머지 → false)
UPDATE clients
SET is_active = (status = 'active')
WHERE is_active IS NULL;

COMMENT ON COLUMN clients.is_active   IS '브랜드 셀렉터·에이전트 파이프라인 활성화 여부. FALSE면 Jobs 트리거 금지.';
COMMENT ON COLUMN clients.industry    IS '업종 분류 (예: 숙박, 반려동물, 뷰티)';
COMMENT ON COLUMN clients.website_url IS '공식 홈페이지 URL';
COMMENT ON COLUMN clients.blog_url    IS '블로그/콘텐츠 채널 URL';


-- ────────────────────────────────────────────────────────────────
-- PART 2: brand_personas 중복 비활성화
-- 동일 client_id에 여러 페르소나가 있을 경우, 가장 최근 것만 남기고
-- 나머지를 is_active=false 처리 (데이터 유실 없이 안전하게 처리)
-- ────────────────────────────────────────────────────────────────

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id
      ORDER BY created_at DESC  -- 가장 최근 것이 1등
    ) AS rn
  FROM brand_personas
  WHERE client_id IS NOT NULL AND is_active = true
)
UPDATE brand_personas
SET is_active = false, updated_at = NOW()
FROM ranked
WHERE brand_personas.id = ranked.id
  AND ranked.rn > 1;  -- 2등 이하는 비활성화


-- ────────────────────────────────────────────────────────────────
-- PART 3: brand_personas(client_id) 부분 UNIQUE 인덱스
-- is_active=true인 페르소나는 client당 1개만 허용 (1:1 관계 보장)
-- ────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_personas_client_active_1to1
  ON brand_personas(client_id)
  WHERE is_active = true;

COMMENT ON INDEX idx_brand_personas_client_active_1to1
  IS '활성 페르소나는 클라이언트당 1개. 새 페르소나 등록 전 기존 것을 is_active=false 처리 필요.';
