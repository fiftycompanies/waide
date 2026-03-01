-- 045_scoring_criteria_seed.sql
-- scoring_criteria 테이블 초기 데이터 시딩
-- 기존 lib/place-analyzer.ts의 calculateMarketingScore() 하드코딩 기준을 테이블로 이동

-- ═══════════════════════════════════════════
-- 마케팅 점수 기준 (6영역, 100점 만점)
-- ═══════════════════════════════════════════

-- ① 네이버 리뷰/평판 (20점)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'review', 'visitor_review_count', '방문자 리뷰 수', 8,
 '[{"condition":">=500","score_pct":100,"label":"우수"},{"condition":">=100","score_pct":62,"label":"양호"},{"condition":">=10","score_pct":37,"label":"보통"},{"condition":"<10","score_pct":0,"label":"부족"}]', 1),
('marketing', 'review', 'blog_review_count', '블로그 리뷰 수', 7,
 '[{"condition":">=200","score_pct":100,"label":"우수"},{"condition":">=50","score_pct":57,"label":"양호"},{"condition":">=10","score_pct":28,"label":"보통"},{"condition":"<10","score_pct":0,"label":"부족"}]', 2),
('marketing', 'review', 'review_volume_bonus', '리뷰 볼륨 보정 (별점 대용)', 5,
 '[{"condition":">=100","score_pct":100,"label":"우수"},{"condition":">=30","score_pct":60,"label":"보통"},{"condition":"<30","score_pct":20,"label":"부족"}]', 3)
ON CONFLICT (category_group, category, item) DO NOTHING;

-- ② 네이버 키워드 노출 (25점 = 플레이스 15 + 블로그 10)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'keyword', 'place_exposure', '플레이스(로컬) 검색 노출', 15,
 '[{"condition":"avg_score_formula","score_pct":100,"label":"공식 적용","note":"keywordRankings 평균: 1위→100, ~3→95, ~5→85, ~10→70, ~20→40, else→10"}]', 1),
('marketing', 'keyword', 'blog_exposure', '블로그 검색 노출', 10,
 '[{"condition":"rank<=3","score_pct":100,"label":"TOP3"},{"condition":"rank<=10","score_pct":70,"label":"TOP10"},{"condition":"rank<=30","score_pct":40,"label":"TOP30"},{"condition":"not_found","score_pct":0,"label":"미노출"}]', 2)
ON CONFLICT (category_group, category, item) DO NOTHING;

-- ③ 구글 키워드 노출 (15점)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'google', 'google_exposure', '구글 검색 노출', 15,
 '[{"condition":"not_implemented","score_pct":0,"label":"측정 예정"}]', 1)
ON CONFLICT (category_group, category, item) DO NOTHING;

-- ④ 이미지 품질 (10점)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'image', 'image_count', '이미지 수', 3,
 '[{"condition":">=50","score_pct":100,"label":"충분"},{"condition":">=20","score_pct":66,"label":"보통"},{"condition":">=5","score_pct":33,"label":"부족"},{"condition":"<5","score_pct":0,"label":"매우 부족"}]', 1),
('marketing', 'image', 'image_quality', '이미지 품질 (Vision AI)', 4,
 '[{"condition":">=8","score_pct":100,"label":"우수"},{"condition":">=6","score_pct":75,"label":"양호"},{"condition":">=4","score_pct":50,"label":"보통"},{"condition":"<4","score_pct":25,"label":"부족"}]', 2),
('marketing', 'image', 'image_usability', '이미지 마케팅 활용도 (Vision AI)', 3,
 '[{"condition":">=8","score_pct":100,"label":"우수"},{"condition":">=6","score_pct":66,"label":"양호"},{"condition":"<6","score_pct":33,"label":"부족"}]', 3),
('marketing', 'image', 'image_count_basic', '이미지 수 (Vision AI 미실행 시)', 5,
 '[{"condition":">=50","score_pct":100,"label":"충분"},{"condition":">=20","score_pct":60,"label":"보통"},{"condition":">=5","score_pct":20,"label":"부족"},{"condition":"<5","score_pct":0,"label":"매우 부족"}]', 4)
ON CONFLICT (category_group, category, item) DO NOTHING;

-- ⑤ 온라인 채널 완성도 (15점)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'channel', 'homepage', '홈페이지 보유', 5,
 '[{"condition":"exists","score_pct":100,"label":"있음"},{"condition":"not_exists","score_pct":0,"label":"없음"}]', 1),
('marketing', 'channel', 'sns', 'SNS 채널 보유', 3,
 '[{"condition":"exists","score_pct":100,"label":"있음"},{"condition":"not_exists","score_pct":0,"label":"없음"}]', 2),
('marketing', 'channel', 'naver_reservation', '네이버 예약', 3,
 '[{"condition":"exists","score_pct":100,"label":"활성화"},{"condition":"not_exists","score_pct":0,"label":"비활성화"}]', 3),
('marketing', 'channel', 'naver_talktalk', '네이버 톡톡', 2,
 '[{"condition":"exists","score_pct":100,"label":"활성화"},{"condition":"not_exists","score_pct":0,"label":"비활성화"}]', 4),
('marketing', 'channel', 'business_hours', '영업시간 등록', 2,
 '[{"condition":"exists","score_pct":100,"label":"있음"},{"condition":"not_exists","score_pct":0,"label":"없음"}]', 5)
ON CONFLICT (category_group, category, item) DO NOTHING;

-- ⑥ SEO/AEO 준비도 (15점)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'seo', 'brand_blog', '브랜드명 블로그 검색 노출', 5,
 '[{"condition":"found","score_pct":100,"label":"노출"},{"condition":"not_found","score_pct":0,"label":"미노출"}]', 1),
('marketing', 'seo', 'keyword_blog', '메인 키워드 블로그 검색 노출', 5,
 '[{"condition":"found","score_pct":100,"label":"노출"},{"condition":"not_found","score_pct":0,"label":"미노출"}]', 2),
('marketing', 'seo', 'google_seo', '구글 SEO 준비도', 5,
 '[{"condition":"not_implemented","score_pct":0,"label":"측정 예정"}]', 3)
ON CONFLICT (category_group, category, item) DO NOTHING;


-- ═══════════════════════════════════════════
-- QC 검수 기준 (100점 만점)
-- ═══════════════════════════════════════════

INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('qc', 'content', 'char_count', '글자수 (2500자+ 목표)', 15,
 '[{"condition":">=2500","score_pct":100,"label":"충분"},{"condition":">=2000","score_pct":67,"label":"부족"},{"condition":"<2000","score_pct":33,"label":"매우 부족"}]', 1),
('qc', 'content', 'honorific_rate', '해요체 통일', 10,
 '[{"condition":">=90","score_pct":100,"label":"통일"},{"condition":">=80","score_pct":70,"label":"부분 혼용"},{"condition":"<80","score_pct":30,"label":"혼용 심함"}]', 2),
('qc', 'content', 'keyword_seo', '키워드 SEO (밀도+제목+첫문단+H2)', 15,
 '[{"condition":"density_1.5_3","score_pct":67,"label":"밀도 적정"},{"condition":"in_title","score_pct":13,"label":"제목 포함"},{"condition":"in_first_para","score_pct":7,"label":"첫문단 포함"},{"condition":"in_h2_2plus","score_pct":13,"label":"H2 포함"}]', 3),
('qc', 'content', 'h2_structure', 'H2 구조 (4개 이상)', 10,
 '[{"condition":">=4","score_pct":100,"label":"충분"},{"condition":">=3","score_pct":70,"label":"보통"},{"condition":"<3","score_pct":30,"label":"부족"}]', 4),
('qc', 'content', 'image_positions', '이미지 지시 (5개 이상)', 10,
 '[{"condition":">=5","score_pct":100,"label":"충분"},{"condition":">=3","score_pct":70,"label":"보통"},{"condition":"<3","score_pct":30,"label":"부족"}]', 5),
('qc', 'content', 'forbidden_words', '금지 표현 (0개 목표)', 10,
 '[{"condition":"==0","score_pct":100,"label":"없음"},{"condition":"<=2","score_pct":50,"label":"일부"},{"condition":">2","score_pct":0,"label":"다수"}]', 6),
('qc', 'content', 'aeo_optimization', 'AEO 최적화 (답변+리스트+FAQ)', 15,
 '[{"condition":"has_answer","score_pct":33,"label":"답변 문장"},{"condition":"has_list","score_pct":33,"label":"구조화 리스트"},{"condition":"has_faq","score_pct":34,"label":"FAQ 섹션"}]', 7),
('qc', 'content', 'naturalness', '자연스러움', 10,
 '[{"condition":"natural","score_pct":100,"label":"자연스러움"},{"condition":"partial","score_pct":60,"label":"부분 딱딱"},{"condition":"robotic","score_pct":20,"label":"AI체"}]', 8),
('qc', 'content', 'meta_description', '메타 디스크립션', 5,
 '[{"condition":"length_ok_keyword_ok","score_pct":100,"label":"완료"},{"condition":"partial","score_pct":40,"label":"부분 충족"},{"condition":"none","score_pct":0,"label":"없음"}]', 9)
ON CONFLICT (category_group, category, item) DO NOTHING;
