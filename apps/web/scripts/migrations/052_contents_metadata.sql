-- 052_contents_metadata.sql
-- contents 테이블에 metadata JSONB 컬럼 추가
-- QC v2 결과, 재작성 이력, 벤치마크 사용 여부 등 저장

-- metadata 컬럼 추가
ALTER TABLE contents ADD COLUMN IF NOT EXISTS metadata JSONB;

-- metadata 기본 인덱스 (GIN)
CREATE INDEX IF NOT EXISTS idx_contents_metadata ON contents USING gin(metadata);

-- 기존 publish_status CHECK 제약에 'needs_revision', 'needs_manual_review' 추가 불필요
-- → 기존 'review' 상태를 수동 검토용으로 활용 (CLAUDE.md 절대규칙 준수)
-- → metadata.needs_manual_review 플래그로 구분

COMMENT ON COLUMN contents.metadata IS 'JSONB: qc_version, qc_score, qc_pass, qc_result, rewrite_count, rewrite_history, needs_manual_review, version 등';
