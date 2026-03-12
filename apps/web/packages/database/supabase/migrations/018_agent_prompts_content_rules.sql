-- ============================================================
-- 018_agent_prompts_content_rules.sql  [수정됨 2025-02-23]
-- COPYWRITER 콘텐츠 타입별 규칙 + CTA 규칙 시드 데이터
-- 컬럼명: prompt_section / title / content  (013 스키마 기준)
-- ============================================================

INSERT INTO agent_prompts (agent_type, prompt_section, title, content, is_active, version, updated_by)
VALUES
  -- list 타입: 비교/순위 콘텐츠
  (
    'COPYWRITER',
    'content_type',
    'list 타입 작성 규칙',
    '## 리스트형 콘텐츠 작성 규칙
- 제목에 "TOP N", "추천 N가지", "N선" 형식 사용
- 각 아이템을 마크다운 표(|항목|설명|가격|) 형식으로 정리
- 아이템별 장단점을 명시적으로 기재
- 총 아이템 수: 최소 5개 이상
- 결론 섹션에서 상황별 최적 선택지 제시
- 비교 표는 최소 1개 이상 포함 필수 (QC FAIL 기준)',
    TRUE, 1, 'system'
  ),
  -- review 타입: 체험/후기 콘텐츠
  (
    'COPYWRITER',
    'content_type',
    'review 타입 작성 규칙',
    '## 리뷰형 콘텐츠 작성 규칙
- 1인칭 시점 체험 서술 (저는, 제가, 직접)
- 구체적 수치/날짜/장소 포함 (예: 2024년 11월, 서울 강남구)
- 장점 3개 이상, 단점 2개 이상 균형 서술
- 사진/이미지 플레이스홀더 최소 8개
- 별점/점수 평가 섹션 포함 (예: 총점 4.2/5.0)
- 재방문 의향 또는 추천 여부 명시',
    TRUE, 1, 'system'
  ),
  -- special 타입: 기획/특집 콘텐츠
  (
    'COPYWRITER',
    'content_type',
    'special 기획형 작성 규칙',
    '## 스페셜 기획형 콘텐츠 작성 규칙
- 시의성 있는 이슈/트렌드 반영
- 전문가 인사이트 또는 데이터/통계 포함
- 인포그래픽형 데이터 표 최소 1개 포함
- 독자 행동 유도(CTA) 섹션 최소 2개
- 연관 콘텐츠 내부 링크 최소 2개 제안
- 글자 수: 최소 3,000자',
    TRUE, 1, 'system'
  ),
  -- single 타입: 표준 정보성 콘텐츠
  (
    'COPYWRITER',
    'content_type',
    'single 표준형 작성 규칙',
    '## 표준형 콘텐츠 작성 규칙
- 명확한 핵심 질문 → 답변 구조
- H2 섹션 4개 이상, H3 세부 항목 활용
- 글자 수: 최소 2,000자
- AI 요약 답변(200자 이내) 서두에 배치
- FAQ 섹션 3개 이상 포함
- Schema.org FAQ/Article JSON-LD 포함',
    TRUE, 1, 'system'
  ),
  -- info 타입: 정보/가이드 콘텐츠
  (
    'COPYWRITER',
    'content_type',
    'info 정보형 작성 규칙',
    '## 정보형 콘텐츠 작성 규칙
- 단계별 가이드 (Step 1, Step 2...) 형식 활용
- 주의사항/팁 박스(> 💡 팁:) 최소 2개
- 관련 용어 정의 섹션 포함
- 참고 자료/출처 섹션 마지막에 포함
- 글자 수: 최소 2,500자
- 독자 수준별 (초보/중급) 내용 구분',
    TRUE, 1, 'system'
  ),
  -- CTA 규칙
  (
    'COPYWRITER',
    'cta',
    'CTA 작성 규칙',
    '## CTA(행동 유도) 작성 규칙
- CTA는 콘텐츠 전체에서 최대 2회 이하
- 자연스러운 문맥에서 유도 (강매 표현 금지)
- 허용 CTA 형식: 내부 링크, 관련 글 추천, 뉴스레터 구독
- 금지 CTA: 구매 강요, 즉시 예약/신청 압박, 할인 만료 공포 유발
- 외부 URL은 반드시 rel="nofollow" 속성 권고 표기
- CTA 버튼/링크 텍스트: 동사형으로 (예: "자세히 알아보기", "무료 체험하기")',
    TRUE, 1, 'system'
  )
ON CONFLICT (agent_type, prompt_section, title, version) DO NOTHING;
