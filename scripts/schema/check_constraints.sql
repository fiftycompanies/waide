-- ══════════════════════════════════════════════════════════════════════════════
-- 현재 DB CHECK 제약 조건 스냅샷
-- 생성일: 2026-03-08
-- 조회 쿼리:
--   SELECT conrelid::regclass, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace
-- ══════════════════════════════════════════════════════════════════════════════

-- account_grades
--   grade: 'S','A','B','C'
--   previous_grade: 'S','A','B','C'

-- accounts
--   platform: 'naver','tistory','brunch','google','wordpress','youtube'
--   status: 'active','suspended','banned','cooling'

-- admin_users
--   role: 'super_admin','admin','sales','viewer'

-- aeo_metrics
--   platform: 'PERPLEXITY','CHATGPT','GEMINI','NAVER_AI','GOOGLE_AEO','CLAUDE'

-- aeo_tracking_queue
--   status: 'pending','processing','completed','failed'

-- agent_logs
--   status: 'info','success','warning','error'

-- blog_accounts
--   auth_type: 'manual','oauth','api_key'
--   platform: 'naver','tistory','wordpress','medium','brunch'

-- brand_analyses
--   marketing_score: 0~100
--   status: 'pending','analyzing','completed','failed','converted'
--   url_type: 'naver_place','google_maps','website'

-- brand_relationships
--   relationship_type: 'tenant','partner','affiliate'

-- campaigns
--   content_type: 'list','review','info','single','special'
--   status: 'draft','active','paused','completed','cancelled'
--   target_platform: 'naver','google','tistory','brunch','youtube','all'

-- clients
--   client_type: 'company','sub_client','platform','brand','shop'
--   contract_type: 'monthly','annual','project'
--   onboarding_status: 'pending','in_progress','completed'
--   status: 'active','inactive','churned'

-- consultation_requests
--   status: 'pending','contacted','converted'

-- content_prompts
--   content_type: 'list','review','info'
--   prompt_type: 'system','user','common_rules'

-- content_sources
--   source_type: 'blog','url','text','pdf','video','image','api','review','competitor','own_best','industry_article','manual'
--   usage_mode: 'reference','style','fact','cta'

-- contents
--   content_type: 'blog_list','blog_review','blog_info','aeo_qa','aeo_list','aeo_entity','single','list','review','info'
--   publish_status: 'draft','review','approved','published','rejected','archived'

-- cron_logs
--   status: 'running','success','failed'

-- error_logs
--   error_type: 'client','server','api','cron'
--   status: 'new','acknowledged','resolved','ignored'

-- evolving_knowledge
--   verdict: 'confirmed','rejected','pending'

-- jobs
--   priority: 'critical','high','medium','low'
--   trigger_type: 'USER','SCHEDULER','AGENT'

-- keyword_difficulty
--   competition_level: 'low','medium','high'
--   grade: 'S','A','B','C'

-- keywords
--   competition_level: 'low','medium','high'
--   platform: 'naver','google','both'
--   priority: 'critical','high','medium','low'
--   status: 'active','paused','archived','queued','refresh','suggested'

-- llm_answers
--   ai_model: 'perplexity','claude','chatgpt','gemini'
--   crawl_method: 'api','playwright'

-- matching_feedback_log
--   actual_result: 'top3','top10','top20','exposed','not_exposed'

-- mentions
--   sentiment: 'positive','neutral','negative'

-- metrics
--   metric_type: 'IMPRESSIONS','CLICKS','VIEWS','UNIQUE_VISITORS','AVERAGE_RANK','CITATIONS','SHARES','CTR'
--   source: 'auto','manual'

-- metrics_summary
--   period: 'daily','weekly','monthly'

-- platform_master_guides
--   guide_type: 'SEO','AEO','GEO','E-E-A-T','ALGORITHM'

-- point_transactions
--   type: 'grant','spend','revoke','signup_bonus','refund'

-- publications
--   platform: 'tistory','wordpress','medium','manual'
--   publish_type: 'manual','auto'
--   status: 'pending','publishing','published','failed'

-- publishing_recommendations
--   account_grade: 'S','A','B','C'
--   feedback_result: 'top3','top10','top20','exposed','not_exposed'
--   keyword_grade: 'S','A','B','C'
--   status: 'pending','accepted','rejected','expired'

-- questions
--   source: 'llm','paa','naver','manual'

-- reports
--   report_type: 'weekly','monthly','campaign','ad_hoc'
--   status: 'draft','published','sent'

-- serp_results
--   device: 'PC','MO','WEB'
--   search_platform: 'NAVER_SERP','GOOGLE_SERP','PERPLEXITY','CHATGPT','GEMINI'

-- subscriptions
--   billing_cycle: 'monthly','annual','one_time'
--   plan_name: 'trial','basic','pro','enterprise'
--   status: 'trial','active','past_due','cancelled','paused'

-- users
--   role: 'super_admin','admin','sales','client_owner','client_member'
