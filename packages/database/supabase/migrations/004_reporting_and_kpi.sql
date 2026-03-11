-- ================================================================
-- 004_reporting_and_kpi.sql
-- 리포팅 및 KPI 기능 확장
--
-- 변경 사항:
--   1. client_source_type ENUM 신설
--      → clients.source_type (TEXT + CHECK) → ENUM으로 업그레이드
--   2. clients 컬럼 추가: target_platforms(TEXT[]), kpi_goals(JSONB)
--      (source_config, brand_guidelines는 003에서 이미 추가됨)
--   3. metrics_summary 테이블 신설
--      → ANALYST 에이전트가 일별/주별/월별 KPI를 집계해 저장
--
-- 안전 보장:
--   - IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS 사용
--   - 기존 데이터 삭제 없음
--   - ENUM 변환은 현재 컬럼이 TEXT일 때만 실행 (중복 실행 안전)
-- ================================================================


-- ================================================================
-- PART 1: client_source_type ENUM 타입 생성
--
-- 003에서 TEXT + CHECK로 추가된 source_type 컬럼을
-- 정식 ENUM 타입으로 업그레이드.
-- ENUM이 이미 존재하면 skip.
-- ================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'client_source_type'
  ) THEN
    CREATE TYPE client_source_type AS ENUM ('API', 'GOOGLE_DRIVE', 'LOCAL');
  END IF;
END $$;


-- ================================================================
-- PART 2: clients.source_type  TEXT → client_source_type ENUM 변환
--
-- 컬럼이 여전히 TEXT 타입인 경우에만 실행.
-- 1. 기존 CHECK 제약조건을 동적으로 찾아 제거 (ENUM이 대체)
-- 2. 컬럼 타입 변환 (기존 NULL 또는 유효값 데이터 보존)
-- ================================================================

DO $$ DECLARE
  v_constraint text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name  = 'clients'
      AND column_name = 'source_type'
      AND data_type   = 'text'
  ) THEN

    -- CHECK 제약조건 이름 동적 조회 (PostgreSQL 자동 생성 이름 처리)
    SELECT conname INTO v_constraint
    FROM   pg_constraint
    WHERE  conrelid = 'clients'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) LIKE '%source_type%';

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE clients DROP CONSTRAINT IF EXISTS %I', v_constraint);
    END IF;

    -- TEXT → ENUM 변환 (기존 NULL은 NULL로, 유효값은 ENUM 값으로 캐스팅)
    ALTER TABLE clients
      ALTER COLUMN source_type
        TYPE client_source_type
        USING source_type::client_source_type;

  END IF;
END $$;

COMMENT ON COLUMN clients.source_type IS
  '콘텐츠 소스 유형. ENUM: API | GOOGLE_DRIVE | LOCAL';


-- ================================================================
-- PART 3: clients 신규 컬럼 추가
--
-- target_platforms : 서비스 대상 플랫폼 배열
-- kpi_goals        : 고객사별 KPI 목표 (대시보드 설정 + ANALYST 참고)
-- ================================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS target_platforms  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kpi_goals         JSONB   DEFAULT '{}';

COMMENT ON COLUMN clients.target_platforms IS
  '서비스 대상 플랫폼 목록. 예: ["NAVER_BLOG", "TISTORY", "INSTAGRAM"]';

COMMENT ON COLUMN clients.kpi_goals IS
  '고객사별 KPI 목표. 예: {
    "monthly_top3_keywords": 5,
    "avg_rank_target": 10,
    "monthly_content_target": 20,
    "monthly_views_target": 10000
  }';


-- ================================================================
-- PART 4: metrics_summary 테이블 신설
--
-- 역할:
--   - ANALYST_SERP 에이전트가 SERP 수집 후 일별 순위 집계
--   - ANALYST_REPORT 에이전트가 주별/월별 리포트용 데이터 집계
--   - 대시보드 KPI 카드가 최신 스냅샷을 직접 조회
--
-- 표준 metric_key 값:
--   avg_rank          : 키워드 평균 순위 (낮을수록 좋음)
--   top3_count        : 상위 3위 키워드 수
--   top10_count       : 상위 10위 키워드 수
--   content_published : 해당 기간 발행된 콘텐츠 수
--   total_views       : 총 조회수 (플랫폼 API 수집)
--   citation_count    : AI 검색 인용 횟수
--   quality_pass_rate : 품질 검수 통과율 (0.0 ~ 1.0)
-- ================================================================

CREATE TABLE IF NOT EXISTS metrics_summary (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기준 정보
  client_id     UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  metric_key    TEXT         NOT NULL,
  period        TEXT         NOT NULL DEFAULT 'daily'
                             CHECK (period IN ('daily', 'weekly', 'monthly')),
  summary_date  DATE         NOT NULL DEFAULT CURRENT_DATE,

  -- 집계 값
  value         NUMERIC,               -- 숫자 지표 (순위, 건수, 비율 등)
  value_text    TEXT,                  -- 비-숫자 보조 정보 (예: "글램핑 1위")
  metadata      JSONB        DEFAULT '{}',
    -- 상세 데이터 예시:
    -- avg_rank: {"keywords": [{"keyword": "글램핑", "rank": 2}, ...]}
    -- quality_pass_rate: {"pass": 18, "fail": 2, "total": 20}

  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),

  -- (client + 메트릭 + 기간 + 날짜) 조합 유니크 → upsert 가능
  UNIQUE(client_id, metric_key, period, summary_date)
);

COMMENT ON TABLE metrics_summary IS
  'ANALYST 에이전트가 집계한 일별/주별/월별 KPI 요약.
   대시보드 KPI 카드와 월간 리포트의 1차 데이터 소스.';

COMMENT ON COLUMN metrics_summary.metric_key IS
  '표준 메트릭 식별자:
   avg_rank | top3_count | top10_count |
   content_published | total_views | citation_count | quality_pass_rate';

COMMENT ON COLUMN metrics_summary.metadata IS
  '집계 상세 breakdown. 리포트 생성 시 에이전트가 참조.
   avg_rank 예: {"keywords": [{"keyword": "글램핑", "rank": 2, "prev_rank": 5}]}';


-- ================================================================
-- PART 5: 인덱스
-- ================================================================

-- 대시보드 KPI 카드: "이 고객사의 최신 일별 KPI 전체"
CREATE INDEX IF NOT EXISTS idx_metrics_summary_client_date
  ON metrics_summary(client_id, summary_date DESC);

-- 기간 타입별 조회: "이번 달 전체 고객사 월간 집계"
CREATE INDEX IF NOT EXISTS idx_metrics_summary_period_date
  ON metrics_summary(period, summary_date DESC);

-- ANALYST 에이전트 집계 쿼리: "특정 메트릭의 최근 N일 트렌드"
CREATE INDEX IF NOT EXISTS idx_metrics_summary_key_period
  ON metrics_summary(metric_key, period, summary_date DESC);


-- ================================================================
-- PART 6: updated_at 자동 갱신 트리거
-- ================================================================

CREATE TRIGGER metrics_summary_updated_at
  BEFORE UPDATE ON metrics_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- PART 7: RLS (Row Level Security)
-- 워크스페이스 멤버만 해당 고객사 데이터 접근 허용
-- ================================================================

ALTER TABLE metrics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_access" ON metrics_summary FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = metrics_summary.client_id
        AND wm.user_id = auth.uid()
    )
  );


-- ================================================================
-- 실행 후 확인 쿼리
-- ================================================================

-- 1. clients 컬럼 타입 확인 (source_type → ENUM이어야 함)
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'clients'
--   AND column_name IN ('source_type', 'target_platforms', 'kpi_goals')
-- ORDER BY column_name;

-- 2. metrics_summary 테이블 확인
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'metrics_summary';

-- 3. ENUM 타입 확인
-- SELECT typname, enumlabel
-- FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
-- WHERE typname = 'client_source_type'
-- ORDER BY e.enumsortorder;
