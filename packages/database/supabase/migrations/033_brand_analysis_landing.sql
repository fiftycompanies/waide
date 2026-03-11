-- 033_brand_analysis_landing.sql
-- Waide 브랜드 분석 랜딩 서비스 Phase A

-- ═══════════════════════════════════════════
-- 1. brand_analyses — 브랜드 분석 결과
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS brand_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE,
  input_url TEXT NOT NULL,
  url_type TEXT DEFAULT 'naver_place'
    CHECK (url_type IN ('naver_place', 'google_maps', 'website')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),

  -- 분석 결과 JSONB
  basic_info JSONB,
  menu_analysis JSONB,
  review_analysis JSONB,
  keyword_analysis JSONB,
  content_strategy JSONB,
  marketing_score INTEGER CHECK (marketing_score >= 0 AND marketing_score <= 100),

  -- 고객 보완 & 영업
  customer_edits JSONB,
  sales_ref TEXT,
  visitor_token TEXT,

  -- 연결 키 (나중 통합용)
  user_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- 카운터 & 타임스탬프
  view_count INTEGER DEFAULT 0,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_analyses_place_id ON brand_analyses(place_id);
CREATE INDEX IF NOT EXISTS idx_brand_analyses_status ON brand_analyses(status);
CREATE INDEX IF NOT EXISTS idx_brand_analyses_sales_ref ON brand_analyses(sales_ref);
CREATE INDEX IF NOT EXISTS idx_brand_analyses_client_id ON brand_analyses(client_id);

-- ═══════════════════════════════════════════
-- 2. sales_agents — 영업사원
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sales_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ref_code TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  slack_user_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 3. consultation_requests — 상담 신청
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES brand_analyses(id) ON DELETE CASCADE,
  sales_ref TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'converted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_requests_analysis ON consultation_requests(analysis_id);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON consultation_requests(status);

-- ═══════════════════════════════════════════
-- RLS (퍼블릭 서비스이므로 service_key 사용)
-- ═══════════════════════════════════════════
ALTER TABLE brand_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;

-- service_role은 항상 full access
CREATE POLICY "service_role_brand_analyses" ON brand_analyses
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_sales_agents" ON sales_agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_consultation_requests" ON consultation_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
