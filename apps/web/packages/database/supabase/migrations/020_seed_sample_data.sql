-- ============================================================
-- 020_seed_sample_data.sql  [재작성 2026-02-23]
-- 실제 DB 스키마 조회 후 100% 맞춰 재작성
-- PL/pgSQL 변수 전체 v_ 접두어 — 컬럼명 충돌 방지
-- ============================================================

DO $$
DECLARE
  v_client_id    UUID := '240afd43-aa83-4105-9536-d3c61ae87645';
  v_workspace_id UUID := '2d716b35-407e-45bf-8941-60bce627d249';

  v_sub1_id UUID := 'aaaabbbb-0001-0001-0001-000000000001';
  v_sub2_id UUID := 'aaaabbbb-0001-0001-0001-000000000002';
  v_sub3_id UUID := 'aaaabbbb-0001-0001-0001-000000000003';

  v_blog1_id UUID := 'bbbbcccc-0001-0001-0001-000000000001';
  v_blog2_id UUID := 'bbbbcccc-0001-0001-0001-000000000002';
  v_blog3_id UUID := 'bbbbcccc-0001-0001-0001-000000000003';

  v_kw1_id UUID := 'ccccdddd-0001-0001-0001-000000000001';
  v_kw2_id UUID := 'ccccdddd-0001-0001-0001-000000000002';
  v_kw3_id UUID := 'ccccdddd-0001-0001-0001-000000000003';
  v_kw4_id UUID := 'ccccdddd-0001-0001-0001-000000000004';
  v_kw5_id UUID := 'ccccdddd-0001-0001-0001-000000000005';
  v_kw6_id UUID := 'ccccdddd-0001-0001-0001-000000000006';
  v_kw7_id UUID := 'ccccdddd-0001-0001-0001-000000000007';

  v_src1_id UUID := 'ddddeeee-0001-0001-0001-000000000001';
  v_src2_id UUID := 'ddddeeee-0001-0001-0001-000000000002';
  v_src3_id UUID := 'ddddeeee-0001-0001-0001-000000000003';
  v_src4_id UUID := 'ddddeeee-0001-0001-0001-000000000004';

  v_cont1_id UUID := 'eeeeffff-0001-0001-0001-000000000001';
  v_cont2_id UUID := 'eeeeffff-0001-0001-0001-000000000002';
  v_cont3_id UUID := 'eeeeffff-0001-0001-0001-000000000003';
  v_cont4_id UUID := 'eeeeffff-0001-0001-0001-000000000004';
  v_cont5_id UUID := 'eeeeffff-0001-0001-0001-000000000005';
BEGIN

-- ──────────────────────────────────────────────────────────
-- 1. 하위 업체 (가평/양평/포천 수동 INSERT 완료 → ON CONFLICT 스킵)
-- ──────────────────────────────────────────────────────────
INSERT INTO clients (id, workspace_id, name, company_name, parent_id, client_type, status, created_at)
VALUES
  (v_sub1_id, v_workspace_id, '포코러쉬 가평점', '포코러쉬 가평점', v_client_id, 'shop', 'active', NOW()),
  (v_sub2_id, v_workspace_id, '포코러쉬 양평점', '포코러쉬 양평점', v_client_id, 'shop', 'active', NOW()),
  (v_sub3_id, v_workspace_id, '포코러쉬 포천점', '포코러쉬 포천점', v_client_id, 'shop', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE clients SET client_type = 'platform' WHERE id = v_client_id;

-- ──────────────────────────────────────────────────────────
-- 2. 블로그 계정 (account_name, blog_url — 실제 컬럼명)
-- ──────────────────────────────────────────────────────────
INSERT INTO blog_accounts (id, client_id, account_name, platform, blog_url, blog_score, fixed_ip, is_active, created_at)
VALUES
  (v_blog1_id, v_client_id, '포코러쉬공식블로그',   'NAVER_BLOG', 'https://blog.naver.com/pocolush_official', 87, '1.2.3.4', TRUE, NOW()),
  (v_blog2_id, v_client_id, '포코러쉬뷰티스타그램', 'NAVER_BLOG', 'https://blog.naver.com/pocolush_beauty',   74, '1.2.3.5', TRUE, NOW()),
  (v_blog3_id, v_client_id, '포코러쉬스킨케어',     'NAVER_BLOG', 'https://blog.naver.com/pocolush_skin',     61, '1.2.3.6', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 3. accounts (contents.account_id FK → accounts.id)
--    platform: 소문자 CHECK (naver/tistory/brunch 등)
-- ──────────────────────────────────────────────────────────
INSERT INTO accounts (id, client_id, name, platform, url, blog_score, status, created_at)
VALUES
  (v_blog1_id, v_client_id, '포코러쉬공식블로그',   'naver', 'https://blog.naver.com/pocolush_official', 87, 'active', NOW()),
  (v_blog2_id, v_client_id, '포코러쉬뷰티스타그램', 'naver', 'https://blog.naver.com/pocolush_beauty',   74, 'active', NOW()),
  (v_blog3_id, v_client_id, '포코러쉬스킨케어',     'naver', 'https://blog.naver.com/pocolush_skin',     61, 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 4. 키워드 (priority: TEXT critical/high/medium/low)
-- ──────────────────────────────────────────────────────────
INSERT INTO keywords (id, client_id, keyword, sub_keyword, monthly_search_total,
  competition, priority, status, is_tracking,
  current_rank_naver_pc, current_rank_naver_mo, created_at)
VALUES
  (v_kw1_id, v_client_id, '리비오젠',      '리비오젠 효과',   45200, 'HIGH',   'critical', 'active',  TRUE,  3,    5,    NOW()),
  (v_kw2_id, v_client_id, '리비오젠 가격', '리비오젠 구매',   12800, 'MEDIUM', 'high',     'active',  TRUE,  7,    12,   NOW()),
  (v_kw3_id, v_client_id, '두피케어 추천', '두피 탈모 케어',  38900, 'LOW',    'high',     'active',  TRUE,  NULL, NULL, NOW()),
  (v_kw4_id, v_client_id, '탈모샴푸 비교', '남성탈모샴푸',    22100, 'MEDIUM', 'medium',   'queued',  FALSE, NULL, NULL, NOW()),
  (v_kw5_id, v_client_id, '두피 스케일링', '두피 각질 제거',   8400, 'LOW',    'medium',   'active',  TRUE,  15,   18,   NOW()),
  (v_kw6_id, v_client_id, '리비오젠 후기', '리비오젠 사용기', 19600, 'HIGH',   'low',      'refresh', TRUE,  22,   30,   NOW()),
  (v_kw7_id, v_client_id, '두피케어 루틴', NULL,               5200, 'LOW',    'low',      'paused',  FALSE, NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 5. 콘텐츠 소스 (tags 컬럼 없음, source_type: url/text/image)
-- ──────────────────────────────────────────────────────────
INSERT INTO content_sources (id, client_id, source_type, title, url, usage_mode, is_active, created_at)
VALUES
  (v_src1_id, v_client_id, 'url',   '리비오젠 공식 제품 페이지',      'https://pocolush.com/liviogen', 'fact',      TRUE, NOW()),
  (v_src2_id, v_client_id, 'text',  '올리브영 리비오젠 후기 200개',   NULL,                            'reference', TRUE, NOW()),
  (v_src3_id, v_client_id, 'image', '두피케어 비포어애프터 이미지셋', NULL,                            'style',     TRUE, NOW()),
  (v_src4_id, v_client_id, 'url',   '두피케어 시장 리서치 데이터',    NULL,                            'fact',      TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 6. 콘텐츠 (publish_status: draft/review/approved/published/rejected/archived)
-- ──────────────────────────────────────────────────────────
INSERT INTO contents (
  id, client_id, keyword_id, account_id,
  title, body, meta_description,
  content_type, word_count, publish_status, generated_by,
  is_active, quality_score, peak_rank, peak_rank_at,
  published_date, url, tags, created_at
)
VALUES
  (v_cont1_id, v_client_id, v_kw1_id, v_blog1_id,
   '리비오젠 효과 실제로 써보니 — 3개월 사용 후기',
   E'## AI 요약 답변\n\n리비오젠은 두피 환경을 개선하여 탈모를 예방하는 기능성 헤어케어 제품이다. 3개월 사용 결과 두피 유분 균형 개선과 모발 굵기 증가가 확인된다.\n\n## 리비오젠이란?\n\n리비오젠은 포코러쉬가 개발한 두피케어 전문 브랜드다.\n\n## FAQ\n\n**Q. 어떤 두피 타입에 적합한가요?**\nA. 지성, 건성, 복합성 두피 모두에 적합하다.',
   '리비오젠 3개월 사용 후기. 두피 개선 효과와 성분 분석을 상세히 정리한다.',
   'review', 2840, 'published', 'ai',
   TRUE, 87.5, 3, '2026-02-10'::DATE,
   '2026-02-01'::DATE, 'https://blog.naver.com/pocolush_official/123456789',
   ARRAY['리비오젠', '두피케어', '탈모'], NOW()),

  (v_cont2_id, v_client_id, v_kw2_id, v_blog2_id,
   '리비오젠 가격 비교 — 어디서 사면 가장 저렴할까?',
   E'## AI 요약 답변\n\n리비오젠 공식 가격은 68,000원이며 올리브영·쿠팡에서 상시 10~20% 할인 구매가 가능하다.\n\n| 구매처 | 가격 | 할인율 |\n|--------|------|--------|\n| 공식몰 | 68,000원 | - |\n| 올리브영 | 55,000원 | 19% |\n| 쿠팡 | 59,000원 | 13% |',
   '리비오젠 가격 최저가 비교. 공식몰, 올리브영, 쿠팡 가격을 상세 비교한다.',
   'list', 2210, 'published', 'ai',
   TRUE, 91.0, 7, '2026-02-15'::DATE,
   '2026-02-05'::DATE, 'https://blog.naver.com/pocolush_beauty/987654321',
   ARRAY['리비오젠', '가격비교'], NOW()),

  (v_cont3_id, v_client_id, v_kw3_id, v_blog3_id,
   '두피케어 추천 TOP 7 — 피부과 전문의가 검증한 제품',
   E'## AI 요약 답변\n\n두피케어 제품 선택 시 핵심 성분(살리실산, 징크피리치온, 판테놀)과 두피 타입을 먼저 확인하는 것이 중요하다.\n\n## 두피케어가 중요한 이유\n\n건강한 모발은 건강한 두피에서 시작된다.',
   '피부과 전문의 검증 두피케어 추천 7가지.',
   'list', 1890, 'approved', 'ai',
   FALSE, 73.0, NULL, NULL,
   NULL, NULL,
   ARRAY['두피케어', '추천'], NOW()),

  (v_cont4_id, v_client_id, v_kw5_id, v_blog1_id,
   '두피 스케일링 방법 완벽 가이드',
   '두피 스케일링은 집에서도 할 수 있다. 올바른 방법과 주의사항을 정리한다.',
   '두피 스케일링 DIY 방법 가이드.',
   'info', 980, 'review', 'ai',
   FALSE, 42.0, NULL, NULL,
   NULL, NULL,
   ARRAY['두피스케일링'], NOW()),

  (v_cont5_id, v_client_id, v_kw1_id, v_blog2_id,
   '리비오젠 성분 분석 — 탈모 예방 효과의 과학적 근거',
   E'## AI 요약 답변\n\n리비오젠의 핵심 성분인 펩타이드 복합체는 모낭 세포 활성화를 촉진한다.',
   '리비오젠 성분 과학적 분석.',
   'single', 450, 'draft', 'ai',
   FALSE, NULL, NULL, NULL,
   NULL, NULL,
   ARRAY['리비오젠', '성분'], NOW())

ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 7. SERP 결과 (captured_at: DATE 직접 사용)
-- ──────────────────────────────────────────────────────────
INSERT INTO serp_results (
  content_id, device, rank, rank_naver_pc, rank_naver_mo,
  is_exposed, search_platform, captured_at
)
VALUES
  -- v_cont1 PC (7일)
  (v_cont1_id, 'PC', 8,  8,  12, TRUE, 'NAVER_SERP', CURRENT_DATE - 6),
  (v_cont1_id, 'PC', 6,  6,  10, TRUE, 'NAVER_SERP', CURRENT_DATE - 5),
  (v_cont1_id, 'PC', 5,  5,  8,  TRUE, 'NAVER_SERP', CURRENT_DATE - 4),
  (v_cont1_id, 'PC', 4,  4,  7,  TRUE, 'NAVER_SERP', CURRENT_DATE - 3),
  (v_cont1_id, 'PC', 3,  3,  5,  TRUE, 'NAVER_SERP', CURRENT_DATE - 2),
  (v_cont1_id, 'PC', 3,  3,  5,  TRUE, 'NAVER_SERP', CURRENT_DATE - 1),
  (v_cont1_id, 'PC', 3,  3,  5,  TRUE, 'NAVER_SERP', CURRENT_DATE),
  -- v_cont1 MO (7일)
  (v_cont1_id, 'MO', 12, 8,  12, TRUE, 'NAVER_SERP', CURRENT_DATE - 6),
  (v_cont1_id, 'MO', 10, 6,  10, TRUE, 'NAVER_SERP', CURRENT_DATE - 5),
  (v_cont1_id, 'MO', 8,  5,  8,  TRUE, 'NAVER_SERP', CURRENT_DATE - 4),
  (v_cont1_id, 'MO', 7,  4,  7,  TRUE, 'NAVER_SERP', CURRENT_DATE - 3),
  (v_cont1_id, 'MO', 5,  3,  5,  TRUE, 'NAVER_SERP', CURRENT_DATE - 2),
  (v_cont1_id, 'MO', 5,  3,  5,  TRUE, 'NAVER_SERP', CURRENT_DATE - 1),
  (v_cont1_id, 'MO', 5,  3,  5,  TRUE, 'NAVER_SERP', CURRENT_DATE),
  -- v_cont2 PC (7일)
  (v_cont2_id, 'PC', 12, 12, 18, TRUE, 'NAVER_SERP', CURRENT_DATE - 6),
  (v_cont2_id, 'PC', 10, 10, 15, TRUE, 'NAVER_SERP', CURRENT_DATE - 5),
  (v_cont2_id, 'PC', 9,  9,  14, TRUE, 'NAVER_SERP', CURRENT_DATE - 4),
  (v_cont2_id, 'PC', 8,  8,  13, TRUE, 'NAVER_SERP', CURRENT_DATE - 3),
  (v_cont2_id, 'PC', 7,  7,  12, TRUE, 'NAVER_SERP', CURRENT_DATE - 2),
  (v_cont2_id, 'PC', 7,  7,  12, TRUE, 'NAVER_SERP', CURRENT_DATE - 1),
  (v_cont2_id, 'PC', 7,  7,  12, TRUE, 'NAVER_SERP', CURRENT_DATE),
  -- v_cont2 MO (7일)
  (v_cont2_id, 'MO', 18, 12, 18, TRUE, 'NAVER_SERP', CURRENT_DATE - 6),
  (v_cont2_id, 'MO', 15, 10, 15, TRUE, 'NAVER_SERP', CURRENT_DATE - 5),
  (v_cont2_id, 'MO', 14, 9,  14, TRUE, 'NAVER_SERP', CURRENT_DATE - 4),
  (v_cont2_id, 'MO', 13, 8,  13, TRUE, 'NAVER_SERP', CURRENT_DATE - 3),
  (v_cont2_id, 'MO', 12, 7,  12, TRUE, 'NAVER_SERP', CURRENT_DATE - 2),
  (v_cont2_id, 'MO', 12, 7,  12, TRUE, 'NAVER_SERP', CURRENT_DATE - 1),
  (v_cont2_id, 'MO', 12, 7,  12, TRUE, 'NAVER_SERP', CURRENT_DATE)
ON CONFLICT (content_id, device, search_platform, captured_at) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 8. Evolving Knowledge
-- ──────────────────────────────────────────────────────────
INSERT INTO evolving_knowledge (agent_type, client_id, hypothesis, action, outcome, tags, created_at)
VALUES
  ('RND', v_client_id,
   '리비오젠 "가격 비교" 형 콘텐츠가 "성분 분석" 형보다 2배 빠르게 상위노출된다.',
   '리비오젠 가격 비교 콘텐츠 발행 → 7일 내 7위 달성 확인.',
   '가격 비교형: 7일 만에 PC 7위 달성. 성분 분석형 대비 50% 빠른 상위 진입.',
   ARRAY['가격비교', '상위노출', 'SEO'], NOW()),
  ('CMO', v_client_id,
   '두피케어 LOW 경쟁 키워드가 HIGH 경쟁 대비 CPC 40% 낮으면서 전환율은 동등하다.',
   '두피케어 추천(LOW), 두피 스케일링(LOW) 키워드 우선 배치 전략 실행.',
   '두피케어 추천: 발행 준비 완료. 스케일링: QC review 중.',
   ARRAY['키워드전략', 'LOW경쟁', 'CPC'], NOW()),
  ('RND', v_client_id,
   'NAVER_AI에서 리비오젠 인용율이 CHATGPT 대비 3배 높다.',
   'NAVER_AI 플랫폼 3회 연속 인용 감지 → Slack 알림 발송.',
   '네이버 AI 인용율 67%. CHATGPT 22%, GEMINI 18%.',
   ARRAY['AEO', 'NAVER_AI', '인용율'], NOW()),
  ('OPS_QUALITY', v_client_id,
   'review 타입 콘텐츠가 single 타입보다 QC 통과율이 15%p 낮다 (이미지 부족).',
   'review 타입 이미지 플레이스홀더 기준 6개 → 8개로 강화 제안.',
   'review QC 통과율: 72%. single: 87%. 이미지 미달이 78% 케이스에서 감점.',
   ARRAY['QC', '이미지', 'review타입'], NOW())
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 9. SOM 리포트
-- ──────────────────────────────────────────────────────────
INSERT INTO som_reports (client_id, citation_rate, report_week, created_at)
VALUES
  (v_client_id, 32.5, (CURRENT_DATE - 7)::DATE, NOW()),
  (v_client_id, 38.2, CURRENT_DATE::DATE,        NOW())
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- 10. Metrics Summary
-- ──────────────────────────────────────────────────────────
INSERT INTO metrics_summary (client_id, metric_key, value, period, summary_date, created_at)
VALUES
  (v_client_id, 'avg_rank',   8.5, 'daily', (CURRENT_DATE - 1)::DATE, NOW()),
  (v_client_id, 'avg_rank',   6.2, 'daily', CURRENT_DATE::DATE,        NOW()),
  (v_client_id, 'top3_count', 1,   'daily', (CURRENT_DATE - 1)::DATE, NOW()),
  (v_client_id, 'top3_count', 2,   'daily', CURRENT_DATE::DATE,        NOW())
ON CONFLICT (client_id, metric_key, period, summary_date) DO NOTHING;

END $$;
