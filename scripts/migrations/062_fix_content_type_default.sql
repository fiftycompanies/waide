-- 062: contents.content_type DEFAULT 수정
-- 문제: 기존 DEFAULT='blog_post'인데 CHECK 제약에 'blog_post' 미포함 → INSERT 시 에러
-- 해결: DEFAULT를 NULL로 변경 + 기존 'blog_post' 데이터를 'blog_info'로 마이그레이션

-- 1. 기존 'blog_post' 데이터 마이그레이션
UPDATE contents SET content_type = 'blog_info' WHERE content_type = 'blog_post';

-- 2. DEFAULT 변경 (NULL 허용이므로 NULL로)
ALTER TABLE contents ALTER COLUMN content_type DROP DEFAULT;
