-- 047_content_benchmarks.sql
-- 콘텐츠 벤치마크 캐시 테이블 (RND 벤치마킹 결과 7일 캐시)

CREATE TABLE IF NOT EXISTS content_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  benchmark_data JSONB NOT NULL,
  -- RND 벤치마킹 결과 전체 (pattern_analysis + gaps + copywriter_brief)
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  UNIQUE(keyword)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_keyword ON content_benchmarks(keyword);
CREATE INDEX IF NOT EXISTS idx_benchmarks_expires ON content_benchmarks(expires_at);
