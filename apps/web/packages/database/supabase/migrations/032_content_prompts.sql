-- ================================================================
-- 032_content_prompts.sql
--
-- 콘텐츠 타입별 프롬프트 관리 테이블
-- content_type(list/review/info)별 시스템·유저 프롬프트를 DB에 저장
-- COPYWRITER 에이전트가 동적으로 로드하여 사용
--
-- 실행: psql $DATABASE_URL -f 032_content_prompts.sql
-- ================================================================

-- 1. content_prompts 테이블 생성
CREATE TABLE IF NOT EXISTS content_prompts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 콘텐츠 타입: list(추천형), review(리뷰형), info(정보형)
  content_type    TEXT        NOT NULL
                              CHECK (content_type IN ('list', 'review', 'info')),

  -- 프롬프트 구분: system(시스템 프롬프트), user(유저 프롬프트), common_rules(공통 규칙)
  prompt_type     TEXT        NOT NULL DEFAULT 'system'
                              CHECK (prompt_type IN ('system', 'user', 'common_rules')),

  -- 프롬프트 이름 (관리용)
  name            TEXT        NOT NULL,

  -- 프롬프트 본문 (마크다운/텍스트)
  prompt_text     TEXT        NOT NULL,

  -- 활성 여부 (비활성 시 사용 안 함)
  is_active       BOOLEAN     DEFAULT TRUE,

  -- 버전 관리
  version         INTEGER     DEFAULT 1,

  -- 메타 정보
  description     TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- content_type + prompt_type 복합 유니크 (같은 타입에 같은 종류 프롬프트 1개)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_prompts_type_unique
  ON content_prompts(content_type, prompt_type)
  WHERE is_active = TRUE;

-- 일반 인덱스
CREATE INDEX IF NOT EXISTS idx_content_prompts_type ON content_prompts(content_type);
CREATE INDEX IF NOT EXISTS idx_content_prompts_active ON content_prompts(is_active);

COMMENT ON TABLE content_prompts IS '콘텐츠 타입별 프롬프트 관리. COPYWRITER가 동적 로드.';
COMMENT ON COLUMN content_prompts.content_type IS 'list=추천형, review=리뷰형, info=정보형';
COMMENT ON COLUMN content_prompts.prompt_type IS 'system=시스템 프롬프트, user=유저 프롬프트, common_rules=공통 집필 규칙';

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_content_prompts_updated_at
  BEFORE UPDATE ON content_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE content_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON content_prompts
  FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);

-- 2. campaigns.content_type CHECK 제약 추가 (기존 컬럼, CHECK만 추가)
DO $$
BEGIN
  BEGIN
    ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_content_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_content_type_check
    CHECK (content_type IN ('list', 'review', 'info', 'single', 'special'));
END;
$$;

-- 3. contents.content_type CHECK 제약 갱신 (info 포함 확인)
DO $$
BEGIN
  BEGIN
    ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  ALTER TABLE contents
    ADD CONSTRAINT contents_content_type_check
    CHECK (content_type IN ('list', 'review', 'info', 'single', 'special'));
END;
$$;
