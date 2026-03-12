-- ============================================================
-- 031_brand_source_defaults.sql
-- brand_personas에 기본 소스 설정 + 작성 스타일 가이드 컬럼 추가
-- ============================================================

-- 1. 해당 브랜드 캠페인 생성 시 자동 선택될 소스 ID 목록
ALTER TABLE brand_personas ADD COLUMN IF NOT EXISTS default_source_ids UUID[] DEFAULT '{}';

-- 2. 브랜드별 작성 스타일 가이드 (톤, CTA 문구, 마무리 멘트 등)
ALTER TABLE brand_personas ADD COLUMN IF NOT EXISTS content_style_guide JSONB DEFAULT '{}';
