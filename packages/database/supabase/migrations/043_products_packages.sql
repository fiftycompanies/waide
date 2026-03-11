-- 043_products_packages.sql
-- 상품(패키지) + 구독 관리

-- 상품(패키지) 관리
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                       -- "패키지 A", "프리미엄 플랜"
  slug TEXT UNIQUE NOT NULL,                -- URL용: "package-a"
  description TEXT,                          -- 상품 설명
  price INTEGER NOT NULL DEFAULT 0,         -- 월 가격 (원)
  features JSONB NOT NULL DEFAULT '[]',     -- 포함 기능 목록
  is_public BOOLEAN DEFAULT true,           -- 고객에게 노출 여부
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,             -- 정렬 순서
  highlight_label TEXT,                      -- "인기", "추천" 등 뱃지
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 구독 관리 (결제 기능 제외 — 수동 입력)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  product_id UUID REFERENCES products(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial','active','past_due','cancelled','expired')),
  mrr INTEGER NOT NULL DEFAULT 0,           -- 월 반복 매출 (원)
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
