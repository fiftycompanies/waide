-- 026_client_naver_api_keys.sql
-- 고객사별 네이버 광고 API 키 + 검색량 데이터 소스 추적

-- clients 테이블에 네이버 광고 API 키 컬럼 추가
ALTER TABLE clients ADD COLUMN IF NOT EXISTS naver_ad_api_key TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS naver_ad_secret_key TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS naver_ad_customer_id TEXT;

-- keywords 테이블에 검색량 데이터 소스 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS search_volume_source TEXT;
COMMENT ON COLUMN keywords.search_volume_source IS '검색량 데이터 출처: naver_ad | datalab | null';

-- 캠핏 초기 데이터 설정 (현재 .env.local 값)
UPDATE clients SET
  naver_ad_api_key = '0100000000e5a0818635db79b330db0d4ff1fd201a2763f7bb4aa86be85f194fd2ef23bcd1',
  naver_ad_secret_key = 'AQAAAADloIGGNdt5szDbDU/x/SAaJic0t5+NhC8F0DTtvM7Vbg==',
  naver_ad_customer_id = '2616971'
WHERE id = 'd9af5297-de7c-4353-96ea-78ba0bb59f0c';
