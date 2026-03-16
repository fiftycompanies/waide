# Phase 4 — 대시보드 UI 구현

## 목표
`apps/web/app/portal/dashboard/page.tsx` 에 신규 대시보드 섹션을 구현한다.
목업 파일: `dashboard-mockup-v2.html` 참고.

---

## ⚠️ 필수 확인 사항

```
⚠️ 현재 라이브 서비스 운영 중. 기존 대시보드 컴포넌트 삭제/수정 금지. 신규 섹션은 기존 코드 위에 추가하는 방식.
```

**시작 전 실행:**
```bash
# 현재 대시보드 파일 구조 파악
cat apps/web/app/portal/dashboard/page.tsx | head -100
ls apps/web/app/portal/dashboard/
ls apps/web/components/portal/dashboard/ 2>/dev/null || echo "없음"

# 기존 DB 조회 패턴 확인 (createAdminClient 사용 여부)
grep -n "createAdminClient\|createClient\|rawFetch" apps/web/app/portal/dashboard/page.tsx

# recharts 설치 여부 확인
cat apps/web/package.json | grep recharts

# 기존 keyword_visibility, keywords 조회 방식 확인
grep -rn "keyword_visibility\|from.*keywords" apps/web/ --include="*.ts" --include="*.tsx" | head -20
```

---

## 엔드포인트 / 데이터 조회 스펙

### Server Component 데이터 페칭 (page.tsx)

**① 메인 키워드 목록**
```typescript
// GET keywords WHERE client_id = $clientId AND is_active = true
// ORDER BY is_primary DESC, created_at ASC
const { data: keywords } = await supabase
  .from('keywords')
  .select('id, keyword, is_primary')
  .eq('client_id', clientId)
  .eq('is_active', true)
  .order('is_primary', { ascending: false })
  .order('created_at', { ascending: true });
```

**② 플레이스 순위 (is_primary 키워드 기준)**
```typescript
// is_primary = true 키워드의 최신 keyword_visibility 조회
const primaryKw = keywords?.find(k => k.is_primary);
const { data: placeRank } = await supabase
  .from('keyword_visibility')
  .select('place_rank_pc, place_rank_mo, measured_at')
  .eq('client_id', clientId)
  .eq('keyword_id', primaryKw?.id)
  .order('measured_at', { ascending: false })
  .limit(1)
  .single();
```

**③ 플레이스 지표 최신값 + 전일대비**
```typescript
// 최근 2일 데이터 (오늘, 어제 비교)
const { data: placeStats } = await supabase
  .from('place_stats_history')
  .select('measured_at, visitor_review_count, blog_review_count, bookmark_count')
  .eq('client_id', clientId)
  .order('measured_at', { ascending: false })
  .limit(2);
// placeStats[0] = 오늘, placeStats[1] = 어제
```

**④ 플레이스 지표 15일 이력 (미니차트용)**
```typescript
const { data: placeHistory } = await supabase
  .from('place_stats_history')
  .select('measured_at, visitor_review_count, blog_review_count, bookmark_count')
  .eq('client_id', clientId)
  .order('measured_at', { ascending: false })
  .limit(15);
// UI에서는 reverse() 해서 오래된 순으로 표시
```

**⑤ 키워드별 노출 현황 (네이버 블로그 + 구글)**
```typescript
// 키워드별 최신 keyword_visibility (필터링용 전체 조회)
const { data: visibility } = await supabase
  .from('keyword_visibility')
  .select(`
    keyword_id,
    rank_pc, rank_mo, rank_google,
    naver_mention_count, google_mention_count,
    measured_at,
    keywords!inner(keyword)
  `)
  .eq('client_id', clientId)
  .order('measured_at', { ascending: false });

// keyword_id별 가장 최신 1건만 유지 (중복 제거)
const latestByKeyword = Object.values(
  visibility?.reduce((acc, row) => {
    if (!acc[row.keyword_id]) acc[row.keyword_id] = row;
    return acc;
  }, {} as Record<string, typeof visibility[0]>) ?? {}
);
```

---

## UI 컴포넌트 구현 스펙

### 신규 파일 생성
- `apps/web/components/portal/dashboard/PlaceRankCard.tsx`
- `apps/web/components/portal/dashboard/StatCard.tsx`
- `apps/web/components/portal/dashboard/KeywordFilter.tsx`
- `apps/web/components/portal/dashboard/ExposureTable.tsx`
- `apps/web/components/portal/dashboard/MiniLineChart.tsx` (recharts)
- `apps/web/components/portal/dashboard/ThirtyDayModal.tsx` (recharts)

### 화면 구조 (목업 v2 기준)

```
[Header] 업체명 + 마지막수집시간 + 업체변경버튼 + [✍️ 블로그 발행] 버튼

[키워드 필터바]
  - 전체 / 키워드1(★primary) / 키워드2 / ...
  - + 키워드 관리 링크

[네이버 현황 섹션]
  [PlaceRankCard] ← 첫 번째 카드, is_primary 키워드 기준
    - 키워드 뱃지
    - "3위" 큰 숫자
    - PC 순위 / 모바일 순위 pill
    - place_stats_history 없으면 "데이터 축적 중" 안내 표시
  [StatCard] 방문자 리뷰수 (미니차트 + 30일 더보기)
  [StatCard] 블로그 리뷰수 (미니차트 + 30일 더보기)
  [StatCard] 저장수 (bookmark_count null이면 "-" 표시)

  [ExposureTable] 네이버 블로그 노출 현황
    컬럼: 키워드 / 노출여부 / 순위(rank_pc) / 점유율(naver_mention_count/20) / URL
    - 키워드 필터 선택 시 해당 키워드만 표시
    - 데이터 없으면 "-" 표시

[구글 현황 섹션]
  [ExposureTable] 구글 노출 현황
    컬럼: 키워드 / 노출여부 / 순위(rank_google) / 점유율(google_mention_count/20) / URL

[마케팅 현황 섹션] ← 기존 컴포넌트 그대로 유지
```

### 점유율 UI 규칙
- 점유율 = `mention_count / 20 * 100` (%)
- 바 + 퍼센트 + `n/20` 표기
- 0%는 회색, 1~20%는 색상 바 표시

### 데이터 없는 상태 처리 (필수)
- `place_stats_history` 레코드 없음 → 카드는 표시, 숫자 자리에 "-" + "데이터 수집 중" 안내
- `keyword_visibility` 레코드 없음 → 테이블 행은 있되 "—" 표시
- `bookmark_count = null` → "-" 표시 (저장수 크롤링 미지원 명시)

---

## 블로그 발행 버튼 기능

### UI 위치
헤더 우측 끝에 보라색 그라디언트 버튼 `✍️ 블로그 발행`

### 클릭 시 동작
`/portal/contents/new?client_id={clientId}` 로 이동
(기존 콘텐츠 에디터 페이지로 이동 — 신규 생성 모드)

또는 shadcn Dialog로 인라인 모달 표시:
- 키워드 선택 드롭다운
- 발행 채널 선택 (네이버 블로그 / 티스토리 / 워드프레스)
- 발행 완료 URL 입력 필드
- [저장 · 추적 시작] 버튼 → `contents` 테이블에 `published_url` 업데이트 + `keyword_visibility.is_tracking = true` 설정

---

## 구현 규칙
- `createAdminClient` 사용 (`createClient` 사용 금지)
- recharts는 `apps/web/package.json`에 없으면 `cd apps/web && npm install recharts` 후 사용
- 모든 Server Component 데이터 페칭은 `async` Server Component 방식 (no `useEffect`)
- 클라이언트 인터랙션(키워드 필터, 모달)은 별도 Client Component로 분리
- TypeScript strict 모드 준수
- 빌드 검증: `tsc --noEmit` 에러 없이 통과

---

## 완료 조건
- [ ] 키워드 필터 클릭 시 두 테이블 동시 필터링 동작
- [ ] 플레이스 순위 카드 첫 번째 위치 표시
- [ ] 미니차트 15일 데이터 렌더링
- [ ] 30일 모달 동작
- [ ] 점유율 바 차트 렌더링
- [ ] 블로그 발행 버튼 동작
- [ ] 데이터 없는 상태 정상 렌더링
- [ ] tsc --noEmit 통과
- [ ] git push → Vercel 빌드 성공
