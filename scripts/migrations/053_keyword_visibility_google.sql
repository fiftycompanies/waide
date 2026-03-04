-- 053: keyword_visibility에 구글 순위 컬럼 추가
-- Phase E-3-2: Serper API 기반 구글 검색 순위 추적

ALTER TABLE keyword_visibility ADD COLUMN IF NOT EXISTS rank_google INTEGER;
ALTER TABLE keyword_visibility ADD COLUMN IF NOT EXISTS visibility_score_google NUMERIC DEFAULT 0;
