-- ================================================================
-- 005_entity_evolving_system.sql
-- 엔티티 중심 DB + 자기 진화형 R&D 시스템
--
-- 변경 사항:
--   1. ENUM 확장: agent_type에 RND,
--                 job_type에 NEWS_MONITOR·SEMANTIC_UPDATE 추가
--   2. brands          : 마케팅 대상 엔티티 (공식URL, SNS, 보도, E-E-A-T)
--   3. brand_relationships : 플랫폼(1) ↔ 입점업체(N) 관계
--   4. platform_master_guides : 플랫폼별 SEO/AEO 정석 가이드 (중앙 브레인)
--   5. evolving_knowledge : 에이전트 가설·결과 기록 (자기 진화)
--
-- 안전: IF NOT EXISTS / ADD VALUE IF NOT EXISTS → 기존 데이터 보존
-- ================================================================


-- ================================================================
-- PART 1: ENUM 확장
-- ================================================================

-- R&D 에이전트 (김연구원)
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'RND';

-- R&D 에이전트가 처리하는 Job 타입
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'NEWS_MONITOR';    -- 뉴스·보도자료 현황 체크
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'SEMANTIC_UPDATE'; -- 시맨틱 키워드 업데이트


-- ================================================================
-- PART 2: brands — 마케팅 대상 엔티티
--
-- 역할:
--   - clients(의뢰인) 하위에 실제 마케팅할 브랜드/장소/상품을 등록
--   - is_platform=TRUE : 여러 업체를 입점받는 플랫폼형 브랜드
--                        (예: 캠핑장 예약 앱 → 개별 캠핑장들이 서브 브랜드)
--   - schema_data      : JSON-LD 스키마 (Article, LocalBusiness, FAQ 등)
--   - eeat_signals     : E-E-A-T 신뢰도 시그널 (공신력 대시보드 기반)
-- ================================================================

CREATE TABLE IF NOT EXISTS brands (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id      UUID         REFERENCES clients(id) ON DELETE SET NULL,

  -- 기본 정보
  name           TEXT         NOT NULL,
  official_url   TEXT,
  description    TEXT,
  category       TEXT,        -- 업종 (예: '캠핑장', '글램핑', '호텔')

  -- 플랫폼 구조
  is_platform    BOOLEAN      DEFAULT FALSE,
    -- TRUE  : 플랫폼형 (입점 업체들이 brand_relationships로 연결)
    -- FALSE : 단일 브랜드 / 입점 업체

  -- SNS 채널 링크
  sns_links      JSONB        DEFAULT '{}'
    -- 예: {"instagram": "https://...", "youtube": "https://...", "blog": "https://..."}
  ,

  -- 보도자료 히스토리 (R&D 에이전트가 업데이트)
  press_history  JSONB        DEFAULT '[]'
    -- 예: [{"title": "...", "url": "...", "media": "뉴시스", "published_at": "2026-01-15"}]
  ,

  -- E-E-A-T 시그널 (CMO가 전략 수립 전 참고)
  eeat_signals   JSONB        DEFAULT '{}'
    -- 예: {
    --   "expertise":      {"level": "high", "evidence": ["전문 블로그 5년", "인증 보유"]},
    --   "authoritativeness": {"backlinks": 120, "press_count": 8},
    --   "trustworthiness":   {"reviews_avg": 4.7, "reviews_count": 230},
    --   "experience":     {"years": 10, "case_studies": 3}
    -- }
  ,

  -- Schema.org JSON-LD (박작가가 콘텐츠 작성 시 활용)
  entity_type    TEXT         DEFAULT 'Organization',
    -- Organization | LocalBusiness | Product | Person | Event
  schema_data    JSONB        DEFAULT '{}'
    -- 스키마 메타데이터. 박작가가 JSON-LD 블록 자동 생성 시 참조
  ,

  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE brands IS
  '마케팅 대상 엔티티. clients(의뢰인)와 분리하여 실제 마케팅할 브랜드/장소/상품을 별도 관리.
   AEO 최적화를 위한 E-E-A-T 시그널과 Schema.org 메타데이터를 보관.';

COMMENT ON COLUMN brands.is_platform IS
  'TRUE이면 플랫폼형 브랜드. brand_relationships로 입점 업체(sub_brand)와 연결됨.';

COMMENT ON COLUMN brands.eeat_signals IS
  'Google E-E-A-T 신뢰도 시그널. CMO가 전략 수립 시 공신력 현황을 파악하고 외부 노출 전략을 결정.';

COMMENT ON COLUMN brands.press_history IS
  '보도자료 히스토리. R&D 에이전트(김연구원)가 매일 체크하여 부족 시 슬랙 알림 발송.';

COMMENT ON COLUMN brands.schema_data IS
  'Schema.org 메타데이터. 박작가(COPYWRITER)가 JSON-LD 자동 생성 시 isPartOf, LocalBusiness 등에 활용.';


-- ================================================================
-- PART 3: brand_relationships — 플랫폼 ↔ 입점업체 관계
--
-- 예시:
--   캠핑예약앱(platform) → [캠핑월드, 글램핑파크, 오토캠핑장A] (tenant)
-- ================================================================

CREATE TABLE IF NOT EXISTS brand_relationships (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_brand_id  UUID    NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  sub_brand_id       UUID    NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  relationship_type  TEXT    DEFAULT 'tenant'
                             CHECK (relationship_type IN ('tenant', 'partner', 'affiliate')),
    -- tenant    : 플랫폼에 입점한 업체
    -- partner   : 제휴 파트너
    -- affiliate : 계열사
  created_at         TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform_brand_id, sub_brand_id)
);

COMMENT ON TABLE brand_relationships IS
  '플랫폼 브랜드(is_platform=TRUE)와 서브 브랜드(입점업체) 1:N 관계.
   Schema.org isPartOf 관계 정의에 활용됨.';


-- ================================================================
-- PART 4: platform_master_guides — 중앙 브레인 (플랫폼별 정석 가이드)
--
-- 역할:
--   - R&D 에이전트(김연구원)가 최신 알고리즘 변화를 탐지하면 업데이트
--   - CMO(김이사)가 전략 수립 전 반드시 조회하여 박작가에게 주입
--   - 박작가가 콘텐츠 작성 시 참고
-- ================================================================

CREATE TABLE IF NOT EXISTS platform_master_guides (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 가이드 분류
  platform     TEXT    NOT NULL,
    -- NAVER_BLOG | TISTORY | GOOGLE | CHATGPT | PERPLEXITY | GEMINI | INSTAGRAM
  guide_type   TEXT    NOT NULL
               CHECK (guide_type IN ('SEO', 'AEO', 'GEO', 'E-E-A-T', 'ALGORITHM')),
  version      TEXT    DEFAULT '1.0',
  title        TEXT    NOT NULL,

  -- 가이드 본문
  content      TEXT,               -- 마크다운 형식의 상세 가이드
  key_signals  JSONB   DEFAULT '{}',
    -- 핵심 알고리즘 시그널 요약
    -- 예: {"must_include": ["AI 요약 답변 상단 배치", "단정적 문장"],
    --       "avoid": ["중복 콘텐츠", "키워드 남용"],
    --       "schema_required": ["Article", "FAQ"]}

  -- 관리 메타데이터
  updated_by   TEXT    DEFAULT 'SYSTEM',  -- 'SYSTEM' | 'RND' | 사용자 ID
  is_active    BOOLEAN DEFAULT TRUE,

  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform, guide_type, version)
);

COMMENT ON TABLE platform_master_guides IS
  '플랫폼별 SEO/AEO 정석 가이드. 중앙 브레인 역할.
   R&D 에이전트가 알고리즘 변화 감지 시 업데이트 → CMO가 조회 → 박작가에게 주입.';

COMMENT ON COLUMN platform_master_guides.key_signals IS
  '핵심 알고리즘 시그널 요약 JSON. CMO가 콘텐츠 지침 구성 시 직접 참조.';


-- ================================================================
-- PART 5: evolving_knowledge — 자기 진화 기록소
--
-- 역할:
--   - 에이전트의 가설(Hypothesis) → 실행(Action) → 결과(Outcome) 기록
--   - 성과 저조 시 원인 분석 후 여기에 피드백 저장
--   - R&D 에이전트가 정기적으로 읽어 전략 개선에 활용
-- ================================================================

CREATE TABLE IF NOT EXISTS evolving_knowledge (
  id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 주체
  agent_type         agent_type    NOT NULL,
  job_id             UUID          REFERENCES jobs(id) ON DELETE SET NULL,
  client_id          UUID          REFERENCES clients(id) ON DELETE SET NULL,
  brand_id           UUID          REFERENCES brands(id) ON DELETE SET NULL,

  -- 가설-실행-결과 사이클
  hypothesis         TEXT          NOT NULL,
    -- 예: "경쟁도 LOW 키워드에 2000자 이상 콘텐츠를 발행하면 2주 내 상위 10위 진입 가능"
  action             TEXT,
    -- 예: "캠핑장 추천 키워드로 2200자 블로그 포스트 발행 (2026-02-10)"
  outcome            TEXT,
    -- 예: "7일 후 PC 13위, MO 8위. 2주 후 PC 7위, MO 5위로 상승"
  performance_delta  JSONB         DEFAULT '{}',
    -- 수치 변화: {"rank_change": -6, "views_change": +340, "period_days": 14}

  -- 검증 결과
  verdict            TEXT          DEFAULT 'pending'
                     CHECK (verdict IN ('confirmed', 'rejected', 'pending')),

  -- 태그 (검색/필터용)
  tags               TEXT[]        DEFAULT '{}',
    -- 예: ["SEO", "long-form", "low-competition", "naver-blog"]

  created_at         TIMESTAMPTZ   DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE evolving_knowledge IS
  '에이전트 자기 진화 기록소. 가설→실행→결과 사이클을 누적하여 전략을 스스로 개선.
   성과 저조 콘텐츠는 ANALYST가 원인 분석 후 여기에 피드백을 저장.';

COMMENT ON COLUMN evolving_knowledge.verdict IS
  'confirmed: 가설 검증됨 (재사용) | rejected: 가설 기각 (반면교사) | pending: 검증 중';


-- ================================================================
-- PART 6: 인덱스
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_brands_client        ON brands(client_id);
CREATE INDEX IF NOT EXISTS idx_brands_workspace     ON brands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brands_is_platform   ON brands(is_platform) WHERE is_platform = TRUE;

CREATE INDEX IF NOT EXISTS idx_brand_rel_platform   ON brand_relationships(platform_brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_rel_sub        ON brand_relationships(sub_brand_id);

CREATE INDEX IF NOT EXISTS idx_pmg_platform_type    ON platform_master_guides(platform, guide_type);
CREATE INDEX IF NOT EXISTS idx_pmg_active           ON platform_master_guides(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ek_agent_client      ON evolving_knowledge(agent_type, client_id);
CREATE INDEX IF NOT EXISTS idx_ek_verdict           ON evolving_knowledge(verdict, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ek_brand             ON evolving_knowledge(brand_id);


-- ================================================================
-- PART 7: updated_at 트리거
-- ================================================================

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pmg_updated_at
  BEFORE UPDATE ON platform_master_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ek_updated_at
  BEFORE UPDATE ON evolving_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- PART 8: RLS
-- ================================================================

ALTER TABLE brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_master_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolving_knowledge  ENABLE ROW LEVEL SECURITY;

-- brands: 워크스페이스 멤버 접근
CREATE POLICY "workspace_access" ON brands FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = brands.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- brand_relationships: platform_brand 기준 workspace 체크
CREATE POLICY "workspace_access" ON brand_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands b
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = brand_relationships.platform_brand_id
        AND wm.user_id = auth.uid()
    )
  );

-- platform_master_guides: 전 워크스페이스 공유 (읽기 전용)
CREATE POLICY "all_authenticated_read" ON platform_master_guides FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_role_write" ON platform_master_guides FOR ALL
  USING (TRUE);  -- Service Role Key(에이전트)만 쓰기 가능

-- evolving_knowledge: 고객사 기준 workspace 체크
CREATE POLICY "workspace_access" ON evolving_knowledge FOR ALL
  USING (
    client_id IS NULL
    OR EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = evolving_knowledge.client_id
        AND wm.user_id = auth.uid()
    )
  );


-- ================================================================
-- PART 9: 초기 데이터 — 플랫폼 마스터 가이드 (Naver Blog AEO)
-- ================================================================

INSERT INTO platform_master_guides
  (platform, guide_type, version, title, content, key_signals, updated_by)
VALUES
  (
    'NAVER_BLOG', 'AEO', '1.0',
    '네이버 블로그 AEO 정석 가이드 v1.0',
    E'# 네이버 블로그 AEO (Answer Engine Optimization) 가이드\n\n'
    '## 핵심 원칙\n'
    '1. **AI 요약 답변 최우선**: 상단 200자 이내에 핵심 답변을 단정적 문장으로 배치\n'
    '2. **구조화된 정보**: 마크다운 표·리스트를 적극 활용하여 AI가 파싱하기 쉽게\n'
    '3. **단정적 문장**: "A는 B이다" 형식 사용 — "~것 같다", "~수 있다" 지양\n'
    '4. **FAQ 섹션**: 본문 하단에 사용자 질문 5개 이상 + 명확한 답변\n'
    '5. **JSON-LD 스키마**: Article + FAQ + (해당 시) LocalBusiness 스키마 필수\n\n'
    '## 금지 사항\n'
    '- 키워드 반복 남용 (3회 초과 금지)\n'
    '- 중복 콘텐츠 (유사도 0.3 이하 유지)\n'
    '- 불명확한 문장 ("아마도", "~것 같습니다")',
    '{
      "must_include": ["AI 요약 답변(상단 200자)", "단정적 문장", "마크다운 표/리스트", "FAQ 섹션(5개 이상)"],
      "schema_required": ["Article", "FAQPage"],
      "schema_optional": ["LocalBusiness", "Organization"],
      "target_length_min": 1500,
      "avoid": ["키워드 남용(3회 초과)", "중복 콘텐츠", "모호한 표현"]
    }',
    'SYSTEM'
  ),
  (
    'NAVER_BLOG', 'SEO', '1.0',
    '네이버 블로그 SEO 정석 가이드 v1.0',
    E'# 네이버 블로그 SEO 가이드\n\n'
    '## 상위노출 핵심 요소\n'
    '1. **제목**: 핵심 키워드 앞배치, 30자 이내\n'
    '2. **본문 길이**: 1,500자 이상 (경쟁 HIGH: 2,500자+)\n'
    '3. **이미지**: 최소 3장, 대표 이미지 키워드 포함 파일명\n'
    '4. **발행 시간**: 오전 7-9시, 오후 7-9시 권장\n'
    '5. **blog_score**: 높은 점수 계정으로 경쟁 키워드 공략',
    '{
      "title_keyword_position": "앞배치",
      "min_length": 1500,
      "high_competition_length": 2500,
      "image_min": 3,
      "best_publish_hours": ["07:00-09:00", "19:00-21:00"],
      "avoid": ["동일 키워드 과다 반복", "복사 붙여넣기"]
    }',
    'SYSTEM'
  ),
  (
    'CHATGPT', 'AEO', '1.0',
    'ChatGPT 인용 최적화 가이드 v1.0',
    E'# ChatGPT/AI 검색 인용 최적화 가이드\n\n'
    '## AI 인용 유도 원칙\n'
    '1. **권위 있는 출처 인용**: 공식 자료·연구 결과 참조\n'
    '2. **수치 중심 문장**: "A는 B% 효과가 있다" 형식\n'
    '3. **Entity 명확화**: 브랜드/장소명을 공식 명칭으로 일관 사용\n'
    '4. **isPartOf 관계**: 소속/입점 관계를 명시적으로 언급\n'
    '5. **전문가 관점**: E-E-A-T 기반 전문 지식 표현',
    '{
      "must_include": ["수치 근거", "공식 명칭", "전문가 관점"],
      "entity_clarity": "브랜드/장소명 공식명 일관 사용",
      "relationship_mention": "isPartOf 관계 명시",
      "avoid": ["모호한 일반론", "출처 없는 주장"]
    }',
    'SYSTEM'
  )
ON CONFLICT (platform, guide_type, version) DO NOTHING;


-- ================================================================
-- 실행 확인 쿼리
-- ================================================================

-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('brands', 'brand_relationships', 'platform_master_guides', 'evolving_knowledge');

-- SELECT platform, guide_type, title FROM platform_master_guides ORDER BY platform, guide_type;
