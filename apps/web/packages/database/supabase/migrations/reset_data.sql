-- ============================================================
-- reset_data.sql
-- 비즈니스 데이터 전체 삭제 (스키마 / RLS / CHECK 제약 유지)
-- FK 의존 순서: 자식 → 부모 순으로 삭제
-- 실행: Supabase SQL Editor에서 직접 실행
-- ============================================================

BEGIN;

-- 1. SERP 순위 결과 (serp_results → contents에 의존)
DELETE FROM serp_results;

-- 2. 진화 지식 (evolving_knowledge → clients에 의존)
DELETE FROM evolving_knowledge;

-- 3. KPI 메트릭 집계 (metrics_summary → clients에 의존)
DELETE FROM metrics_summary;

-- 4. 메트릭 상세 (metrics → contents에 의존, 있는 경우)
DELETE FROM metrics WHERE TRUE;

-- 5. AEO 인용 스캔 결과 (aeo_metrics → clients에 의존)
DELETE FROM aeo_metrics;

-- 6. SOM 리포트 (som_reports → clients에 의존)
DELETE FROM som_reports WHERE TRUE;

-- 7. 에이전트 로그 (agent_logs → jobs에 의존)
DELETE FROM agent_logs;

-- 8. 콘텐츠 소스 (content_sources → clients에 의존)
DELETE FROM content_sources WHERE TRUE;

-- 9. 콘텐츠 (contents → keywords, accounts에 의존)
DELETE FROM contents;

-- 10. 캠페인 스타일 레퍼런스 (campaign_style_refs → campaigns에 의존)
DELETE FROM campaign_style_refs WHERE TRUE;

-- 11. 캠페인 (campaigns → clients에 의존)
DELETE FROM campaigns;

-- 12. Jobs (jobs → clients에 의존)
DELETE FROM jobs;

-- 13. 구독 (subscriptions → clients에 의존)
DELETE FROM subscriptions WHERE TRUE;

-- 14. 브랜드 관계 (brand_relationships → brands에 의존)
DELETE FROM brand_relationships WHERE TRUE;

-- 15. 브랜드 (brands → clients에 의존)
DELETE FROM brands WHERE TRUE;

-- 16. 키워드 (keywords → clients에 의존)
DELETE FROM keywords;

-- 17. 블로그 계정 (blog_accounts → clients에 의존)
DELETE FROM blog_accounts;

-- 18. 계정 (accounts → clients에 의존)
DELETE FROM accounts WHERE TRUE;

-- 19. 브랜드 페르소나 (brand_personas → clients에 의존)
DELETE FROM brand_personas;

-- 20. 클라이언트 (최상위 엔티티 — workspace는 유지)
DELETE FROM clients;

-- ============================================================
-- 유지 목록 (삭제하지 않음):
--   workspaces               → 유지
--   workspace_members        → 유지
--   users                    → 유지
--   agent_prompts            → 유지 (에이전트 프롬프트)
--   platform_master_guides   → 유지 (알고리즘 가이드)
--   settings                 → 유지 (시스템 설정)
--   admin_users              → 유지 (어드민 계정)
-- ============================================================

COMMIT;
