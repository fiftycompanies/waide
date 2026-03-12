-- ================================================================
-- 019_fix_contents_account_fk.sql
--
-- 변경 사항:
--   contents.account_id FK를 accounts → blog_accounts로 재연결
--
-- 실행 순서:
--   1. Supabase SQL Editor에서 이 파일 실행
--   2. agents/scripts/migrate_csv.py --execute 재실행
-- ================================================================

-- 기존 FK 제약 제거
ALTER TABLE contents
  DROP CONSTRAINT IF EXISTS contents_account_id_fkey;

-- blog_accounts를 참조하는 새 FK 추가
ALTER TABLE contents
  ADD CONSTRAINT contents_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES blog_accounts(id)
  ON DELETE SET NULL;
