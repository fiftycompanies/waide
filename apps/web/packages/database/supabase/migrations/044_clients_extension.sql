-- 044_clients_extension.sql
-- clients 테이블 확장 (구독, 온보딩, 건강점수, GSC 연동 등)

ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending'
  CHECK (onboarding_status IN ('pending','in_progress','completed'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_portal_login TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_sales_agent_id UUID REFERENCES sales_agents(id);

-- 홈페이지 SEO/AEO 분석 확장용 (향후)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gsc_property_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gsc_verified BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gsc_connected_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_seo_data JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_aeo_data JSONB;
