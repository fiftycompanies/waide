import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

// 임시 마이그레이션 엔드포인트 — 실행 후 삭제 예정
export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (secret !== "run-homepage-migration-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const client = new Client({
    connectionString: directUrl.trim(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // Check if tables already exist
    const check = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'homepage_%' ORDER BY table_name"
    );

    if (check.rows.length >= 5) {
      await client.end();
      return NextResponse.json({
        success: true,
        message: "Tables already exist",
        tables: check.rows.map((r: { table_name: string }) => r.table_name),
      });
    }

    // Run migration SQL
    const migrationSQL = `
-- 1. homepage_projects
CREATE TABLE IF NOT EXISTS homepage_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'modern-minimal',
  status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting','building','build_failed','preview','live','suspended')),
  subdomain TEXT,
  custom_domain TEXT,
  vercel_project_id TEXT,
  vercel_deployment_url TEXT,
  theme_config JSONB NOT NULL DEFAULT '{}',
  seo_config JSONB NOT NULL DEFAULT '{}',
  blog_config JSONB NOT NULL DEFAULT '{}',
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_inquiries INTEGER NOT NULL DEFAULT 0,
  last_deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hp_projects_client ON homepage_projects (client_id);
CREATE INDEX IF NOT EXISTS idx_hp_projects_status ON homepage_projects (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hp_projects_subdomain ON homepage_projects (subdomain) WHERE subdomain IS NOT NULL;

-- 2. homepage_materials
CREATE TABLE IF NOT EXISTS homepage_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  address_lat FLOAT,
  address_lng FLOAT,
  description TEXT NOT NULL,
  kakao_link TEXT,
  service_regions TEXT[] NOT NULL DEFAULT '{}',
  service_types TEXT[] NOT NULL DEFAULT '{}',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#10b981',
  instagram_url TEXT,
  youtube_url TEXT,
  naver_place_url TEXT,
  naver_blog_url TEXT,
  certifications TEXT[],
  operating_hours TEXT,
  business_number TEXT,
  faq_items JSONB NOT NULL DEFAULT '[]',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hp_materials_project ON homepage_materials (project_id);

-- 3. homepage_portfolios
CREATE TABLE IF NOT EXISTS homepage_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  title TEXT,
  slug TEXT,
  space_type TEXT,
  style TEXT,
  area_pyeong INTEGER,
  budget_range TEXT,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  before_image_url TEXT,
  after_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hp_portfolios_project ON homepage_portfolios (project_id);

-- 4. homepage_reviews
CREATE TABLE IF NOT EXISTS homepage_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  project_type TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','naver_place','import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hp_reviews_project ON homepage_reviews (project_id);

-- 5. homepage_inquiries
CREATE TABLE IF NOT EXISTS homepage_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area_pyeong INTEGER,
  space_type TEXT,
  budget_range TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','consulting','contracted','lost')),
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hp_inquiries_project ON homepage_inquiries (project_id);
CREATE INDEX IF NOT EXISTS idx_hp_inquiries_status ON homepage_inquiries (status);

-- 6. RLS 비활성화 (서비스 롤키로만 접근)
ALTER TABLE homepage_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_inquiries DISABLE ROW LEVEL SECURITY;

-- 7. updated_at 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_homepage_projects') THEN
    CREATE TRIGGER set_updated_at_homepage_projects BEFORE UPDATE ON homepage_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_homepage_materials') THEN
    CREATE TRIGGER set_updated_at_homepage_materials BEFORE UPDATE ON homepage_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_homepage_inquiries') THEN
    CREATE TRIGGER set_updated_at_homepage_inquiries BEFORE UPDATE ON homepage_inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
    `;

    await client.query(migrationSQL);

    // Verify
    const verify = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'homepage_%' ORDER BY table_name"
    );

    await client.end();

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      tables: verify.rows.map((r: { table_name: string }) => r.table_name),
    });
  } catch (err) {
    try { await client.end(); } catch {}
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
