-- ═══════════════════════════════════════════════════════════════
-- run_all_f1_f4.sql
-- Phase F-1 ~ F-4 통합 마이그레이션 (045~052)
--
-- 특징:
--   - 전체 멱등성 보장 (여러 번 실행해도 안전)
--   - 050 버그 수정: UNIQUE(agent_type, task) 추가 + ON CONFLICT
--   - 051 버그 수정: keywords 테이블 전용 constraint 드롭
--   - 트랜잭션 래핑
--
-- 사용법: Supabase Dashboard → SQL Editor에 붙여넣고 실행
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════
-- 045: scoring_criteria 테이블
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL,
  rules JSONB NOT NULL,
  category_group TEXT NOT NULL DEFAULT 'marketing',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_group, category, item)
);

CREATE INDEX IF NOT EXISTS idx_scoring_criteria_group ON scoring_criteria(category_group, is_active);

-- 045 seed: 마케팅 점수 기준 (6영역, 100점)
INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'review', 'visitor_review_count', '방문자 리뷰 수', 8,
 '[{"condition":">=500","score_pct":100,"label":"우수"},{"condition":">=100","score_pct":62,"label":"양호"},{"condition":">=10","score_pct":37,"label":"보통"},{"condition":"<10","score_pct":0,"label":"부족"}]', 1),
('marketing', 'review', 'blog_review_count', '블로그 리뷰 수', 7,
 '[{"condition":">=200","score_pct":100,"label":"우수"},{"condition":">=50","score_pct":57,"label":"양호"},{"condition":">=10","score_pct":28,"label":"보통"},{"condition":"<10","score_pct":0,"label":"부족"}]', 2),
('marketing', 'review', 'review_volume_bonus', '리뷰 볼륨 보정 (별점 대용)', 5,
 '[{"condition":">=100","score_pct":100,"label":"우수"},{"condition":">=30","score_pct":60,"label":"보통"},{"condition":"<30","score_pct":20,"label":"부족"}]', 3)
ON CONFLICT (category_group, category, item) DO NOTHING;

INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'keyword', 'place_exposure', '플레이스(로컬) 검색 노출', 15,
 '[{"condition":"avg_score_formula","score_pct":100,"label":"공식 적용","note":"keywordRankings 평균: 1위→100, ~3→95, ~5→85, ~10→70, ~20→40, else→10"}]', 1),
('marketing', 'keyword', 'blog_exposure', '블로그 검색 노출', 10,
 '[{"condition":"rank<=3","score_pct":100,"label":"TOP3"},{"condition":"rank<=10","score_pct":70,"label":"TOP10"},{"condition":"rank<=30","score_pct":40,"label":"TOP30"},{"condition":"not_found","score_pct":0,"label":"미노출"}]', 2)
ON CONFLICT (category_group, category, item) DO NOTHING;

INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'google', 'google_exposure', '구글 검색 노출', 15,
 '[{"condition":"not_implemented","score_pct":0,"label":"측정 예정"}]', 1)
ON CONFLICT (category_group, category, item) DO NOTHING;

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

INSERT INTO scoring_criteria (category_group, category, item, description, max_score, rules, sort_order) VALUES
('marketing', 'seo', 'brand_blog', '브랜드명 블로그 검색 노출', 5,
 '[{"condition":"found","score_pct":100,"label":"노출"},{"condition":"not_found","score_pct":0,"label":"미노출"}]', 1),
('marketing', 'seo', 'keyword_blog', '메인 키워드 블로그 검색 노출', 5,
 '[{"condition":"found","score_pct":100,"label":"노출"},{"condition":"not_found","score_pct":0,"label":"미노출"}]', 2),
('marketing', 'seo', 'google_seo', '구글 SEO 준비도', 5,
 '[{"condition":"not_implemented","score_pct":0,"label":"측정 예정"}]', 3)
ON CONFLICT (category_group, category, item) DO NOTHING;

-- QC 검수 기준 (100점)
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


-- ═══════════════════════════════════════════
-- 046: agent_execution_logs 테이블
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  task TEXT NOT NULL,
  prompt_version INTEGER,
  client_id UUID REFERENCES clients(id),
  input_summary TEXT,
  output_data JSONB,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_cost_usd NUMERIC(10, 6),
  duration_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  chain_id UUID,
  chain_step INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_task ON agent_execution_logs(agent, task);
CREATE INDEX IF NOT EXISTS idx_agent_logs_client ON agent_execution_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_chain ON agent_execution_logs(chain_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_execution_logs(created_at);


-- ═══════════════════════════════════════════
-- 047: content_benchmarks 테이블
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS content_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  benchmark_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  UNIQUE(keyword)
);

-- UNIQUE(keyword)가 이미 인덱스를 생성하므로 idx_benchmarks_keyword는 생략
CREATE INDEX IF NOT EXISTS idx_benchmarks_expires ON content_benchmarks(expires_at);


-- ═══════════════════════════════════════════
-- 048: clients.brand_persona JSONB
-- ═══════════════════════════════════════════

ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_persona JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS persona_updated_at TIMESTAMPTZ;


-- ═══════════════════════════════════════════
-- 049: agent_prompts 확장 컬럼
-- ═══════════════════════════════════════════

ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS task TEXT;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS output_schema JSONB;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'claude-haiku-4-5';
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.3;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2000;
ALTER TABLE agent_prompts ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_agent_prompts_task ON agent_prompts(agent_type, task);

-- ★ 050 버그 수정: UNIQUE 제약 추가 (멱등)
-- ON CONFLICT 사용을 위해 (agent_type, task) 유니크 제약 필요
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_prompts_agent_type_task_key'
  ) THEN
    -- task가 NULL인 기존 행이 있을 수 있으므로, NULL끼리 충돌하지 않음 (UNIQUE는 NULL 허용)
    ALTER TABLE agent_prompts ADD CONSTRAINT agent_prompts_agent_type_task_key UNIQUE (agent_type, task);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    -- 이미 중복 데이터가 있으면 먼저 정리
    -- 가장 최근 것만 남기고 삭제
    DELETE FROM agent_prompts a
    USING agent_prompts b
    WHERE a.agent_type = b.agent_type
      AND a.task = b.task
      AND a.task IS NOT NULL
      AND a.created_at < b.created_at;

    ALTER TABLE agent_prompts ADD CONSTRAINT agent_prompts_agent_type_task_key UNIQUE (agent_type, task);
END $$;


-- ═══════════════════════════════════════════
-- 050: agent_prompts 시딩 (10개)
-- ★ 수정: ON CONFLICT DO UPDATE 적용
-- ═══════════════════════════════════════════

-- 1. CMO / brand_persona
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'CMO', 'brand_persona', 'brand_persona', '브랜드 페르소나 생성',
  '## 규칙
1. 네이버 플레이스 "정보" 탭 데이터를 최우선으로 반영 (영업시간, 편의시설, 메뉴, 가격대, 주차, 예약 등). 정보가 풍부하면 구체적 강점으로 활용하고, 빈약하면 리뷰/이미지 등 다른 요소에서 강점 도출.
2. 리뷰에서 반복 언급되는 키워드 = 실제 강점으로 반영
3. 경쟁사 대비 차별점 명확히
4. 모든 항목은 이 매장만의 것 (일반적 표현 금지)
5. 톤은 매장 분위기에 맞춰 자유롭게 결정

## 매장 데이터
매장명: {{place_name}}
업종: {{category}} / 세부: {{category_detail}}
지역: {{region}}
주소: {{address}}

정보 탭:
  영업시간: {{business_hours}}
  편의시설: {{facilities}}
  메뉴/가격: {{menu_items}}
  주차: {{parking}}
  예약: {{reservation}}
  기타: {{additional_info}}

리뷰 요약:
  총 리뷰: {{review_count}}건 / 평점: {{rating}}
  긍정 키워드: {{positive_keywords}}
  부정 키워드: {{negative_keywords}}

이미지 분석: {{image_analysis}}
마케팅 점수: {{marketing_score}}/100
경쟁사 요약: {{competitor_summary}}

## JSON으로만 응답하세요:
{
  "one_liner": "한줄 소개 (위치 + 핵심 특징 + 업종)",
  "core_identity": "이 매장이 존재하는 이유 2~3문장",
  "positioning": "가성비/품질/분위기/전문성/접근성 중 어디서 승부하는지",
  "primary_target": "핵심 타겟 (연령+성별+상황)",
  "secondary_target": "보조 타겟",
  "target_needs": ["타겟이 이 매장에서 원하는 것 3가지"],
  "strengths": ["플레이스 데이터 기반 강점 3개 — 수치 포함"],
  "weaknesses": ["개선 필요 사항 2~3개"],
  "tone": "콘텐츠 톤앤매너",
  "content_angles": ["이 매장에 맞는 콘텐츠 앵글 5개"],
  "avoid_angles": ["안 맞는 앵글 — 이유 포함"],
  "competitor_position": "TOP5 중 몇 위 + 이유",
  "differentiation": "경쟁사 대비 명확한 차별점"
}',
  '당신은 로컬 비즈니스 브랜드 전략가입니다. 네이버 플레이스 데이터를 기반으로 매장의 브랜드 페르소나를 작성합니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.3, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 2. RND / competitor_analysis
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'RND', 'competitor_analysis', 'competitor_analysis', '경쟁사 TOP5 비교 분석',
  '## 규칙
1. 같은 업종, 같은 지역의 경쟁사 TOP5를 비교 분석
2. 각 경쟁사의 강점/약점을 수치 기반으로 평가
3. 우리 매장의 포지션을 경쟁사 대비 명확히 설정
4. 실행 가능한 차별화 전략 제시

## 분석 대상
매장명: {{place_name}}
업종: {{category}}
지역: {{region}}
리뷰 수: {{review_count}}건
블로그 리뷰: {{blog_review_count}}건
현재 마케팅 점수: {{marketing_score}}/100
키워드 순위: {{keyword_rankings}}

## 경쟁사 SERP 데이터
{{serp_data}}

## JSON으로만 응답하세요:
{
  "competitors": [
    {
      "name": "경쟁사명",
      "position": 1,
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "review_count": 0,
      "blog_presence": "strong/moderate/weak",
      "keyword_overlap": ["겹치는 키워드"]
    }
  ],
  "our_position": {
    "rank_among_competitors": 3,
    "competitive_advantages": ["우위 항목"],
    "gaps_to_close": ["보강 필요 항목"]
  },
  "differentiation_strategy": "핵심 차별화 방향 2~3문장",
  "quick_wins": ["바로 실행 가능한 전략 3개"]
}',
  '당신은 로컬 비즈니스 경쟁 분석 전문가입니다. SERP 데이터와 플레이스 정보를 기반으로 객관적인 경쟁 분석을 수행합니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.3, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 3. CMO / seo_diagnosis_comment
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'CMO', 'seo_diagnosis_comment', 'seo_diagnosis_comment', 'SEO 진단 업종 맞춤 코멘트',
  '## 규칙
1. SEO 결격사유 7항목 진단 결과를 바탕으로 업종에 맞는 코멘트 작성
2. 각 항목별 개선 효과를 구체적 수치로 제시
3. 우선순위를 명확히 (효과 큰 순)
4. 업종 특성 반영 (카페/음식점/숙박 등 다른 코멘트)

## 매장 데이터
매장명: {{place_name}}
업종: {{category}}
지역: {{region}}

## SEO 진단 결과
{{seo_audit}}

## 마케팅 점수 상세
{{score_breakdown}}

## JSON으로만 응답하세요:
{
  "overall_diagnosis": "전체 SEO 상태 한줄 요약",
  "priority_actions": [
    {
      "item": "진단 항목명",
      "status": "pass/fail/warning",
      "comment": "업종 맞춤 코멘트 (2~3문장)",
      "expected_impact": "개선 시 기대 효과",
      "difficulty": "easy/medium/hard",
      "priority": 1
    }
  ],
  "industry_specific_tips": ["업종 특화 팁 2~3개"],
  "estimated_score_gain": "개선 시 예상 점수 상승폭"
}',
  '당신은 로컬 비즈니스 SEO 진단 전문가입니다. 네이버 플레이스 기반 SEO 결격사유를 업종에 맞게 해석하고 실행 가능한 개선 방안을 제시합니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.3, 1500, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 4. CMO / improvement_plan
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'CMO', 'improvement_plan', 'improvement_plan', '개선포인트 전략 액션플랜',
  '## 규칙
1. 마케팅 점수 breakdown 기반으로 가장 효과적인 개선 액션 도출
2. 각 액션은 구체적이고 실행 가능해야 함
3. 예상 비용/시간/효과를 명시
4. 1주/1개월/3개월 로드맵으로 구분

## 매장 데이터
매장명: {{place_name}}
업종: {{category}}
현재 점수: {{marketing_score}}/100

## 점수 상세
{{score_breakdown}}

## 개선 포인트 목록
{{improvements}}

## 브랜드 페르소나
{{brand_persona}}

## JSON으로만 응답하세요:
{
  "target_score": 80,
  "current_score": 0,
  "roadmap": {
    "week1": [
      {
        "action": "구체적 액션",
        "category": "review/keyword/image/channel/seo",
        "expected_score_gain": 5,
        "effort": "low/medium/high",
        "cost": "무료/저비용/투자필요"
      }
    ],
    "month1": [],
    "month3": []
  },
  "priority_summary": "가장 중요한 3가지 액션 요약",
  "expected_total_gain": "3개월 후 예상 점수"
}',
  '당신은 로컬 비즈니스 마케팅 전략 컨설턴트입니다. 데이터 기반 개선 액션플랜을 수립합니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.3, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 5. CMO / keyword_strategy
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'CMO', 'keyword_strategy', 'keyword_strategy', '키워드 공략 전략',
  '## 규칙
1. 현재 키워드 순위와 검색량 데이터 기반
2. 검색량 대비 경쟁도가 낮은 "이길 수 있는" 키워드 우선
3. 단기(1주) / 중기(1개월) / 장기(3개월) 공략 키워드 분류
4. 각 키워드별 추천 콘텐츠 타입 제시

## 매장 데이터
매장명: {{place_name}}
업종: {{category}}
지역: {{region}}

## 키워드 현황
{{keywords}}

## 키워드 순위
{{keyword_rankings}}

## 경쟁사 분석
{{competitor_summary}}

## JSON으로만 응답하세요:
{
  "strategy_summary": "키워드 전략 방향 한줄",
  "priority_keywords": [
    {
      "keyword": "키워드",
      "monthly_search": 0,
      "current_rank": null,
      "difficulty": "easy/medium/hard",
      "timeline": "short/medium/long",
      "content_type": "list/review/info",
      "reason": "이 키워드를 공략해야 하는 이유"
    }
  ],
  "content_calendar": {
    "week1": ["키워드1 (list형)", "키워드2 (review형)"],
    "month1": [],
    "month3": []
  },
  "avoid_keywords": ["경쟁 과다 키워드 — 이유"]
}',
  '당신은 로컬 비즈니스 SEO 키워드 전략가입니다. 검색량과 경쟁도 데이터를 기반으로 최적의 키워드 공략 전략을 수립합니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.3, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 6. RND / niche_keyword_expansion
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'RND', 'niche_keyword_expansion', 'niche_keyword_expansion', '니치 키워드 확장',
  '## 규칙
1. 기존 키워드에서 롱테일/니치 키워드 확장
2. 지역명 + 업종 + 시즌/상황 조합
3. 검색 의도(정보/탐색/거래) 분류
4. 실제 사용자가 검색할 법한 자연어 키워드

## 매장 데이터
매장명: {{place_name}}
업종: {{category}}
지역: {{region}} (동/구/시 포함)
특징: {{place_features}}

## 기존 키워드
{{existing_keywords}}

## JSON으로만 응답하세요:
{
  "expanded_keywords": [
    {
      "keyword": "확장 키워드",
      "parent_keyword": "원본 키워드",
      "intent": "정보형/탐색형/거래형",
      "estimated_volume": "high/medium/low",
      "competition": "high/medium/low",
      "content_angle": "이 키워드에 맞는 콘텐츠 방향"
    }
  ],
  "seasonal_keywords": [
    {
      "keyword": "시즌 키워드",
      "best_month": "3월",
      "reason": "이유"
    }
  ],
  "local_long_tail": ["지역 특화 롱테일 키워드 5~10개"],
  "question_keywords": ["질문형 키워드 5개 (AEO 대응)"]
}',
  '당신은 로컬 비즈니스 키워드 리서처입니다. 기존 키워드를 기반으로 니치/롱테일 키워드를 확장하여 검색 커버리지를 넓힙니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.4, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 7. RND / content_benchmark
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'RND', 'content_benchmark', 'content_benchmark', '상위노출 글 벤치마킹',
  '## 규칙
1. 네이버 블로그 상위 노출 글들의 공통 패턴 분석
2. 글자수, 구조, 키워드 밀도, 이미지 수 등 정량적 분석
3. D.I.A (Deep Intent Analysis) 패턴 파악
4. COPYWRITER에게 전달할 브리프 작성

## 타겟 키워드
키워드: {{keyword}}
검색량: {{monthly_search}}
현재 순위: {{current_rank}}

## 상위 노출 글 데이터 (SERP)
{{serp_top_results}}

## JSON으로만 응답하세요:
{
  "pattern_analysis": {
    "avg_char_count": 0,
    "avg_image_count": 0,
    "common_h2_structure": ["섹션 패턴"],
    "keyword_density_range": "1.5~3%",
    "common_content_type": "list/review/info",
    "common_opening_pattern": "첫문단 패턴",
    "common_closing_pattern": "마무리 패턴",
    "dia_elements": ["상위글 D.I.A 특징"]
  },
  "gaps": ["상위글에서 부족한 부분 = 우리의 기회"],
  "copywriter_brief": {
    "recommended_type": "list/review/info",
    "target_char_count": 2500,
    "must_include_sections": ["필수 포함 섹션"],
    "keyword_placement": ["키워드 배치 위치"],
    "differentiation_angle": "상위글과 차별화할 포인트",
    "tone_reference": "참고할 톤앤매너"
  }
}',
  '당신은 SEO 콘텐츠 분석가입니다. 네이버 블로그 상위 노출 글을 분석하여 공통 패턴을 도출하고 COPYWRITER에게 전달할 벤치마킹 브리프를 작성합니다. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.2, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 8. COPYWRITER / content_create_v2
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'COPYWRITER', 'content_create_v2', 'content_create_v2', '벤치마크 기반 콘텐츠 작성',
  '## 절대 규칙
1. 해요체 통일 (100%)
2. 2500자 이상
3. H2 섹션 4개 이상
4. 키워드 밀도 1.5~3% (제목, 첫문단, H2에 자연스럽게 배치)
5. 이미지 위치 지시 5개 이상 [이미지: 설명]
6. 금지 표현: "완벽한", "최고의", "강력 추천", "꼭 가보세요"
7. 비교표 또는 체크리스트 포함
8. AEO 대응: 질문-답변 구조 또는 FAQ 섹션 포함
9. 자연스러운 문체 — AI체 금지

## 브랜드 페르소나
{{brand_persona}}

## 타겟 키워드
키워드: {{keyword}}
콘텐츠 타입: {{content_type}}

## RND 벤치마킹 브리프
{{benchmark_brief}}

## 소스 자료
{{source_materials}}

## 위 데이터를 기반으로 블로그 글을 작성하세요.
제목은 키워드를 포함하되 자연스럽게.
본문은 해요체로 통일.
마지막에 해시태그 5~10개 추가.
메타 디스크립션(120~160자) 별도 작성.

## 응답 형식:
```
제목: [제목]

메타 디스크립션: [120~160자]

[본문 - HTML/마크다운]

해시태그: #태그1 #태그2 ...
```',
  '당신은 네이버 블로그 SEO 전문 카피라이터입니다. 브랜드 페르소나에 맞는 톤앤매너로, RND 벤치마킹 결과를 반영한 상위노출 최적화 콘텐츠를 작성합니다. 해요체를 사용하고, 자연스러운 문체를 유지하세요.',
  'claude-haiku-4-5-20251001', 0.7, 4000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 9. COPYWRITER / content_rewrite
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'COPYWRITER', 'content_rewrite', 'content_rewrite', 'QC 피드백 반영 재작성',
  '## 규칙
1. QC 피드백의 각 항목을 반드시 반영
2. 기존 글의 좋은 부분은 유지
3. 점수가 낮은 항목 집중 개선
4. 해요체 통일 / 금지 표현 제거 / 키워드 밀도 조정

## 원본 콘텐츠
제목: {{original_title}}
키워드: {{keyword}}

{{original_content}}

## QC 검수 결과
총점: {{qc_score}}/100
{{qc_feedback}}

## 개선 필요 항목
{{improvement_items}}

## 위 피드백을 반영하여 글을 재작성하세요.
원본의 구조와 흐름은 유지하되, QC 피드백의 각 항목을 개선합니다.

## 응답 형식:
```
제목: [수정된 제목]

메타 디스크립션: [120~160자]

[수정된 본문]

해시태그: #태그1 #태그2 ...

---
수정 사항:
- [수정1: 설명]
- [수정2: 설명]
```',
  '당신은 네이버 블로그 SEO 전문 카피라이터입니다. QC 검수 피드백을 반영하여 콘텐츠를 개선합니다. 원본의 좋은 부분은 유지하면서 점수가 낮은 항목을 집중 개선하세요.',
  'claude-haiku-4-5-20251001', 0.5, 4000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();

-- 10. QC / qc_review_v2
INSERT INTO agent_prompts (agent_type, task, prompt_section, title, content, system_prompt, model, temperature, max_tokens, is_active, version, updated_by) VALUES (
  'QC', 'qc_review_v2', 'qc_review_v2', '상세 검수 + AEO + 자연스러움 체크',
  '## 검수 항목 (100점 만점)

### 1. 글자수 (15점)
- 2500자 이상: 15점
- 2000~2499자: 10점
- 2000자 미만: 5점

### 2. 해요체 통일 (10점)
- 90% 이상: 10점
- 80~89%: 7점
- 80% 미만: 3점

### 3. 키워드 SEO (15점)
- 키워드 밀도 1.5~3%: 10점
- 제목에 키워드 포함: 2점
- 첫문단에 키워드 포함: 1점
- H2에 2회 이상 포함: 2점

### 4. H2 구조 (10점)
- 4개 이상: 10점
- 3개: 7점
- 2개 이하: 3점

### 5. 이미지 지시 (10점)
- 5개 이상: 10점
- 3~4개: 7점
- 2개 이하: 3점

### 6. 금지 표현 (10점)
- 0개: 10점
- 1~2개: 5점
- 3개 이상: 0점

### 7. AEO 최적화 (15점)
- 질문-답변 구조: 5점
- 구조화 리스트: 5점
- FAQ 섹션: 5점

### 8. 자연스러움 (10점)
- 자연스러움: 10점
- 부분 딱딱: 6점
- AI체: 2점

### 9. 메타 디스크립션 (5점)
- 120~160자 + 키워드 포함: 5점
- 부분 충족: 2점
- 없음: 0점

## 검수 대상
키워드: {{keyword}}
콘텐츠 타입: {{content_type}}
브랜드 페르소나: {{brand_persona}}

## 콘텐츠
{{content}}

## JSON으로만 응답하세요:
{
  "total_score": 0,
  "pass": true,
  "items": [
    {
      "name": "글자수",
      "score": 0,
      "max": 15,
      "detail": "현재 N자",
      "suggestion": "개선 제안"
    }
  ],
  "critical_issues": ["FAIL 사유 (있는 경우)"],
  "overall_feedback": "종합 피드백 2~3문장",
  "rewrite_needed": false,
  "rewrite_focus": ["재작성 시 집중할 항목"]
}',
  '당신은 SEO 콘텐츠 품질 검수 전문가입니다. 네이버 블로그 상위노출을 위한 9항목 100점 만점 검수를 수행합니다. 70점 미만이면 FAIL입니다. 객관적이고 정량적인 검수를 수행하세요. JSON으로만 응답하세요.',
  'claude-haiku-4-5-20251001', 0.1, 2000, true, 1, 'system'
)
ON CONFLICT (agent_type, task) DO UPDATE SET
  content = EXCLUDED.content,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();


-- ═══════════════════════════════════════════
-- 051: keywords 테이블 확장
-- ★ 수정: keywords 테이블 전용 constraint만 드롭
-- ═══════════════════════════════════════════

-- status CHECK 제약 변경 (기존 → suggested 추가)
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- keywords 테이블의 status 관련 CHECK 제약만 찾기 (pg_constraint + pg_class 조인)
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'keywords'
    AND con.contype = 'c'  -- CHECK constraint
    AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE keywords DROP CONSTRAINT ' || v_constraint_name;
  END IF;
END $$;

-- 새 CHECK 제약 추가 (IF NOT EXISTS 패턴)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'keywords'
      AND con.conname = 'keywords_status_check'
  ) THEN
    ALTER TABLE keywords ADD CONSTRAINT keywords_status_check
      CHECK (status IN ('active', 'paused', 'archived', 'queued', 'refresh', 'suggested'));
  END IF;
END $$;

-- metadata JSONB 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS metadata JSONB;

-- source 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';


-- ═══════════════════════════════════════════
-- 052: contents.metadata JSONB
-- ═══════════════════════════════════════════

ALTER TABLE contents ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_contents_metadata ON contents USING gin(metadata);

COMMENT ON COLUMN contents.metadata IS 'JSONB: qc_version, qc_score, qc_pass, qc_result, rewrite_count, rewrite_history, needs_manual_review, version 등';


-- ═══════════════════════════════════════════
-- 완료
-- ═══════════════════════════════════════════

COMMIT;

-- 검증 쿼리 (COMMIT 후 실행)
-- SELECT 'scoring_criteria' AS tbl, count(*) FROM scoring_criteria
-- UNION ALL SELECT 'agent_execution_logs', count(*) FROM agent_execution_logs
-- UNION ALL SELECT 'content_benchmarks', count(*) FROM content_benchmarks
-- UNION ALL SELECT 'agent_prompts (with task)', count(*) FROM agent_prompts WHERE task IS NOT NULL;
