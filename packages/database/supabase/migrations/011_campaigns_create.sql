-- ================================================================
-- 011_campaigns_create.sql
--
-- campaigns 테이블 신규 생성
-- CMO 에이전트가 생성한 캠페인 전략의 영구 저장소.
-- jobs.campaign_id → campaigns.id 로 파이프라인 추적 가능.
--
-- 실행: psql $DATABASE_URL -f 011_campaigns_create.sql
-- ================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 최상위 귀속 단위
  client_id             UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- 연결된 타겟 키워드 (선택)
  keyword_id            UUID         REFERENCES keywords(id) ON DELETE SET NULL,

  -- 기본 정보
  title                 TEXT         NOT NULL DEFAULT '새 캠페인',
  strategy_brief        TEXT,                  -- CMO 전략 요약 (마크다운)

  -- 참조 콘텐츠 IDs (스타일 레퍼런스)
  reference_content_ids UUID[]       DEFAULT '{}',

  -- 타겟 플랫폼 및 상태
  target_platform       TEXT         DEFAULT 'naver'
                                     CHECK (target_platform IN ('naver', 'google', 'tistory', 'brunch', 'youtube', 'all')),
  status                TEXT         DEFAULT 'draft'
                                     CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),

  -- 예산 및 일정
  start_date            DATE,
  end_date              DATE,
  monthly_budget        NUMERIC(12,2),

  -- 성과 메트릭 (에이전트가 업데이트)
  total_contents        INTEGER      DEFAULT 0,
  published_contents    INTEGER      DEFAULT 0,
  avg_seo_score         NUMERIC(5,2),
  avg_rank_naver        NUMERIC(5,2),

  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  campaigns IS 'CMO 에이전트가 수립한 캠페인 전략. 모든 jobs/contents의 상위 기획 컨텍스트.';
COMMENT ON COLUMN campaigns.strategy_brief        IS 'CMO가 생성한 캠페인 전략 마크다운 문서';
COMMENT ON COLUMN campaigns.reference_content_ids IS '스타일 레퍼런스로 사용할 기존 콘텐츠 IDs';


-- 인덱스
CREATE INDEX IF NOT EXISTS idx_campaigns_client  ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_keyword ON campaigns(keyword_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status  ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);


-- jobs 테이블에 campaign_id 역참조 추가 (선택적 연결)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_campaign ON jobs(campaign_id);

COMMENT ON COLUMN jobs.campaign_id IS '이 Job이 속한 캠페인. NULL=단독 실행 Job.';


-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON campaigns
  FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);
