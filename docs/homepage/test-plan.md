# 홈페이지 서비스 종합 테스트 계획서

> **작성일**: 2026-03-18
> **대상 시스템**: waide-mkt (ai-marketer)
> **라이브 URL**: https://waide.co.kr
> **Supabase 프로젝트**: jvcyefuaegxurdctcztc
> **테스트 범위**: Phase 1~8 전체 계약 인수 기준

---

## 1. 접속 정보

### 1.1 어드민 대시보드
| 항목 | 값 |
|------|-----|
| URL | https://waide.co.kr/login |
| 대시보드 | https://waide.co.kr/dashboard |
| 홈페이지 관리 | https://waide.co.kr/homepage |
| 상담 관리 | https://waide.co.kr/homepage/inquiries |
| 운영 총괄 | https://waide.co.kr/homepage/ops |

### 1.2 Supabase 콘솔
| 항목 | 값 |
|------|-----|
| 프로젝트 URL | https://supabase.com/dashboard/project/jvcyefuaegxurdctcztc |
| Table Editor | Table Editor → homepage_projects / homepage_materials 등 |
| SQL Editor | SQL Editor → 아래 목업 데이터 SQL 실행 |

### 1.3 어드민 계정

기존 어드민 계정으로 로그인합니다. 어드민 세션은 Supabase Auth 기반이며, `users` 테이블의 `role` 컬럼으로 역할이 결정됩니다.

| 역할 | 접근 범위 | 확인 방법 |
|------|----------|----------|
| super_admin | 모든 메뉴 (설정, 어드민 관리 포함) | 사이드바에 "어드민 관리" 메뉴 표시 |
| admin | 대부분 메뉴 (어드민 관리 제외) | 사이드바에 "설정" 메뉴 표시 |
| sales | 서비스 + 고객 관리 + 영업 CRM | 사이드바에 "비즈니스" 없음 |
| viewer | 서비스 + 고객 관리 (읽기 중심) | 사이드바 메뉴 최소화 |

> **참고**: 어드민 계정이 없는 경우 Supabase `users` 테이블에서 role을 `super_admin`으로 설정하거나, `/login`에서 기존 계정으로 로그인하세요.

---

## 2. 목업 데이터 삽입

### 2.1 사전 조건 확인

Supabase SQL Editor에서 아래를 실행하여 필요한 테이블과 테스트용 클라이언트가 존재하는지 확인합니다.

```sql
-- 테이블 존재 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'homepage_%'
ORDER BY table_name;
-- 예상 결과: homepage_inquiries, homepage_materials, homepage_portfolios, homepage_projects, homepage_reviews

-- 테스트용 클라이언트 확인 (기존 seed 데이터)
SELECT id, company_name FROM clients LIMIT 5;
```

### 2.2 테스트 프로젝트 생성 SQL

> **중요**: 아래 SQL의 `client_id` 값을 위 쿼리 결과에서 가져온 실제 클라이언트 ID로 교체하세요.

```sql
-- ============================================
-- 테스트 목업 데이터: 홈페이지 프로젝트 3개
-- ============================================

-- 변수 설정 (실제 client_id로 교체)
-- 클라이언트 ID는 SELECT id, company_name FROM clients LIMIT 3; 로 확인

-- ─── 프로젝트 1: 라이브 상태 (Template A) ───
INSERT INTO homepage_projects (
  id, client_id, project_name, template_id, status,
  subdomain, vercel_project_id, vercel_deployment_url,
  theme_config, seo_config, blog_config,
  total_visits, total_inquiries, last_deployed_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM clients LIMIT 1),  -- ← 첫 번째 클라이언트
  '테스트 인테리어 홈페이지',
  'modern-minimal',
  'live',
  'test-interior',
  NULL,
  NULL,
  '{"primaryColor": "#2563eb", "secondaryColor": "#059669"}'::jsonb,
  '{"title": "테스트인테리어 | 강남 인테리어 전문", "description": "강남 인테리어 전문 업체"}'::jsonb,
  '{"posts_per_month": 8, "info_ratio": 50, "review_ratio": 50}'::jsonb,
  1250,
  34,
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  total_visits = EXCLUDED.total_visits,
  total_inquiries = EXCLUDED.total_inquiries;

-- ─── 프로젝트 2: 프리뷰 상태 (Template B) ───
INSERT INTO homepage_projects (
  id, client_id, project_name, template_id, status,
  subdomain, theme_config, seo_config, blog_config,
  total_visits, total_inquiries, last_deployed_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  (SELECT id FROM clients LIMIT 1 OFFSET 1),  -- ← 두 번째 클라이언트
  '자연우드 인테리어 홈페이지',
  'natural-wood',
  'preview',
  'natural-wood-test',
  '{"primaryColor": "#8B6914", "secondaryColor": "#6B7B3A"}'::jsonb,
  '{"title": "자연우드인테리어 | 서초구 인테리어", "description": "따뜻한 우드 인테리어 전문"}'::jsonb,
  '{"posts_per_month": 4, "info_ratio": 60, "review_ratio": 40}'::jsonb,
  320,
  8,
  NOW() - INTERVAL '5 days'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- ─── 프로젝트 3: 자료수집 상태 (Template C) ───
INSERT INTO homepage_projects (
  id, client_id, project_name, template_id, status,
  subdomain, theme_config, total_visits, total_inquiries
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  (SELECT id FROM clients LIMIT 1 OFFSET 2),  -- ← 세 번째 클라이언트
  '프리미엄 다크 인테리어',
  'premium-dark',
  'collecting',
  'premium-dark-test',
  '{"primaryColor": "#C9A96E", "secondaryColor": "#0A0A0A"}'::jsonb,
  0,
  0
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;
```

### 2.3 자료 (Materials) 데이터

```sql
-- ─── 프로젝트 1 자료 (완성) ───
INSERT INTO homepage_materials (
  id, project_id, company_name, owner_name, phone, address,
  description, kakao_link,
  service_regions, service_types,
  logo_url, primary_color, secondary_color,
  instagram_url, naver_place_url, naver_blog_url,
  certifications, operating_hours, business_number,
  faq_items, is_complete, submitted_at
) VALUES (
  'aaa11111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '테스트인테리어',
  '김테스트',
  '010-1234-5678',
  '서울 강남구 역삼동 123-45',
  '강남 지역 아파트, 빌라 인테리어 전문 업체입니다. 10년 경력의 전문가들이 함께합니다.',
  'https://pf.kakao.com/test',
  ARRAY['강남구', '서초구', '송파구'],
  ARRAY['아파트 인테리어', '빌라 인테리어', '오피스 인테리어'],
  NULL,
  '#2563eb',
  '#059669',
  'https://instagram.com/test_interior',
  'https://naver.me/test123',
  'https://blog.naver.com/test_interior',
  ARRAY['인테리어 업종 등록', 'ISO 9001'],
  '월~금 09:00~18:00, 토 10:00~15:00',
  '123-45-67890',
  '[
    {"question": "시공 기간은 얼마나 걸리나요?", "answer": "일반적으로 아파트 전체 시공 기준 3~4주 소요됩니다."},
    {"question": "견적은 어떻게 받나요?", "answer": "홈페이지 상담 신청 또는 전화 문의 주시면 무료 방문 견적을 드립니다."},
    {"question": "A/S는 어떻게 되나요?", "answer": "시공 완료 후 1년 무상 A/S를 제공합니다."}
  ]'::jsonb,
  true,
  NOW() - INTERVAL '10 days'
) ON CONFLICT (id) DO NOTHING;

-- ─── 프로젝트 2 자료 (진행 중) ───
INSERT INTO homepage_materials (
  id, project_id, company_name, owner_name, phone, address,
  description, service_regions, service_types,
  primary_color, secondary_color,
  operating_hours, business_number, faq_items, is_complete
) VALUES (
  'aaa22222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '자연우드인테리어',
  '이자연',
  '010-9876-5432',
  '서울 서초구 서초동 456-78',
  '따뜻한 원목 감성의 인테리어 전문 업체입니다.',
  ARRAY['서초구', '강남구'],
  ARRAY['아파트 인테리어', '단독주택 인테리어'],
  '#8B6914',
  '#6B7B3A',
  '월~금 10:00~19:00',
  '234-56-78901',
  '[]'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ─── 프로젝트 3 자료 (미완성) ───
INSERT INTO homepage_materials (
  id, project_id, company_name, owner_name, phone, address,
  description, is_complete
) VALUES (
  'aaa33333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  '프리미엄다크디자인',
  '박프리',
  '010-5555-6666',
  '서울 용산구 이태원동 789',
  '',
  false
) ON CONFLICT (id) DO NOTHING;
```

### 2.4 포트폴리오 데이터

```sql
-- ─── 프로젝트 1 포트폴리오 (5개) ───
INSERT INTO homepage_portfolios (id, project_id, title, slug, space_type, style, area_pyeong, budget_range, description, image_urls, sort_order, is_featured) VALUES
('bbb11111-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '강남 아파트 30평 모던 시공', 'gangnam-apt-30', '아파트', '모던', 30, '3000~5000만원',
 '강남구 역삼동 아파트 30평 전체 리모델링 사례입니다. 화이트와 그레이 톤으로 깔끔하게 시공했습니다.',
 ARRAY['https://picsum.photos/800/600?random=1', 'https://picsum.photos/800/600?random=2'],
 1, true),

('bbb11111-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '서초 빌라 25평 북유럽 스타일', 'seocho-villa-25', '빌라', '북유럽', 25, '2000~3000만원',
 '서초구 빌라 25평 북유럽 감성 인테리어입니다.',
 ARRAY['https://picsum.photos/800/600?random=3', 'https://picsum.photos/800/600?random=4'],
 2, true),

('bbb11111-0003-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '송파 아파트 45평 클래식', 'songpa-apt-45', '아파트', '클래식', 45, '5000~8000만원',
 '송파구 아파트 45평 클래식 인테리어 시공 사례입니다.',
 ARRAY['https://picsum.photos/800/600?random=5'],
 3, true),

('bbb11111-0004-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '강남 오피스 50평 미니멀', 'gangnam-office-50', '사무실', '미니멀', 50, '4000~6000만원',
 '강남구 오피스 50평 미니멀 디자인 시공입니다.',
 ARRAY['https://picsum.photos/800/600?random=6'],
 4, false),

('bbb11111-0005-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '서초 주방 리모델링', 'seocho-kitchen', '주방', '모던', 15, '1000~2000만원',
 '서초구 아파트 주방 리모델링 사례입니다.',
 ARRAY['https://picsum.photos/800/600?random=7', 'https://picsum.photos/800/600?random=8'],
 5, false)

ON CONFLICT (id) DO NOTHING;

-- ─── 프로젝트 2 포트폴리오 (2개) ───
INSERT INTO homepage_portfolios (id, project_id, title, slug, space_type, style, area_pyeong, budget_range, description, image_urls, sort_order, is_featured) VALUES
('bbb22222-0001-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 '서초 원목 아파트 35평', 'seocho-wood-35', '아파트', '내추럴', 35, '4000~6000만원',
 '원목 소재를 활용한 따뜻한 인테리어 사례입니다.',
 ARRAY['https://picsum.photos/800/600?random=10'],
 1, true),

('bbb22222-0002-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 '강남 단독주택 리모델링', 'gangnam-house', '단독주택', '내추럴', 60, '8000만원~1억',
 '강남구 단독주택 전체 리모델링 사례입니다.',
 ARRAY['https://picsum.photos/800/600?random=11'],
 2, true)

ON CONFLICT (id) DO NOTHING;
```

### 2.5 후기 데이터

```sql
-- ─── 프로젝트 1 후기 (5개) ───
INSERT INTO homepage_reviews (id, project_id, customer_name, rating, content, project_type, source) VALUES
('ccc11111-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '김OO', 5, '역삼동 아파트 30평 시공했는데 정말 만족합니다. 디자이너분이 꼼꼼하게 상담해주셔서 원하는 스타일 그대로 나왔어요.', '아파트 인테리어', 'manual'),

('ccc11111-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '이OO', 4, '서초동 빌라 리모델링 잘 해주셨습니다. 공기는 예상보다 약간 길었지만 결과물은 만족스럽습니다.', '빌라 인테리어', 'manual'),

('ccc11111-0003-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '박OO', 5, '오피스 인테리어 맡겼는데 직원들이 너무 좋아합니다. 깔끔하고 실용적인 공간으로 바뀌었어요.', '오피스 인테리어', 'manual'),

('ccc11111-0004-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '최OO', 4, '주방 리모델링 후 요리하는 게 즐거워졌습니다. 수납 공간이 많아져서 좋아요.', '주방 리모델링', 'manual'),

('ccc11111-0005-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 '정OO', 5, '처음부터 끝까지 소통이 원활했고, A/S도 빠르게 해주셔서 감사합니다.', '아파트 인테리어', 'naver_place')

ON CONFLICT (id) DO NOTHING;

-- ─── 프로젝트 2 후기 (2개) ───
INSERT INTO homepage_reviews (id, project_id, customer_name, rating, content, project_type, source) VALUES
('ccc22222-0001-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 '한OO', 5, '원목 인테리어 전문이라 확실히 다릅니다. 나무 향이 좋아요.', '아파트 인테리어', 'manual'),

('ccc22222-0002-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 '조OO', 4, '단독주택 리모델링 잘 해주셨습니다. 디자인 감각이 좋습니다.', '단독주택 인테리어', 'manual')

ON CONFLICT (id) DO NOTHING;
```

### 2.6 상담 데이터

```sql
-- ─── 프로젝트 1 상담 (8개, 다양한 상태) ───
INSERT INTO homepage_inquiries (id, project_id, client_id, name, phone, area_pyeong, space_type, budget_range, message, status, notes) VALUES
('ddd11111-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '홍길동', '010-1111-2222', 30, '아파트', '3000~5000만원',
 '강남역 근처 아파트 30평 전체 리모델링 상담 받고 싶습니다.', 'new', NULL),

('ddd11111-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '김영희', '010-3333-4444', 25, '빌라', '2000~3000만원',
 '서초동 빌라 인테리어 견적 요청드립니다. 주방 중심으로 하고 싶습니다.', 'contacted',
 '3/15 전화 연결 완료, 방문 일정 조율 중'),

('ddd11111-0003-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '박철수', '010-5555-6666', 45, '아파트', '5000~8000만원',
 '송파구 아파트 45평 클래식 스타일로 시공하고 싶습니다.', 'consulting',
 '3/10 방문 상담 완료, 도면 작업 중'),

('ddd11111-0004-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '이미영', '010-7777-8888', 35, '아파트', '4000~6000만원',
 '강남 아파트 인테리어 문의합니다.', 'contracted',
 '3/5 계약 완료, 착공일 3/20'),

('ddd11111-0005-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '최지원', '010-9999-0000', 20, '원룸', '1000~2000만원',
 '원룸 인테리어 가능한가요?', 'lost',
 '예산 부족으로 보류'),

('ddd11111-0006-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '장서연', '010-1234-0000', 40, '아파트', '5000~8000만원',
 '반포 아파트 인테리어 상담 원합니다.', 'new', NULL),

('ddd11111-0007-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '윤재민', '010-5678-0000', 50, '사무실', '4000~6000만원',
 '사무실 인테리어 견적 요청합니다.', 'new', NULL),

('ddd11111-0008-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
 (SELECT client_id FROM homepage_projects WHERE id = '11111111-1111-1111-1111-111111111111'),
 '송민지', '010-9012-0000', 28, '아파트', '2000~3000만원',
 '역삼동 아파트 부분 인테리어 가능한지요?', 'contacted',
 '3/16 전화 상담 완료')

ON CONFLICT (id) DO NOTHING;

-- ─── 프로젝트 2 상담 (3개) ───
INSERT INTO homepage_inquiries (id, project_id, client_id, name, phone, area_pyeong, space_type, budget_range, message, status) VALUES
('ddd22222-0001-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 (SELECT client_id FROM homepage_projects WHERE id = '22222222-2222-2222-2222-222222222222'),
 '강하늘', '010-2222-1111', 35, '아파트', '4000~6000만원',
 '원목 인테리어 상담 원합니다.', 'new'),

('ddd22222-0002-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 (SELECT client_id FROM homepage_projects WHERE id = '22222222-2222-2222-2222-222222222222'),
 '임도연', '010-3333-1111', 60, '단독주택', '8000만원~1억',
 '단독주택 전체 리모델링 견적 요청합니다.', 'consulting'),

('ddd22222-0003-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
 (SELECT client_id FROM homepage_projects WHERE id = '22222222-2222-2222-2222-222222222222'),
 '배수진', '010-4444-1111', 25, '빌라', '2000~3000만원',
 '서초동 빌라 인테리어 문의합니다.', 'contacted')

ON CONFLICT (id) DO NOTHING;
```

### 2.7 데이터 삽입 확인

```sql
-- 삽입 결과 확인
SELECT 'homepage_projects' AS table_name, COUNT(*) AS cnt FROM homepage_projects
UNION ALL
SELECT 'homepage_materials', COUNT(*) FROM homepage_materials
UNION ALL
SELECT 'homepage_portfolios', COUNT(*) FROM homepage_portfolios
UNION ALL
SELECT 'homepage_reviews', COUNT(*) FROM homepage_reviews
UNION ALL
SELECT 'homepage_inquiries', COUNT(*) FROM homepage_inquiries;

-- 예상 결과:
-- homepage_projects   : 3 (이상)
-- homepage_materials   : 3 (이상)
-- homepage_portfolios  : 7 (이상)
-- homepage_reviews     : 7 (이상)
-- homepage_inquiries   : 11 (이상)
```

### 2.8 테스트 데이터 정리 (테스트 후)

```sql
-- ⚠️ 테스트 완료 후 목업 데이터 삭제
-- CASCADE로 하위 데이터 자동 삭제됨
DELETE FROM homepage_projects WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);
```

---

## 3. 테스트 시나리오

### Phase 1: DB 스키마 (AC-1.x)

#### TC-1.1: 테이블 구조 확인

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 1.1.1 | 5개 테이블 존재 | Supabase Table Editor에서 `homepage_` 접두사 테이블 확인 | homepage_projects, homepage_materials, homepage_portfolios, homepage_reviews, homepage_inquiries 5개 테이블 존재 |
| 1.1.2 | homepage_projects 컬럼 | Table Editor → homepage_projects → Columns 확인 | id, client_id, project_name, template_id, status, subdomain, custom_domain, vercel_project_id, vercel_deployment_url, theme_config, seo_config, blog_config, total_visits, total_inquiries, last_deployed_at, created_at, updated_at 컬럼 존재 |
| 1.1.3 | status CHECK 제약 | SQL: `INSERT INTO homepage_projects (client_id, project_name, status) VALUES ((SELECT id FROM clients LIMIT 1), 'test', 'invalid_status')` | CHECK 제약 위반 에러 발생 |
| 1.1.4 | subdomain UNIQUE | 동일 subdomain으로 2개 프로젝트 INSERT | UNIQUE 제약 위반 에러 |
| 1.1.5 | CASCADE 삭제 | 프로젝트 삭제 시 materials, portfolios, reviews, inquiries 자동 삭제 확인 | 하위 테이블 데이터 모두 삭제됨 |

#### TC-1.2: RLS 정책 확인

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 1.2.1 | RLS 활성화 | SQL: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'homepage_%'` | 모든 테이블 rowsecurity = true |
| 1.2.2 | 익명 INSERT (상담) | homepage_inquiries에 anon key로 INSERT 시도 | INSERT 성공 (상담 접수 허용) |

#### TC-1.3: 인덱스 확인

```sql
-- 인덱스 존재 확인
SELECT indexname, tablename FROM pg_indexes
WHERE tablename LIKE 'homepage_%'
ORDER BY tablename, indexname;
-- 기대: idx_hp_projects_client, idx_hp_projects_status, idx_hp_projects_subdomain,
--       idx_hp_materials_project, idx_hp_portfolios_project, idx_hp_reviews_project,
--       idx_hp_inquiries_project, idx_hp_inquiries_status 등
```

#### TC-1.4: Storage 버킷 확인

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 1.4.1 | 버킷 존재 | Supabase Storage → Buckets 확인 | homepage-assets, homepage-logos, homepage-portfolios 버킷 존재 |
| 1.4.2 | Public 접근 | homepage-assets 버킷의 공개 설정 확인 | Public bucket = true |

---

### Phase 2: 어드민 UI (AC-2.x)

#### TC-2.1: 사이드바 메뉴

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.1.1 | 홈페이지 메뉴 그룹 | 로그인 → 사이드바 확인 | "홈페이지" 라벨 아래 4개 메뉴 표시: 홈페이지 프로젝트, 상담 신청, 운영 총괄, 템플릿 관리 |
| 2.1.2 | Globe 아이콘 | "홈페이지 프로젝트" 메뉴 아이콘 확인 | Globe 아이콘 표시 |
| 2.1.3 | 활성 상태 | /homepage 접속 → 사이드바 하이라이트 확인 | "홈페이지 프로젝트" 메뉴가 active 상태로 표시 |
| 2.1.4 | 역할별 접근 | admin 역할로 로그인 → 사이드바 확인 | "운영 총괄", "템플릿 관리" 표시됨 (ADMIN_ONLY) |
| 2.1.5 | sales 역할 | sales 역할로 접근 시 | "홈페이지 프로젝트", "상담 신청" 표시, "운영 총괄", "템플릿 관리" 숨김 |

#### TC-2.2: 프로젝트 목록 페이지

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.2.1 | 라우트 접근 | https://waide.co.kr/homepage 접속 | 프로젝트 목록 페이지 렌더링 |
| 2.2.2 | 통계 카드 | 상단 통계 영역 확인 | 전체/수집중/빌드중/프리뷰/라이브 상태별 카운트 카드 표시 |
| 2.2.3 | 프로젝트 카드 | 목업 데이터 3개 프로젝트 확인 | 프로젝트명, 업체명, 상태 배지, 방문수/상담수 표시 |
| 2.2.4 | 상태 필터 | "라이브" 필터 탭 클릭 | 라이브 상태 프로젝트만 표시 (1개) |
| 2.2.5 | 검색 | "테스트" 입력 | "테스트 인테리어 홈페이지" 프로젝트만 표시 |
| 2.2.6 | + 새 프로젝트 | 상단 "새 프로젝트" 버튼 클릭 | /homepage/new 페이지로 이동 |

#### TC-2.3: 새 프로젝트 생성

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.3.1 | 라우트 접근 | /homepage/new 접속 | 생성 폼 렌더링 |
| 2.3.2 | 클라이언트 선택 | Combobox에서 클라이언트 검색/선택 | 클라이언트 목록 표시, 선택 가능 |
| 2.3.3 | 템플릿 선택 | 3종 템플릿 카드 확인 | modern-minimal, natural-wood, premium-dark 카드 표시 |
| 2.3.4 | 서브도메인 중복 | "test-interior" 입력 (이미 사용 중) | "이미 사용 중인 서브도메인" 에러 표시 |
| 2.3.5 | 정상 생성 | 모든 필드 입력 → 생성 버튼 클릭 | 프로젝트 생성 → 상세 페이지로 리다이렉트, status='collecting' |

#### TC-2.4: 프로젝트 상세 페이지

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.4.1 | 라우트 접근 | /homepage/{프로젝트1 ID} 접속 | 프로젝트 상세 페이지 렌더링 |
| 2.4.2 | 9개 탭 표시 | 탭 영역 확인 | 개요, 자료, 포트폴리오, 후기, 상담, 배포, 블로그, 키워드, 대시보드 9개 탭 |
| 2.4.3 | 개요 탭 | 기본 탭 내용 확인 | 프로젝트 상태, 서브도메인, 방문수/상담수 표시 |
| 2.4.4 | 탭 전환 | 각 탭 클릭 | 해당 탭 컨텐츠로 전환, URL 변경 없음 |
| 2.4.5 | 프로젝트 삭제 | Danger Zone → 삭제 버튼 클릭 | 확인 후 프로젝트 삭제, /homepage 리다이렉트 |

#### TC-2.5: 자료 수집 위저드

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.5.1 | 라우트 접근 | /homepage/{프로젝트3 ID}/collect 접속 | 5단계 위저드 렌더링, 프로그레스 바 표시 |
| 2.5.2 | Step 1 기본정보 | 업체명, 대표명, 전화번호, 주소, 소개 입력 → 다음 | 데이터 저장, Step 2로 이동 |
| 2.5.3 | Step 2 서비스정보 | 서비스 지역 멀티 선택, 서비스 유형 선택 → 다음 | 데이터 저장, Step 3으로 이동 |
| 2.5.4 | Step 3 포트폴리오 | 시공 사례 등록 (이미지 업로드, 제목, 공간유형 등) | Supabase Storage 업로드, 포트폴리오 레코드 생성 |
| 2.5.5 | Step 4 후기&SNS | 후기 추가, SNS URL 입력 → 다음 | 후기 레코드 생성, SNS URL 저장 |
| 2.5.6 | Step 5 디자인 | 로고 업로드, 컬러 선택 → 완료 | is_complete=true, submitted_at 설정 |
| 2.5.7 | 필수 필드 검증 | Step 1에서 업체명 비우고 다음 클릭 | 유효성 검사 에러 표시 |

#### TC-2.6: 포트폴리오 CRUD

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.6.1 | 목록 조회 | 포트폴리오 탭 클릭 | 프로젝트 1의 5개 포트폴리오 표시 |
| 2.6.2 | 추가 | + 추가 버튼 → 정보 입력 → 저장 | 새 포트폴리오 생성, 목록에 추가 |
| 2.6.3 | 편집 | 기존 포트폴리오 편집 버튼 → 제목 수정 → 저장 | 제목 변경 반영 |
| 2.6.4 | 삭제 | 삭제 버튼 → 확인 | 목록에서 제거 |
| 2.6.5 | 메인 노출 토글 | is_featured 토글 클릭 | 즉시 반영, DB 업데이트 확인 |

#### TC-2.7: 후기 CRUD

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.7.1 | 목록 조회 | 후기 탭 클릭 | 프로젝트 1의 5개 후기 표시 (별점 포함) |
| 2.7.2 | 추가 | 고객명, 평점 4, 내용, 시공유형 입력 → 저장 | 새 후기 생성 |
| 2.7.3 | 평점 범위 | 평점 0 또는 6 입력 시도 | 유효성 검사 에러 (1~5만 허용) |
| 2.7.4 | 삭제 | 후기 삭제 → 확인 | 목록에서 제거 |

#### TC-2.8: 상담 관리

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.8.1 | 목록 조회 | 상담 탭 클릭 | 프로젝트 1의 8개 상담 표시 |
| 2.8.2 | 상태 필터 | "신규" 필터 클릭 | 신규(new) 상태 상담만 표시 (3개) |
| 2.8.3 | 상태 변경 | 신규 상담 → 드롭다운 → "연락 완료" 선택 | 상태 즉시 변경, DB 반영 |
| 2.8.4 | 상세 보기 | 상담 행 클릭 | 상세 패널 슬라이드, 고객정보/메모 표시 |
| 2.8.5 | 전체 상담 페이지 | /homepage/inquiries 접속 | 모든 프로젝트의 상담 통합 목록 표시 (11개) |

#### TC-2.9: 반응형 & 에러 상태

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 2.9.1 | 모바일 | 브라우저 DevTools → iPhone (375px) | 레이아웃 깨짐 없음, 사이드바 햄버거 메뉴 |
| 2.9.2 | 태블릿 | 768px 뷰포트 | 2열 그리드, 축소 레이아웃 |
| 2.9.3 | 로딩 상태 | Network throttle → Slow 3G | 스켈레톤 또는 스피너 표시 |
| 2.9.4 | 빈 데이터 | 프로젝트 3 (자료 미완성) 포트폴리오 탭 | Empty State 표시 |

---

### Phase 3: 자동 키워드 생성 (AC-3.x)

#### TC-3.1: 키워드 매트릭스 데이터

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 3.1.1 | 지역 데이터 확인 | `lib/homepage/keywords/seo-keyword-matrix.ts` 파일의 REGIONS 확인 | 132개 이상 지역 |
| 3.1.2 | 패턴 데이터 확인 | KEYWORD_CATEGORIES 전체 패턴 수 합산 | 124개 이상 패턴 |
| 3.1.3 | 필수 필드 | 각 패턴에 template, priority, source 필드 존재 | 모든 패턴에 3개 필드 존재 |

#### TC-3.2: 키워드 생성 기능 (프로젝트 상세 → 키워드 탭)

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 3.2.1 | 키워드 탭 접근 | 프로젝트 1 상세 → "키워드" 탭 클릭 | 키워드 관리 UI 렌더링 |
| 3.2.2 | 키워드 미리보기 | "미리보기" 버튼 클릭 | 생성 예정 키워드 목록 표시 (강남구/서초구/송파구 x 패턴) |
| 3.2.3 | 키워드 생성 | "키워드 생성" 버튼 클릭 | 로딩 → 완료, 생성 결과 (총 수, 카테고리별 수) 표시 |
| 3.2.4 | DB 확인 | Supabase → keywords 테이블 조회 (프로젝트1 client_id 필터) | source='homepage_seo' 또는 'blog_target' 키워드 다수 존재 |
| 3.2.5 | 중복 방지 | 동일 프로젝트에서 키워드 생성 재실행 | totalGenerated=0, duplicatesSkipped > 0 |
| 3.2.6 | 대표 키워드 | keywords 테이블에서 is_primary=true 확인 | 1개의 critical 키워드에 is_primary=true |

#### TC-3.3: 키워드 필터 연동

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 3.3.1 | 키워드 관리 페이지 | /keywords 접속 | 전체 키워드 목록 표시 |
| 3.3.2 | source 필터 | source 필터에서 'homepage_seo' 선택 | 홈페이지 SEO 키워드만 표시 |
| 3.3.3 | blog_type 표시 | 키워드 테이블에 blog_type 컬럼 확인 | 정보성/후기성/AEO 값 표시 |

---

### Phase 4: 템플릿 A - 모던 미니멀 (AC-4.x)

> **참고**: 템플릿 A는 실제 홈페이지 프론트엔드(서브도메인 사이트)입니다. 현재 waide-mkt에 통합된 것은 어드민 측 관리 기능이므로, 템플릿 렌더링 테스트는 실제 배포된 서브도메인 사이트에서 수행해야 합니다. 배포 기능(Phase 5)이 연동되어야 완전한 테스트가 가능합니다.

#### TC-4.1: 어드민 측 템플릿 관리

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 4.1.1 | 템플릿 선택 | 새 프로젝트 생성 → 템플릿 카드 3종 | modern-minimal, natural-wood, premium-dark 카드 표시 |
| 4.1.2 | template_id 저장 | modern-minimal 선택 후 생성 | homepage_projects.template_id = 'modern-minimal' |
| 4.1.3 | 템플릿 관리 페이지 | /homepage/templates 접속 | 템플릿 관리 페이지 렌더링 (메뉴에서 접근) |

#### TC-4.2: 상담 폼 데이터 (어드민에서 확인)

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 4.2.1 | 상담 데이터 조회 | 프로젝트 1 → 상담 탭 | 8개 상담 데이터 표시 (이름, 연락처, 평수, 공간유형, 예산, 메시지) |
| 4.2.2 | 상태 분포 | 상태별 카운트 확인 | new:3, contacted:2, consulting:1, contracted:1, lost:1 |

#### TC-4.3: SEO 설정 (어드민에서 관리)

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 4.3.1 | seo_config 저장 | homepage_projects.seo_config 확인 | title, description 필드 포함 |
| 4.3.2 | FAQ 데이터 | homepage_materials.faq_items 확인 | 3개 FAQ 항목 (question, answer) |

---

### Phase 5: 빌드/배포 파이프라인 (AC-5.x)

#### TC-5.1: 배포 탭 UI

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 5.1.1 | 배포 탭 접근 | 프로젝트 1 상세 → "배포" 탭 클릭 | DeployPanel 컴포넌트 렌더링 |
| 5.1.2 | 프로젝트 상태 표시 | 배포 패널 상단 확인 | 현재 상태(live), 서브도메인(test-interior.waide.kr), 최근 배포일 표시 |
| 5.1.3 | 배포 버튼 | "배포" 또는 "재배포" 버튼 확인 | 버튼 클릭 가능 상태 |
| 5.1.4 | 배포 이력 | 이력 테이블 확인 | 배포 기록 목록 (시간순 정렬) |

#### TC-5.2: 배포 액션 (Vercel 연동 필요)

> **주의**: 실제 Vercel API 연동이 설정되지 않은 경우 아래 테스트는 에러 메시지를 확인하는 것으로 대체합니다.

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 5.2.1 | 배포 시도 | "배포" 버튼 클릭 | (Vercel 미설정 시) 에러 메시지 표시 / (설정 시) 빌드 시작, status→'building' |
| 5.2.2 | 재배포 | "재배포" 버튼 클릭 | (Vercel 미설정 시) 에러 메시지 / (설정 시) 재빌드 트리거 |
| 5.2.3 | 롤백 | 이력에서 이전 배포 선택 → "롤백" 클릭 | (Vercel 미설정 시) 에러 / (설정 시) 해당 버전으로 복원 |
| 5.2.4 | 프로젝트 삭제 | "프로젝트 삭제" 버튼 클릭 | 확인 다이얼로그 → 삭제 실행 |

#### TC-5.3: 상태 전이

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 5.3.1 | collecting → building | 자료 수집 완료 시 | status = 'building' |
| 5.3.2 | building → preview | (Webhook 수신 시) | status = 'preview', deployment_url 업데이트 |
| 5.3.3 | preview → live | 프로덕션 프로모트 시 | status = 'live' |
| 5.3.4 | building → build_failed | (빌드 실패 Webhook) | status = 'build_failed' |

---

### Phase 6: 블로그 대량발행 연동 (AC-6.x)

#### TC-6.1: 블로그 탭 UI

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 6.1.1 | 블로그 탭 접근 | 프로젝트 1 상세 → "블로그" 탭 클릭 | BlogManager 컴포넌트 렌더링 |
| 6.1.2 | 통계 카드 | 상단 통계 영역 확인 | 전체 블로그 수, 발행된 수, 미발행 수, 품질 점수 평균 표시 |
| 6.1.3 | 발행된 글 목록 | 글 목록 테이블 확인 | 제목, 키워드, 상태, 발행일 컬럼 표시 |

#### TC-6.2: 초기 블로그 생성

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 6.2.1 | 초기 생성 버튼 | "초기 블로그 생성 (8개)" 버튼 클릭 | 로딩 상태 → 8개 블로그 생성 시도 |
| 6.2.2 | 정보성/후기성 비율 | 생성 결과 확인 | 정보성 4개 + 후기성 4개 = 8개 (기대) |
| 6.2.3 | DB 확인 | Supabase → contents 테이블 조회 | content_type = 'hp_blog_info' 또는 'hp_blog_review' 레코드 존재 |

> **참고**: 실제 AI 콘텐츠 생성은 API 키와 에이전트 설정이 필요합니다. 키 미설정 시 에러 메시지를 확인합니다.

#### TC-6.3: 월간 스케줄

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 6.3.1 | 스케줄 생성 | "월간 스케줄 생성" 버튼 클릭 | 이번 달 블로그 발행 스케줄 생성 |
| 6.3.2 | posts_per_month | blog_config.posts_per_month = 8 확인 | 8개 발행 스케줄 |
| 6.3.3 | 키워드 로테이션 | 미발행 키워드 우선 선택 확인 | 발행 이력 없는 키워드가 먼저 선택됨 |

---

### Phase 7: 템플릿 B, C (AC-7.x)

> **참고**: 템플릿 B(Natural Wood), C(Premium Dark) 렌더링은 실제 배포된 사이트에서 확인합니다. 어드민에서는 템플릿 전환 기능을 테스트합니다.

#### TC-7.1: 템플릿 전환 (어드민)

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 7.1.1 | template_id 확인 | Supabase → 프로젝트 1: 'modern-minimal', 프로젝트 2: 'natural-wood' | 올바른 template_id 저장 |
| 7.1.2 | 템플릿 변경 | 프로젝트 2 설정에서 template_id → 'premium-dark' 변경 | DB 업데이트 성공 |
| 7.1.3 | 데이터 유지 | 템플릿 변경 후 materials, portfolios, reviews 확인 | 모든 데이터 유지 (템플릿만 변경) |

#### TC-7.2: 세 템플릿 구분

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 7.2.1 | Template A 색상 | 프로젝트 1 theme_config 확인 | primaryColor: #2563eb (블루) |
| 7.2.2 | Template B 색상 | 프로젝트 2 theme_config 확인 | primaryColor: #8B6914 (우드브라운) |
| 7.2.3 | Template C 색상 | 프로젝트 3 theme_config 확인 | primaryColor: #C9A96E (골드) |

---

### Phase 8: 모니터링 & 리포트 (AC-8.x)

#### TC-8.1: 대시보드 탭

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 8.1.1 | 대시보드 탭 접근 | 프로젝트 1 상세 → "대시보드" 탭 클릭 | DashboardView 컴포넌트 렌더링 |
| 8.1.2 | KPI 카드 | 4개 KPI 카드 확인 | 월 방문수, 월 상담수, 전환율, 블로그 수 표시 |
| 8.1.3 | 기간 필터 | "오늘/이번 주/이번 달" 탭 전환 | 선택된 기간 하이라이트, UI 갱신 |
| 8.1.4 | 일별 방문 차트 | 방문 추이 차트 확인 | 막대 그래프 렌더링 (hover 시 날짜/방문수 표시) |
| 8.1.5 | 유입 경로 | 유입 경로 차트 확인 | 소스별 바 차트 (네이버, 구글, 직접, SNS 등) |
| 8.1.6 | 인기 페이지 | TOP 10 인기 페이지 목록 확인 | 순위, 경로, 조회수 표시 |
| 8.1.7 | 상담 상태 | 상담 상태별 분포 확인 | 신규/연락완료/상담중/계약/이탈 분포 + 총 건수 |

> **참고**: 대시보드 데이터는 monitoring-actions.ts의 getDashboardDataAction()에서 가져옵니다. Vercel Analytics API 미연동 시 Supabase 데이터 기반으로 표시됩니다.

#### TC-8.2: 운영 총괄 페이지

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 8.2.1 | 페이지 접근 | /homepage/ops 접속 또는 사이드바 "운영 총괄" 클릭 | OpsOverview 컴포넌트 렌더링 |
| 8.2.2 | KPI 카드 | 4개 총괄 KPI 확인 | 라이브 프로젝트 수, 총 방문수, 총 상담수, 평균 전환율 |
| 8.2.3 | 프로젝트 테이블 | 프로젝트 현황 테이블 확인 | 프로젝트명, 서브도메인, 상태, 방문수, 상담수, 전환율, 최근 배포 컬럼 |
| 8.2.4 | 서브도메인 링크 | 서브도메인 컬럼 클릭 | 새 탭에서 https://{subdomain}.waide.kr 열림 |
| 8.2.5 | 정렬 | "방문수" 헤더 클릭 | 방문수 기준 내림차순 정렬 → 재클릭 시 오름차순 |
| 8.2.6 | 정렬 아이콘 | 정렬 컬럼 헤더 확인 | 활성 정렬 컬럼에 파란색 화살표 아이콘 표시 |
| 8.2.7 | 상태 배지 | 상태 컬럼 확인 | 라이브=녹색, 프리뷰=보라색, 수집중=노란색 배지 |

#### TC-8.3: 알림 기능 (설정 필요)

| # | 테스트 항목 | 절차 | 기대 결과 |
|---|-----------|------|----------|
| 8.3.1 | Slack 알림 설정 | 프로젝트 설정에서 Slack Webhook URL 입력 | URL 저장됨 |
| 8.3.2 | Slack 테스트 발송 | "테스트 발송" 버튼 클릭 | (Webhook URL 설정 시) Slack 메시지 수신 |
| 8.3.3 | 이메일 알림 설정 | 수신자 이메일 추가 | 이메일 목록에 추가됨 |

> **참고**: Slack Webhook URL과 Resend API 키가 설정되어야 실제 알림이 발송됩니다.

#### TC-8.4: 데이터 정확성 검증

```sql
-- KPI 데이터 검증 쿼리
-- 프로젝트 1의 상담 상태별 분포
SELECT status, COUNT(*) FROM homepage_inquiries
WHERE project_id = '11111111-1111-1111-1111-111111111111'
GROUP BY status;
-- 기대: new:3, contacted:2, consulting:1, contracted:1, lost:1

-- 전체 프로젝트 총괄 (운영 대시보드 검증)
SELECT
  COUNT(*) FILTER (WHERE status = 'live') AS live_projects,
  SUM(total_visits) AS total_visits,
  SUM(total_inquiries) AS total_inquiries,
  ROUND(AVG(
    CASE WHEN total_visits > 0
    THEN (total_inquiries::float / total_visits * 100)
    ELSE 0 END
  )::numeric, 1) AS avg_conversion_rate
FROM homepage_projects;
-- 라이브 1개, 방문 1570, 상담 42, 전환율 계산
```

---

## 4. 통합 테스트 시나리오 (E2E 플로우)

### E2E-1: 프로젝트 생성 → 자료 수집 → 키워드 생성 전체 플로우

```
1. /homepage → "새 프로젝트" 클릭
2. 클라이언트 선택, 프로젝트명 입력, 템플릿 선택, 서브도메인 입력
3. 생성 → 프로젝트 상세로 리다이렉트 (status=collecting)
4. "자료 수집" 링크 클릭 → /homepage/{id}/collect
5. Step 1~5 완료 → is_complete=true, status=building
6. 키워드 탭 → 자동 생성된 키워드 확인 (또는 수동 "키워드 생성" 클릭)
7. /keywords → source 필터 'homepage_seo' → 생성된 키워드 조회
```

**기대 결과**: 프로젝트 생성부터 키워드 생성까지 끊김 없이 완료

### E2E-2: 상담 접수 → 상태 관리 플로우

```
1. (외부) homepage_inquiries에 새 상담 INSERT (또는 홈페이지 상담 폼에서 접수)
2. /homepage/{id} → 상담 탭 → 새 상담 확인
3. 상태: new → contacted 변경
4. 메모 입력: "3/18 전화 상담 완료"
5. /homepage/inquiries → 전체 상담 목록에서 확인
6. 상태 필터: "상담 중" → 해당 상담 표시
```

**기대 결과**: 상담 접수부터 상태 관리까지 원활한 워크플로우

### E2E-3: 운영 총괄 대시보드 데이터 일관성

```
1. /homepage/ops 접속
2. KPI 카드의 라이브 프로젝트 수 확인 → 프로젝트 목록의 라이브 필터 결과와 일치
3. 총 방문수 확인 → 각 프로젝트 방문수 합산과 일치
4. 총 상담수 확인 → 각 프로젝트 상담수 합산과 일치
5. 프로젝트별 전환율 확인 → (상담수/방문수)*100 계산과 일치
```

**기대 결과**: 운영 총괄 페이지의 모든 수치가 개별 프로젝트 데이터와 정확히 일치

### E2E-4: 블로그 & 배포 연동 플로우

```
1. 프로젝트 1 → 블로그 탭 → "초기 블로그 생성" 클릭
2. 8개 블로그 생성 결과 확인 (정보성 4 + 후기성 4)
3. 배포 탭 → "재배포" 클릭 → 새 컨텐츠 포함 빌드
4. 대시보드 탭 → 블로그 수 KPI 업데이트 확인
```

**기대 결과**: 블로그 생성 → 배포 → 대시보드 반영까지 데이터 흐름 정상

---

## 5. 체크리스트 요약

### Phase 1: DB 스키마
- [ ] 5개 테이블 존재 확인
- [ ] 컬럼 구조 정확성 확인
- [ ] CHECK 제약, UNIQUE 제약 동작
- [ ] CASCADE 삭제 동작
- [ ] RLS 정책 활성화
- [ ] 인덱스 존재 확인
- [ ] Storage 버킷 존재 및 공개 설정

### Phase 2: 어드민 UI
- [ ] 사이드바 "홈페이지" 메뉴 4개 표시
- [ ] 프로젝트 목록 (통계, 필터, 검색, 카드)
- [ ] 새 프로젝트 생성 (클라이언트, 템플릿, 서브도메인)
- [ ] 프로젝트 상세 9개 탭 (개요/자료/포트폴리오/후기/상담/배포/블로그/키워드/대시보드)
- [ ] 자료 수집 5단계 위저드
- [ ] 포트폴리오 CRUD + 정렬
- [ ] 후기 CRUD + 평점 검증
- [ ] 상담 상태 관리 + 필터 + 상세 패널
- [ ] 반응형 디자인 (모바일/태블릿/데스크톱)
- [ ] 로딩/에러/빈 데이터 상태

### Phase 3: 자동 키워드 생성
- [ ] 키워드 매트릭스 데이터 (132지역, 124패턴)
- [ ] 키워드 생성 정상 동작
- [ ] 중복 방지 로직
- [ ] 대표 키워드(is_primary) 설정
- [ ] 기존 키워드 관리 페이지 필터 연동

### Phase 4: 템플릿 A (어드민 관리 측)
- [ ] 템플릿 선택 UI 동작
- [ ] template_id 저장
- [ ] seo_config, theme_config 저장
- [ ] FAQ 데이터 관리

### Phase 5: 배포 파이프라인 (어드민 UI)
- [ ] 배포 패널 렌더링
- [ ] 배포/재배포/롤백 버튼 동작
- [ ] 배포 이력 표시
- [ ] 상태 전이 (collecting→building→preview→live)
- [ ] 프로젝트 삭제

### Phase 6: 블로그 발행 (어드민 UI)
- [ ] 블로그 관리 패널 렌더링
- [ ] 통계 카드 표시
- [ ] 초기 블로그 생성 버튼
- [ ] 월간 스케줄 생성
- [ ] 발행/취소 동작

### Phase 7: 템플릿 B, C (어드민 관리)
- [ ] template_id 변경 가능
- [ ] 데이터 유지 확인
- [ ] 세 템플릿 색상/설정 구분

### Phase 8: 모니터링 & 리포트
- [ ] 대시보드 KPI 4개 카드
- [ ] 일별 방문 차트
- [ ] 유입 경로 차트
- [ ] 인기 페이지 TOP 10
- [ ] 상담 상태별 분포
- [ ] 운영 총괄 페이지 KPI + 테이블
- [ ] 정렬 기능 (방문수/상담수/전환율)
- [ ] 상태 배지 색상
- [ ] 데이터 정확성 (SQL 검증)

---

## 6. 알려진 제한사항

| 항목 | 설명 | 영향 |
|------|------|------|
| Vercel API 미연동 | 배포/재배포/롤백은 Vercel API 키 설정 필요 | Phase 5 배포 테스트 일부 제한 |
| Vercel Analytics | 방문 통계는 Vercel Analytics API 연동 필요 | Phase 8 대시보드 방문 데이터 미표시 가능 |
| AI 콘텐츠 생성 | 블로그 생성은 Anthropic API 키 + 에이전트 설정 필요 | Phase 6 초기 블로그 생성 제한 |
| Slack Webhook | Slack 알림은 Webhook URL 설정 필요 | Phase 8 알림 테스트 제한 |
| Resend API | 이메일 알림은 Resend API 키 설정 필요 | Phase 8 이메일 테스트 제한 |
| 홈페이지 프론트엔드 | 템플릿 실제 렌더링은 별도 홈페이지 앱 배포 필요 | Phase 4, 7 프론트엔드 테스트 제한 |
| 기존 TS 에러 | 6개 pre-existing TypeScript 에러 (통합 작업과 무관) | 빌드 시 워닝, 동작에는 영향 없음 |

---

## 7. 기존 TypeScript 에러 (참고)

통합 작업에서 새로 도입된 에러는 0개이며, 기존에 존재하던 6개 에러는 아래와 같습니다:

| 파일 | 에러 | 원인 |
|------|------|------|
| `app/api/homepage/inquiry/route.ts:51` | `.catch` on PostgrestFilterBuilder | Supabase 타입 불일치 |
| `lib/actions/homepage-actions.ts:455,458` | `.catch` / always-true condition | 기존 코드 이슈 |
| `lib/actions/homepage-keyword-actions.ts:207,212` | 'material' possibly null | null 체크 누락 |
| `lib/homepage/monitoring/analytics-collector.ts:102` | `.catch` on PromiseLike | Supabase 타입 이슈 |
