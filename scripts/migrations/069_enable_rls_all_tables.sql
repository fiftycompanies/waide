-- ══════════════════════════════════════════════════════════════════════════════
-- 069: 전체 테이블 RLS 활성화
-- 생성일: 2026-03-18
-- 목적: Supabase Security Advisor 36개 경고 해소
--
-- 원리:
--   1. 모든 public 테이블에 RLS 활성화
--   2. service_role 키는 RLS를 자동 우회 (Supabase 설계)
--      → 기존 서버 액션/API 라우트 코드 영향 없음
--   3. anon 키로는 정책 없는 테이블에 접근 불가
--      → 브라우저에서 직접 DB 쿼리 차단
--   4. 인증된 사용자(포털)에게 필요한 최소한의 정책만 추가
--
-- 실행 전 확인: Supabase Dashboard → SQL Editor 에서 실행
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1단계: 모든 테이블 RLS 활성화 (멱등)
-- ─────────────────────────────────────────────────────────────────────────────

-- 기존 핵심 테이블
ALTER TABLE IF EXISTS account_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS aeo_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS aeo_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS aeo_tracking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS aeo_tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auto_publish_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blog_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaign_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_visibility_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evolving_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS keyword_difficulty ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS keyword_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS llm_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS matching_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metrics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_master_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS publishing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS publishing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS report_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS serp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- place_stats_history (024_keyword_visibility.sql 에서 DISABLE 했던 테이블)
ALTER TABLE IF EXISTS place_stats_history ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2단계: anon 사용자 정책 — 공개 페이지에서 필요한 최소한의 접근만 허용
-- ─────────────────────────────────────────────────────────────────────────────

-- brand_analyses: 공개 분석 결과 페이지 (/analysis/[id]) 에서 SELECT 필요
DROP POLICY IF EXISTS "anon_read_brand_analyses" ON brand_analyses;
CREATE POLICY "anon_read_brand_analyses" ON brand_analyses
  FOR SELECT
  TO anon
  USING (true);

-- consultation_requests: 공개 상담 신청 폼에서 INSERT 필요
DROP POLICY IF EXISTS "anon_insert_consultation" ON consultation_requests;
CREATE POLICY "anon_insert_consultation" ON consultation_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- sales_agents: 공개 분석에서 영업사원 ref_code 조회
DROP POLICY IF EXISTS "anon_read_sales_agents" ON sales_agents;
CREATE POLICY "anon_read_sales_agents" ON sales_agents
  FOR SELECT
  TO anon
  USING (is_active = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3단계: authenticated 사용자 정책 — 포털 사용자가 자기 데이터만 접근
-- ─────────────────────────────────────────────────────────────────────────────

-- users: 자기 프로필만 조회/수정
DROP POLICY IF EXISTS "auth_users_own_profile" ON users;
CREATE POLICY "auth_users_own_profile" ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- clients: 자기 client_id에 연결된 클라이언트만 조회
DROP POLICY IF EXISTS "auth_clients_own" ON clients;
CREATE POLICY "auth_clients_own" ON clients
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- keywords: 자기 client_id 키워드만 조회
DROP POLICY IF EXISTS "auth_keywords_own" ON keywords;
CREATE POLICY "auth_keywords_own" ON keywords
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- keywords: 포털에서 승인/거절 시 UPDATE 필요
DROP POLICY IF EXISTS "auth_keywords_update_own" ON keywords;
CREATE POLICY "auth_keywords_update_own" ON keywords
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- contents: 자기 client_id 콘텐츠만 조회
DROP POLICY IF EXISTS "auth_contents_own" ON contents;
CREATE POLICY "auth_contents_own" ON contents
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- brand_analyses: 인증 사용자도 분석 결과 조회 가능
DROP POLICY IF EXISTS "auth_read_brand_analyses" ON brand_analyses;
CREATE POLICY "auth_read_brand_analyses" ON brand_analyses
  FOR SELECT
  TO authenticated
  USING (true);

-- subscriptions: 자기 client_id 구독만 조회
DROP POLICY IF EXISTS "auth_subscriptions_own" ON subscriptions;
CREATE POLICY "auth_subscriptions_own" ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- notifications: 자기 client_id 알림만 조회/수정
DROP POLICY IF EXISTS "auth_notifications_own" ON notifications;
CREATE POLICY "auth_notifications_own" ON notifications
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- notification_settings: 자기 client_id 설정만 조회/수정
DROP POLICY IF EXISTS "auth_notification_settings_own" ON notification_settings;
CREATE POLICY "auth_notification_settings_own" ON notification_settings
  FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- questions: 자기 client_id 질문만 조회
DROP POLICY IF EXISTS "auth_questions_own" ON questions;
CREATE POLICY "auth_questions_own" ON questions
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid() AND client_id IS NOT NULL
    )
  );

-- products: 상품 정보 조회 (구독 페이지에서)
DROP POLICY IF EXISTS "auth_products_read" ON products;
CREATE POLICY "auth_products_read" ON products
  FOR SELECT
  TO authenticated
  USING (true);


COMMIT;

-- ══════════════════════════════════════════════════════════════════════════════
-- 검증 쿼리 (실행 후 확인용):
--
-- RLS 활성화 확인:
--   SELECT relname, relrowsecurity
--   FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace
--     AND relkind = 'r'
--   ORDER BY relname;
--
-- 정책 목록:
--   SELECT tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
-- ══════════════════════════════════════════════════════════════════════════════
