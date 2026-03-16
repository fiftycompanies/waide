-- 067: contents.keyword_id NULL 허용
-- 블로그 발행 플로우에서 키워드 풀 외 자유 입력 시 keyword_id 없이 저장 가능하도록

ALTER TABLE contents ALTER COLUMN keyword_id DROP NOT NULL;
