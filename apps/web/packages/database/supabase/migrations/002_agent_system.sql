-- ================================================================
-- 002_agent_system.sql
-- 통합 스키마: N_SERP + AI 마케팅 대행사 오퍼레이션 시스템
--
-- 실행 대상: ai-marketer Supabase (jvcyefuaegxurdctcztc)
-- 전제 조건: 001_initial_schema.sql 실행 완료
--   - uuid_generate_v4() 함수 사용 가능
--   - update_updated_at_column() 함수 정의됨
--   - users, workspaces 테이블 존재
-- ================================================================


-- ================================================================
-- PART 0: 기존 객체 정리 (멱등성 보장)
-- 이전 실행에서 부분적으로 생성된 테이블/타입을 모두 제거하고 새로 시작
-- CASCADE: 의존하는 인덱스, 트리거, 제약 조건도 함께 삭제
-- ================================================================

-- 테이블 DROP (FK 의존성 역순)
DROP TABLE IF EXISTS reports        CASCADE;
DROP TABLE IF EXISTS metrics        CASCADE;
DROP TABLE IF EXISTS agent_logs     CASCADE;
DROP TABLE IF EXISTS jobs           CASCADE;
DROP TABLE IF EXISTS serp_results   CASCADE;
DROP TABLE IF EXISTS contents       CASCADE;
DROP TABLE IF EXISTS keywords       CASCADE;
DROP TABLE IF EXISTS accounts       CASCADE;
DROP TABLE IF EXISTS clients        CASCADE;
DROP TABLE IF EXISTS settings       CASCADE;

-- ENUM 타입 DROP
DROP TYPE IF EXISTS gate_result     CASCADE;
DROP TYPE IF EXISTS job_status      CASCADE;
DROP TYPE IF EXISTS job_type        CASCADE;
DROP TYPE IF EXISTS agent_type      CASCADE;


-- ================================================================
-- PART 1: ENUM 타입
-- ================================================================

CREATE TYPE agent_type AS ENUM (
  'CMO',              -- 전략 총괄: 캠페인 기획, 우선순위, 최종 승인
  'COPYWRITER',       -- 콘텐츠 생성: SEO/AEO/GEO 본문 작성
  'DESIGNER',         -- 비주얼 에셋: 이미지/영상 가이드
  'OPS_QUALITY',      -- 품질 게이트: 유사도/SEO 검수
  'OPS_PUBLISHER',    -- 발행: 고정 IP 매핑 후 플랫폼 게시
  'ANALYST_SERP',     -- 분석: 순위 추적 (N_SERP + 구글/AI 확장)
  'ANALYST_REPORT',   -- 분석: 성과 리포트 자동 생성
  'SYSTEM'            -- 시스템: 스케줄러, 자동 트리거
);

CREATE TYPE job_type AS ENUM (
  'CAMPAIGN_PLAN',    -- CMO: 캠페인 전략 수립
  'CONTENT_CREATE',   -- COPYWRITER: 본문/대본 작성
  'CONTENT_DESIGN',   -- DESIGNER: 이미지 가이드 생성
  'QUALITY_CHECK',    -- OPS_QUALITY: 품질 검수
  'PUBLISH',          -- OPS_PUBLISHER: 플랫폼 발행
  'SERP_CHECK',       -- ANALYST_SERP: 키워드 순위 체크
  'REPORT_GENERATE'   -- ANALYST_REPORT: 성과 리포트 생성
);

CREATE TYPE job_status AS ENUM (
  'PENDING',          -- 대기 (에이전트 픽업 전)
  'IN_PROGRESS',      -- 에이전트 처리 중
  'WAITING_REVIEW',   -- 품질 검수 대기
  'APPROVED',         -- 승인됨
  'FAILED',           -- 실패 (retry_count < max_retries 시 재시도)
  'DONE',             -- 완료
  'CANCELLED'         -- 취소
);

CREATE TYPE gate_result AS ENUM (
  'PENDING',          -- 검수 전
  'PASS',             -- 통과
  'FAIL'              -- 탈락 (quality_gate_notes에 사유 기록)
);


-- ================================================================
-- PART 2: CLIENTS 고객사
-- workspaces(대행사 내부팀) 하위에 대행사가 관리하는 고객사
-- ================================================================

CREATE TABLE clients (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  company_name     TEXT         NOT NULL,
  contact_email    TEXT,
  contact_phone    TEXT,
  contract_type    TEXT         DEFAULT 'monthly'
                                CHECK (contract_type IN ('monthly', 'annual', 'project')),
  contract_start   DATE,
  contract_end     DATE,
  monthly_budget   NUMERIC(12, 2),
  status           TEXT         DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive', 'churned')),
  notes            TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  clients IS '대행사가 관리하는 고객사. 모든 N_SERP 운영 데이터의 최상위 귀속 단위.';


-- ================================================================
-- PART 3: ACCOUNTS 블로그 계정 (N_SERP 기반 + 확장)
--
-- N_SERP 원본: id, name(UNIQUE), platform, url,
--              blog_score, daily_publish_limit
-- 확장: client_id, fixed_ip, vpn_profile, proxy_config,
--        daily_published, count_reset_date, status, ban_reason
-- ================================================================

CREATE TABLE accounts (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- [N_SERP 원본 컬럼]
  name                 TEXT         NOT NULL UNIQUE,
  platform             TEXT         NOT NULL DEFAULT 'naver'
                                    CHECK (platform IN (
                                      'naver', 'tistory', 'brunch',
                                      'google', 'wordpress', 'youtube'
                                    )),
  url                  TEXT,
  blog_score           INTEGER      DEFAULT 0,
  daily_publish_limit  INTEGER      DEFAULT 2,

  -- [확장: 에이전트 시스템]
  client_id            UUID         REFERENCES clients(id) ON DELETE SET NULL,
  fixed_ip             TEXT,        -- 전용 Egress IP (플랫폼 차단 방지)
  vpn_profile          TEXT,
  proxy_config         JSONB        DEFAULT '{}',
  daily_published      INTEGER      DEFAULT 0,
  count_reset_date     DATE         DEFAULT CURRENT_DATE,
  status               TEXT         DEFAULT 'active'
                                    CHECK (status IN ('active', 'suspended', 'banned', 'cooling')),
  ban_reason           TEXT,

  -- [N_SERP 원본 컬럼]
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  accounts IS 'N_SERP accounts 확장. fixed_ip로 계정:IP=1:1 매핑, 플랫폼 차단 위험 최소화.';
COMMENT ON COLUMN accounts.client_id IS 'NULL = 마이그레이션 전 N_SERP 레거시 계정';


-- ================================================================
-- PART 4: KEYWORDS 키워드 (N_SERP 기반 + 확장)
--
-- N_SERP 원본: id, keyword(UNIQUE 전역), sub_keyword,
--              monthly_search_pc/mo/total, competition,
--              mobile_ratio, difficulty_score, opportunity_score
-- 변경: 전역 UNIQUE(keyword) → 부분 인덱스로 멀티클라이언트 지원
-- 확장: client_id, is_tracking, priority, last_checked_at
-- ================================================================

CREATE TABLE keywords (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- [N_SERP 원본 컬럼]
  keyword               TEXT         NOT NULL,
  sub_keyword           TEXT,
  monthly_search_pc     INTEGER      DEFAULT 0,
  monthly_search_mo     INTEGER      DEFAULT 0,
  monthly_search_total  INTEGER      DEFAULT 0,
  competition           TEXT         DEFAULT '알 수 없음',
  mobile_ratio          FLOAT        DEFAULT 0,
  difficulty_score      FLOAT        DEFAULT 50,
  opportunity_score     FLOAT        DEFAULT 50,

  -- [확장: 에이전트 시스템]
  client_id             UUID         REFERENCES clients(id) ON DELETE SET NULL,
  is_tracking           BOOLEAN      DEFAULT TRUE,
  priority              TEXT         DEFAULT 'medium'
                                     CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  last_checked_at       TIMESTAMPTZ,

  -- [N_SERP 원본 컬럼]
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

-- client_id=NULL(레거시)일 때 keyword 유일 보장
CREATE UNIQUE INDEX idx_keywords_unique_legacy
  ON keywords(keyword) WHERE client_id IS NULL;

-- client_id 지정 시 (client_id, keyword) 유일 보장
CREATE UNIQUE INDEX idx_keywords_unique_client
  ON keywords(client_id, keyword) WHERE client_id IS NOT NULL;

COMMENT ON TABLE  keywords IS 'N_SERP keywords 확장. client_id로 고객사별 키워드 관리 + 플랫폼 확장 지원.';


-- ================================================================
-- PART 5: CONTENTS 콘텐츠 (N_SERP 기반 + 확장)
--
-- N_SERP 원본: id, keyword_id, account_id, url, title,
--              published_date, is_active, camfit_link, source_file
-- 확장: job_id, client_id, content_type, body, meta_description,
--        tags, image_urls, seo_score, similarity_score, quality_score,
--        word_count, publish_status, rejection_reason, generated_by
-- ================================================================

CREATE TABLE contents (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- [N_SERP 원본 컬럼]
  keyword_id        UUID         NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  account_id        UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  url               TEXT,
  title             TEXT,
  published_date    DATE,
  is_active         BOOLEAN      DEFAULT TRUE,   -- N_SERP: 순위 추적 활성 여부
  camfit_link       BOOLEAN      DEFAULT FALSE,  -- N_SERP 전용
  source_file       TEXT,                        -- N_SERP 전용

  -- [확장: 에이전트 시스템]
  job_id            UUID,        -- 하단 ALTER TABLE로 FK 추가 (jobs 테이블 생성 후)
  client_id         UUID         REFERENCES clients(id) ON DELETE SET NULL,
  content_type      TEXT         DEFAULT 'blog_post'
                                 CHECK (content_type IN (
                                   'blog_post', 'short_form', 'video_script',
                                   'image_guide', 'report'
                                 )),
  body              TEXT,                        -- COPYWRITER 에이전트가 생성한 본문
  meta_description  TEXT,
  tags              TEXT[],
  image_urls        TEXT[],
  seo_score         NUMERIC(5, 2),
  similarity_score  NUMERIC(5, 2),   -- 유사도 (0~1, 낮을수록 독창적)
  quality_score     NUMERIC(5, 2),
  word_count        INTEGER,
  publish_status    TEXT         DEFAULT 'draft'
                                 CHECK (publish_status IN (
                                   'draft', 'review', 'approved',
                                   'published', 'rejected', 'archived'
                                 )),
  rejection_reason  TEXT,
  generated_by      TEXT         DEFAULT 'human',

  -- [N_SERP 원본 컬럼]
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW(),

  UNIQUE(keyword_id, url)   -- N_SERP 호환: 같은 키워드에 같은 URL 중복 방지
);

COMMENT ON TABLE  contents IS 'N_SERP contents 확장. 에이전트 생성 본문(body)과 N_SERP 발행 URL을 통합 관리.';
COMMENT ON COLUMN contents.is_active      IS 'N_SERP 호환: TRUE=순위 추적 중, FALSE=미노출로 추적 중단';
COMMENT ON COLUMN contents.publish_status IS '에이전트 워크플로우 상태. N_SERP 수동 등록 콘텐츠는 published로 초기화';
COMMENT ON COLUMN contents.similarity_score IS '0.3 이하 시 품질 게이트 PASS. OPS_QUALITY 에이전트가 기록.';


-- ================================================================
-- PART 6: SERP_RESULTS 순위 결과 (N_SERP 기반 + 멀티플랫폼 확장)
--
-- N_SERP 원본: id, content_id, device(PC/MO), rank, rank_change,
--              is_exposed, captured_at, created_at
-- 확장: search_platform (네이버/구글/AI 검색 구분),
--        is_cited, citation_url, citation_snippet (AI 인용 추적)
--
-- 에이전트 쿼리 예시:
--   SELECT * FROM serp_results
--   WHERE search_platform = 'NAVER_SERP' AND device = 'PC'
--     AND captured_at = CURRENT_DATE;
-- ================================================================

CREATE TABLE serp_results (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- [N_SERP 원본 컬럼]
  content_id       UUID         NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  device           TEXT         NOT NULL DEFAULT 'PC'
                                CHECK (device IN ('PC', 'MO', 'WEB')),
                                -- PC/MO: 네이버 전용 | WEB: 구글/AI 검색
  rank             INTEGER,     -- NULL = 미노출
  rank_change      INTEGER      DEFAULT 0,
  is_exposed       BOOLEAN      DEFAULT FALSE,

  -- [확장: 멀티플랫폼]
  search_platform  TEXT         NOT NULL DEFAULT 'NAVER_SERP'
                                CHECK (search_platform IN (
                                  'NAVER_SERP',
                                  'GOOGLE_SERP',
                                  'PERPLEXITY',
                                  'CHATGPT',
                                  'GEMINI'
                                )),
  is_cited         BOOLEAN      DEFAULT FALSE,
  citation_url     TEXT,
  citation_snippet TEXT,        -- AI가 우리 콘텐츠를 인용한 문장

  -- [N_SERP 원본 컬럼]
  captured_at      DATE         DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- N_SERP 원본 유니크 인덱스를 멀티플랫폼 포함으로 확장
CREATE UNIQUE INDEX idx_serp_unique
  ON serp_results(content_id, device, search_platform, captured_at);

COMMENT ON TABLE  serp_results IS 'N_SERP serp_results 확장. search_platform으로 구글/AI 검색 인용까지 통합 추적.';
COMMENT ON COLUMN serp_results.device IS 'PC/MO: 네이버 전용 | WEB: 구글/AI 검색 시 사용';
COMMENT ON COLUMN serp_results.citation_snippet IS 'AEO/GEO 성과 지표. AI 검색이 우리 글을 인용한 문장 발췌.';


-- ================================================================
-- PART 7: SETTINGS 시스템 설정 (N_SERP 형식으로 통합)
-- N_SERP 원본 구조 채택: id UUID + key TEXT UNIQUE
-- ================================================================

CREATE TABLE settings (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  key          TEXT         NOT NULL UNIQUE,
  value        JSONB        NOT NULL DEFAULT '{}',
  description  TEXT,
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE settings IS 'N_SERP 설정 + 에이전트 시스템 설정 통합. key로 구분하여 단일 테이블 관리.';


-- ================================================================
-- PART 8: JOBS 작업 현황 (신규 - 에이전트 중앙 이벤트 버스)
-- ================================================================

CREATE TABLE jobs (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id            UUID         REFERENCES clients(id) ON DELETE SET NULL,
  parent_job_id        UUID         REFERENCES jobs(id) ON DELETE SET NULL,
  job_type             job_type     NOT NULL,
  title                TEXT         NOT NULL,
  priority             TEXT         DEFAULT 'medium'
                                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assigned_agent       agent_type   NOT NULL,
  triggered_by         agent_type   DEFAULT 'SYSTEM',
  trigger_type         TEXT         DEFAULT 'USER'
                                    CHECK (trigger_type IN ('USER', 'SCHEDULER', 'AGENT')),
  status               job_status   DEFAULT 'PENDING',
  input_payload        JSONB        DEFAULT '{}',
  output_payload       JSONB        DEFAULT '{}',
  quality_gate_result  gate_result  DEFAULT 'PENDING',
  quality_gate_score   NUMERIC(5, 2),
  quality_gate_notes   TEXT,
  retry_count          INTEGER      DEFAULT 0,
  max_retries          INTEGER      DEFAULT 3,
  error_message        TEXT,
  deadline             TIMESTAMPTZ,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  jobs IS '에이전트 간 통신의 중심축. status 변화 → Realtime → 다음 에이전트 트리거.';
COMMENT ON COLUMN jobs.input_payload  IS '에이전트가 픽업 시 읽는 작업 지시 JSON (AGENT_PROTOCOL.md 참고)';
COMMENT ON COLUMN jobs.output_payload IS '에이전트가 완료 후 기록하는 결과 JSON';

-- contents.job_id FK: jobs 테이블 생성 후 추가
ALTER TABLE contents
  ADD CONSTRAINT fk_contents_job
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;


-- ================================================================
-- PART 9: AGENT_LOGS 에이전트 활동 로그 (신규)
-- ================================================================

CREATE TABLE agent_logs (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID         REFERENCES jobs(id) ON DELETE SET NULL,
  agent_type   agent_type   NOT NULL,
  action       TEXT         NOT NULL,
  -- 표준 action 값:
  -- JOB_PICKED_UP | CONTENT_GENERATED | QUALITY_PASSED | QUALITY_FAILED
  -- PUBLISH_SUCCESS | PUBLISH_FAILED   | SERP_CHECKED   | REPORT_SENT
  status       TEXT         DEFAULT 'info'
               CHECK (status IN ('info', 'success', 'warning', 'error')),
  message      TEXT,
  metadata     JSONB        DEFAULT '{}',
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE agent_logs IS '에이전트 활동 감사 로그. 대시보드 실시간 피드 + 장애 추적에 사용.';


-- ================================================================
-- PART 10: METRICS 성과 지표 (신규)
-- ================================================================

CREATE TABLE metrics (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content_id   UUID         REFERENCES contents(id) ON DELETE SET NULL,
  keyword_id   UUID         REFERENCES keywords(id) ON DELETE SET NULL,
  platform     TEXT         NOT NULL,
  metric_type  TEXT         NOT NULL
               CHECK (metric_type IN (
                 'IMPRESSIONS', 'CLICKS', 'VIEWS', 'UNIQUE_VISITORS',
                 'AVERAGE_RANK', 'CITATIONS', 'SHARES', 'CTR'
               )),
  value        NUMERIC      NOT NULL DEFAULT 0,
  date         DATE         NOT NULL DEFAULT CURRENT_DATE,
  source       TEXT         DEFAULT 'auto'
               CHECK (source IN ('auto', 'manual')),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(content_id, platform, metric_type, date)
);

COMMENT ON TABLE metrics IS 'ANALYST 에이전트가 수집하는 일별 성과 지표. 리포트 생성 시 집계 소스.';


-- ================================================================
-- PART 11: REPORTS 리포트 (신규)
-- ================================================================

CREATE TABLE reports (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  job_id        UUID         REFERENCES jobs(id) ON DELETE SET NULL,
  report_type   TEXT         NOT NULL
                             CHECK (report_type IN ('weekly', 'monthly', 'campaign', 'ad_hoc')),
  title         TEXT,
  period_start  DATE,
  period_end    DATE,
  summary       JSONB        DEFAULT '{}',
  report_data   JSONB        DEFAULT '{}',
  report_url    TEXT,
  status        TEXT         DEFAULT 'draft'
                             CHECK (status IN ('draft', 'published', 'sent')),
  sent_at       TIMESTAMPTZ,
  generated_by  agent_type   DEFAULT 'ANALYST_REPORT',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'ANALYST_REPORT 에이전트가 자동 생성. summary JSONB가 대시보드 KPI 카드 데이터 소스.';


-- ================================================================
-- PART 12: 인덱스
-- ================================================================

-- clients
CREATE INDEX idx_clients_workspace  ON clients(workspace_id);
CREATE INDEX idx_clients_status     ON clients(status);

-- accounts (N_SERP 원본 인덱스 포함)
CREATE INDEX idx_accounts_name      ON accounts(name);
CREATE INDEX idx_accounts_client    ON accounts(client_id);
CREATE INDEX idx_accounts_platform  ON accounts(platform);
CREATE INDEX idx_accounts_status    ON accounts(status);

-- keywords (N_SERP 원본 인덱스 포함)
CREATE INDEX idx_keywords_search_volume ON keywords(monthly_search_total DESC);
CREATE INDEX idx_keywords_client        ON keywords(client_id);
CREATE INDEX idx_keywords_tracking      ON keywords(is_tracking) WHERE is_tracking = TRUE;

-- contents (N_SERP 원본 인덱스 포함)
CREATE INDEX idx_contents_keyword   ON contents(keyword_id);
CREATE INDEX idx_contents_account   ON contents(account_id);
CREATE INDEX idx_contents_active    ON contents(is_active);
CREATE INDEX idx_contents_url       ON contents(url);
CREATE INDEX idx_contents_client    ON contents(client_id);
CREATE INDEX idx_contents_job       ON contents(job_id);
CREATE INDEX idx_contents_status    ON contents(publish_status);

-- serp_results (N_SERP 원본 인덱스 포함)
CREATE INDEX idx_serp_content        ON serp_results(content_id);
CREATE INDEX idx_serp_captured       ON serp_results(captured_at DESC);
CREATE INDEX idx_serp_device         ON serp_results(device);
CREATE INDEX idx_serp_platform       ON serp_results(search_platform);
CREATE INDEX idx_serp_platform_date  ON serp_results(search_platform, captured_at DESC);

-- jobs (에이전트 폴링 핵심 인덱스)
CREATE INDEX idx_jobs_status         ON jobs(status);
CREATE INDEX idx_jobs_assigned_agent ON jobs(assigned_agent);
CREATE INDEX idx_jobs_client         ON jobs(client_id);
CREATE INDEX idx_jobs_created_at     ON jobs(created_at DESC);
CREATE INDEX idx_jobs_parent         ON jobs(parent_job_id);
-- 특정 에이전트의 PENDING Job만 빠르게 조회
CREATE INDEX idx_jobs_agent_pending
  ON jobs(assigned_agent, status) WHERE status = 'PENDING';

-- agent_logs
CREATE INDEX idx_agent_logs_job     ON agent_logs(job_id);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_agent   ON agent_logs(agent_type);

-- metrics, reports
CREATE INDEX idx_metrics_client     ON metrics(client_id);
CREATE INDEX idx_metrics_date       ON metrics(date DESC);
CREATE INDEX idx_reports_client     ON reports(client_id);


-- ================================================================
-- PART 13: updated_at 자동 갱신 트리거
-- 001에서 정의한 update_updated_at_column() 함수 재사용
-- ================================================================

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- PART 14: Supabase Realtime 활성화
-- Python 에이전트가 jobs 변화를 즉시 감지하기 위한 핵심 설정
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_logs;


-- ================================================================
-- PART 15: Row Level Security (RLS)
-- ================================================================

ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE serp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;

-- N_SERP 호환 정책: 인증된 사용자는 모든 데이터 접근 가능
CREATE POLICY "authenticated_all" ON accounts     FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON keywords     FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON contents     FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON serp_results FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_all" ON settings     FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 에이전트 시스템: workspace 소속 멤버만 자신의 고객사 데이터 접근
CREATE POLICY "workspace_access" ON clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = clients.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_access" ON jobs FOR ALL
  USING (
    client_id IS NULL OR
    EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = jobs.client_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_access" ON metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = metrics.client_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_access" ON reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = reports.client_id AND wm.user_id = auth.uid()
    )
  );

-- agent_logs: 읽기는 인증된 사용자 전체
CREATE POLICY "authenticated_read" ON agent_logs FOR SELECT TO authenticated USING (TRUE);


-- ================================================================
-- PART 16: 초기 데이터
-- ================================================================

-- N_SERP 샘플 계정
INSERT INTO accounts (name, platform, url, blog_score, daily_publish_limit) VALUES
  ('camfit',     'naver', 'https://blog.naver.com/camfit',     74, 4),
  ('ihhihh',     'naver', 'https://blog.naver.com/ihhihh',     65, 3),
  ('camwoori',   'naver', 'https://blog.naver.com/camwoori',   65, 3),
  ('wlghks6970', 'naver', 'https://blog.naver.com/wlghks6970',  0, 2)
ON CONFLICT (name) DO NOTHING;

-- N_SERP 샘플 키워드
INSERT INTO keywords (
  keyword, sub_keyword,
  monthly_search_pc, monthly_search_mo, monthly_search_total,
  competition, mobile_ratio
) VALUES
  ('캠핑장', '가평 캠핑장', 1200, 3500, 4700, '높음', 74.5),
  ('글램핑', '양평 글램핑',  800, 2200, 3000, '중간', 73.3)
ON CONFLICT DO NOTHING;

-- N_SERP 샘플 콘텐츠
INSERT INTO contents (
  keyword_id, account_id, url, title, published_date, is_active, publish_status
)
SELECT k.id, a.id,
  'https://blog.naver.com/camfit/sample1',
  '가평 최고의 캠핑장 추천 BEST 10',
  '2026-01-15', TRUE, 'published'
FROM keywords k, accounts a
WHERE k.keyword = '캠핑장' AND a.name = 'camfit'
ON CONFLICT DO NOTHING;

INSERT INTO contents (
  keyword_id, account_id, url, title, published_date, is_active, publish_status
)
SELECT k.id, a.id,
  'https://blog.naver.com/ihhihh/sample1',
  '양평 글램핑 가족여행 후기',
  '2026-01-20', TRUE, 'published'
FROM keywords k, accounts a
WHERE k.keyword = '글램핑' AND a.name = 'ihhihh'
ON CONFLICT DO NOTHING;

-- 설정 데이터 (N_SERP 원본 + 에이전트 시스템 통합)
INSERT INTO settings (key, value, description) VALUES
(
  'blog_score_formula',
  '{
    "exposure_weight": 40,
    "rank_weight": 30,
    "quality_weight": 30,
    "description": "blog_score = (노출키워드비율×40) + (평균순위점수×30) + (키워드품질×30)"
  }',
  '블로그 지수 계산 공식 설정'
),
(
  'daily_publish_limits',
  '{
    "high_tier_threshold": 70,
    "medium_tier_threshold": 40,
    "high_limit": 4,
    "medium_limit": 3,
    "low_limit": 2
  }',
  '계정 등급별 일일 발행 한도'
),
(
  'serp_tracking',
  '{
    "rank_max": 20,
    "unexposed_rank": 21,
    "search_sleep_min": 1.0,
    "search_sleep_max": 2.0
  }',
  'SERP 추적 관련 설정'
),
(
  'ec2_api',
  '{
    "base_url": "https://fifty-nserp.duckdns.org",
    "secret": "df204da91beea0f74700f51cbb1c2172",
    "description": "N_SERP EC2 API. ANALYST_SERP 에이전트가 사용."
  }',
  'N_SERP EC2 API 연동 설정'
),
(
  'slack_webhook',
  '{
    "enabled": false,
    "webhook_url": "",
    "notify_serp_complete": true,
    "notify_unexposed_alert": true,
    "notify_weekly_report": true
  }',
  'Slack 웹훅 알림 설정'
),
(
  'agent_config',
  '{
    "cmo":            { "enabled": true,  "model": "claude-opus-4-6" },
    "copywriter":     { "enabled": true,  "model": "claude-sonnet-4-6", "default_word_count": 1500 },
    "designer":       { "enabled": true,  "model": "claude-sonnet-4-6" },
    "ops_quality":    { "enabled": true,  "model": "claude-sonnet-4-6" },
    "analyst_serp":   { "enabled": true },
    "analyst_report": { "enabled": true,  "model": "claude-sonnet-4-6" },
    "scheduler": {
      "serp_check":     "0 9 * * *",
      "report_weekly":  "0 8 * * 1",
      "report_monthly": "0 8 1 * *"
    }
  }',
  '에이전트별 모델 및 활성화 설정'
),
(
  'quality_gate',
  '{
    "min_seo_score":        60,
    "max_similarity_score": 0.30,
    "min_word_count":       800,
    "keyword_density_min":  0.01,
    "keyword_density_max":  0.03
  }',
  '품질 게이트 통과 기준. OPS_QUALITY 에이전트가 PASS/FAIL 판정에 사용.'
),
(
  'platform_config',
  '{
    "NAVER_SERP":  { "enabled": true,  "rate_limit_ms": 2000, "engine": "ec2_api" },
    "GOOGLE_SERP": { "enabled": true,  "rate_limit_ms": 3000, "engine": "custom_scraper" },
    "PERPLEXITY":  { "enabled": false, "rate_limit_ms": 5000 },
    "CHATGPT":     { "enabled": false, "rate_limit_ms": 5000 },
    "GEMINI":      { "enabled": false, "rate_limit_ms": 5000 }
  }',
  '플랫폼별 엔진 및 속도 제한. enabled:false 플랫폼은 에이전트가 스킵.'
)
ON CONFLICT (key) DO NOTHING;


-- ================================================================
-- 실행 완료 확인 쿼리:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ================================================================
