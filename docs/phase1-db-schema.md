# Phase 1 — DB 스키마 추가

## 목표
대시보드 신규 기능(플레이스 순위 이력, 점유율, 대표 키워드)에 필요한 DB 컬럼/테이블을 추가한다.
기존 테이블 구조 변경은 최소화, 컬럼 추가만 허용.

---

## ⚠️ 필수 확인 사항 (작업 시작 전 반드시 먼저 읽을 것)

```
⚠️ 현재 라이브 서비스 운영 중. 기존 코드 변경/삭제로 인한 오류 절대 금지. 새 기능은 기존 코드에 영향 없이 추가만.
```

**시작 전 실행:**
```bash
# 현재 스키마 확인
cat supabase/migrations/*.sql | grep -E "CREATE TABLE|ALTER TABLE" | head -60

# keywords 테이블 컬럼 확인
grep -A 30 "CREATE TABLE.*keywords" supabase/migrations/*.sql

# keyword_visibility 테이블 컬럼 확인  
grep -A 30 "CREATE TABLE.*keyword_visibility" supabase/migrations/*.sql

# place_stats_history 테이블 존재 여부 확인
grep -r "place_stats_history" supabase/migrations/
```

실제 컬럼명을 확인한 후, 아래 마이그레이션을 현실에 맞게 조정해서 작성할 것.

---

## 작업 내용

### 파일: `supabase/migrations/064_dashboard_additions.sql`

#### 1. `keywords` 테이블 — `is_primary` 컬럼 추가
- 클라이언트당 1개 키워드만 `is_primary = true`
- 네이버 플레이스 순위 카드에 표시할 대표 키워드

```sql
-- keywords 테이블에 is_primary 컬럼 추가 (이미 있으면 스킵)
ALTER TABLE keywords 
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- 동일 client_id 내 is_primary = true는 1개만 허용하는 partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS keywords_client_primary_uniq
  ON keywords (client_id)
  WHERE is_primary = true;

COMMENT ON COLUMN keywords.is_primary IS '플레이스 순위 카드에 표시할 대표 키워드 여부. client_id당 1개만 true 허용.';
```

#### 2. `keyword_visibility` 테이블 — 점유율 컬럼 추가
- `naver_mention_count`: 네이버 블로그 상위 20개 결과 중 우리 콘텐츠 노출 개수
- `google_mention_count`: 구글 상위 20개 결과 중 우리 콘텐츠 노출 개수

```sql
ALTER TABLE keyword_visibility
  ADD COLUMN IF NOT EXISTS naver_mention_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_mention_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN keyword_visibility.naver_mention_count IS '네이버 블로그 검색 상위 20결과 중 당사 콘텐츠 노출 수';
COMMENT ON COLUMN keyword_visibility.google_mention_count IS '구글 검색 상위 20결과 중 당사 콘텐츠 노출 수';
```

#### 3. `place_stats_history` 테이블 — 신규 생성
- 플레이스 리뷰수·저장수 15/30일 이력 저장

```sql
CREATE TABLE IF NOT EXISTS place_stats_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measured_at          DATE NOT NULL,
  visitor_review_count INTEGER,
  blog_review_count    INTEGER,
  bookmark_count       INTEGER,          -- 저장수 (크롤링 실패 시 NULL 허용)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, measured_at)
);

CREATE INDEX IF NOT EXISTS place_stats_history_client_date_idx
  ON place_stats_history (client_id, measured_at DESC);

COMMENT ON TABLE place_stats_history IS '네이버 플레이스 방문자리뷰/블로그리뷰/저장수 일별 이력. 30일치만 유지.';
```

#### 4. `keyword_visibility` 테이블 — 플레이스 순위 컬럼 추가
- `place_rank_pc`, `place_rank_mo`: 네이버 플레이스 검색 순위
- 기존 `rank_pc`, `rank_mo`는 블로그/웹 검색 순위 (건드리지 않음)

```sql
ALTER TABLE keyword_visibility
  ADD COLUMN IF NOT EXISTS place_rank_pc   INTEGER,
  ADD COLUMN IF NOT EXISTS place_rank_mo   INTEGER;

COMMENT ON COLUMN keyword_visibility.place_rank_pc IS '네이버 플레이스 PC 검색 순위';
COMMENT ON COLUMN keyword_visibility.place_rank_mo IS '네이버 플레이스 모바일 검색 순위';
```

---

## 실행 순서

```bash
# 1. 마이그레이션 파일 생성 후 Supabase에 적용
supabase db push

# 또는 Supabase 대시보드 SQL Editor에서 직접 실행

# 2. 적용 확인
supabase db pull --schema public 2>&1 | grep -E "place_stats|keyword_visibility|keywords"
```

---

## 완료 조건
- [ ] `keywords.is_primary` 컬럼 존재 확인
- [ ] `keywords_client_primary_uniq` partial unique index 존재 확인
- [ ] `keyword_visibility.naver_mention_count`, `google_mention_count` 컬럼 존재 확인
- [ ] `keyword_visibility.place_rank_pc`, `place_rank_mo` 컬럼 존재 확인
- [ ] `place_stats_history` 테이블 생성 확인
- [ ] 기존 기능 영향 없음 확인 (tsc --noEmit 통과)

---

## Phase 2로 넘어가기 전 체크
Phase 1 완료 후 이 체크리스트를 모두 통과한 다음 Phase 2 파일을 실행할 것.
