-- ============================================================
-- 030_sources_enhancement.sql
-- content_sources 테이블 필드 보강
-- ============================================================

-- 1. content_text: 본문 텍스트 저장
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS content_text TEXT;

-- 2. content_structure: 구조 분석 결과 (글자수, H2수, H3수, 이미지수, 키워드밀도 등)
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS content_structure JSONB DEFAULT '{}';

-- 3. content_id: own_best 타입에서 contents 테이블과 연결
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES contents(id) ON DELETE SET NULL;

-- 4. source_type CHECK 확장 (기존 타입 유지 + 신규 4종 추가)
ALTER TABLE content_sources DROP CONSTRAINT IF EXISTS content_sources_source_type_check;
ALTER TABLE content_sources ADD CONSTRAINT content_sources_source_type_check
  CHECK (source_type IN (
    'blog', 'url', 'text', 'pdf', 'video', 'image', 'api', 'review',
    'competitor', 'own_best', 'industry_article', 'manual'
  ));

-- 5. content_id 인덱스 (own_best 중복 체크용)
CREATE INDEX IF NOT EXISTS idx_content_sources_content_id ON content_sources(content_id);
