-- 050_agent_prompts_seed.sql
-- 에이전트 프롬프트 10개 시딩
-- 컬럼: agent_type, task, prompt_section, title, content(user template), system_prompt, model, temperature, max_tokens, is_active, version

-- ═══════════════════════════════════════════
-- 1. CMO / brand_persona
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 2. RND / competitor_analysis
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 3. CMO / seo_diagnosis_comment
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 4. CMO / improvement_plan
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 5. CMO / keyword_strategy
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 6. RND / niche_keyword_expansion
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 7. RND / content_benchmark
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 8. COPYWRITER / content_create_v2
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 9. COPYWRITER / content_rewrite
-- ═══════════════════════════════════════════
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
);


-- ═══════════════════════════════════════════
-- 10. QC / qc_review_v2
-- ═══════════════════════════════════════════
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
);
