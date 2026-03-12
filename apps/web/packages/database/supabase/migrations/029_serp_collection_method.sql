-- 029: SERP 수집 방식 구분 컬럼 추가
-- 'api' = 네이버 검색 API, 'html_parse' = HTML 직접 파싱 (레거시)

ALTER TABLE serp_results
ADD COLUMN IF NOT EXISTS collection_method TEXT DEFAULT 'html_parse';

-- 기존 데이터는 모두 html_parse로 표시
UPDATE serp_results SET collection_method = 'html_parse' WHERE collection_method IS NULL;

COMMENT ON COLUMN serp_results.collection_method IS '수집 방식: api(네이버 검색 API) / html_parse(HTML 파싱, 레거시)';
