-- 045_scoring_criteria.sql
-- 마케팅 점수 / QC 검수 채점 기준 테이블 (룰 기반 — AI가 아닌 코드로 판단)

CREATE TABLE IF NOT EXISTS scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  -- 'review' | 'keyword' | 'google' | 'image' | 'channel' | 'seo'
  -- 'qc_char_count' | 'qc_keyword' | 'qc_structure' | 'qc_aeo' 등
  item TEXT NOT NULL,
  -- 예: 'review_reply_rate', 'keyword_top10_count', 'content_char_count'
  description TEXT,
  -- "리뷰 답글률"
  max_score INTEGER NOT NULL,
  -- 이 항목의 만점
  rules JSONB NOT NULL,
  -- 채점 룰 (코드에서 if/else로 적용)
  -- 예시:
  -- [
  --   {"condition": ">=70", "score_pct": 100, "label": "우수"},
  --   {"condition": ">=40", "score_pct": 60, "label": "보통"},
  --   {"condition": "<40", "score_pct": 20, "label": "부족"}
  -- ]
  category_group TEXT NOT NULL DEFAULT 'marketing',
  -- 'marketing' (마케팅 점수) | 'qc' (콘텐츠 QC)
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_group, category, item)
);

CREATE INDEX IF NOT EXISTS idx_scoring_criteria_group ON scoring_criteria(category_group, is_active);
