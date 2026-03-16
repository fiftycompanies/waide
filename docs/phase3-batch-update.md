# Phase 3 — 배치/크론 업데이트 (DB 저장 연동)

## 목표
기존 KST 새벽 1시 크론 배치에 Phase 1·2에서 추가한 신규 필드를 DB에 저장하는 로직을 추가한다.

---

## ⚠️ 필수 확인 사항

```
⚠️ 현재 라이브 서비스 운영 중. 기존 배치 로직 절대 수정/삭제 금지. 새 DB 저장 로직은 기존 코드 뒤에 추가만.
```

**시작 전 실행 — 기존 배치 코드 파악:**
```bash
# 크론 배치 파일 확인
grep -rn "cron\|schedule\|01:00\|새벽" apps/web/app/api/ --include="*.ts"
grep -rn "place_stats\|keyword_visibility\|upsert" apps/web/app/api/ --include="*.ts"
grep -rn "VPS_URL\|115.68.231.90\|fetchVPS\|rawFetch" apps/web/ --include="*.ts" | head -20

# 기존 배치 엔드포인트 확인
ls apps/web/app/api/cron/
cat apps/web/app/api/cron/*.ts 2>/dev/null | head -100
```

실제 구조 확인 후 아래 스펙대로 추가 구현.

---

## 작업 내용

### 3-A. `place_stats_history` 저장

**기존 배치 API Route에 추가 (예: `apps/web/app/api/cron/daily/route.ts`)**

로직:
1. 모든 active client 목록 조회 (`SELECT id, naver_place_url FROM clients WHERE is_active = true`)
2. 각 client에 대해 VPS `/analyze` 호출
3. 응답에서 `visitor_review_count`, `blog_review_count`, `bookmark_count` 추출
4. `place_stats_history` UPSERT (conflict: client_id + measured_at)
5. 30일 초과 레코드 자동 삭제

```typescript
// place_stats_history 저장 로직 (기존 배치 함수 뒤에 추가)
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// UPSERT
await supabase
  .from('place_stats_history')
  .upsert({
    client_id: client.id,
    measured_at: today,
    visitor_review_count: vpsResponse.visitorReviewCount ?? null,
    blog_review_count: vpsResponse.blogReviewCount ?? null,
    bookmark_count: vpsResponse.bookmark_count ?? null,
  }, { onConflict: 'client_id,measured_at' });

// 30일 초과 레코드 삭제
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
await supabase
  .from('place_stats_history')
  .delete()
  .eq('client_id', client.id)
  .lt('measured_at', thirtyDaysAgo.toISOString().split('T')[0]);
```

---

### 3-B. `keyword_visibility` — 신규 필드 저장

**기존 keyword_visibility UPSERT 로직에 필드 추가 (기존 코드 수정 최소화)**

추가할 필드:
- `naver_mention_count`: VPS 응답의 `naver_mention_count`
- `google_mention_count`: VPS 응답의 `google_mention_count`
- `place_rank_pc`: VPS 응답의 `place_rank_pc` (is_primary=true 키워드만)
- `place_rank_mo`: VPS 응답의 `place_rank_mo` (is_primary=true 키워드만)

```typescript
// 기존 keyword_visibility upsert 객체에 필드 추가
const visibilityData = {
  // ...기존 필드 유지...
  naver_mention_count: kwResult.naver_mention_count ?? 0,
  google_mention_count: kwResult.google_mention_count ?? 0,
  place_rank_pc: kwResult.place_rank_pc ?? null,
  place_rank_mo: kwResult.place_rank_mo ?? null,
};
```

---

### 3-C. 타입 정의 업데이트

**파일: `apps/web/types/database.ts` 또는 Supabase 자동 생성 타입**

```typescript
// place_stats_history 타입 추가
export interface PlaceStatsHistory {
  id: string;
  client_id: string;
  measured_at: string; // YYYY-MM-DD
  visitor_review_count: number | null;
  blog_review_count: number | null;
  bookmark_count: number | null;
  created_at: string;
}

// keyword_visibility 타입에 필드 추가
export interface KeywordVisibility {
  // ...기존 필드...
  naver_mention_count: number;
  google_mention_count: number;
  place_rank_pc: number | null;
  place_rank_mo: number | null;
}
```

---

## 완료 조건
- [ ] `place_stats_history` 에 오늘 날짜 데이터 저장 확인 (수동 API 호출 테스트)
- [ ] `keyword_visibility` 에 `naver_mention_count`, `google_mention_count` 저장 확인
- [ ] `keyword_visibility` 에 `place_rank_pc`, `place_rank_mo` 저장 확인
- [ ] 30일 초과 `place_stats_history` 삭제 로직 동작 확인
- [ ] tsc --noEmit 에러 없음
- [ ] Vercel 배포 및 크론 로그 정상 확인

---

## 수동 테스트 방법
```bash
# 배치 엔드포인트 수동 호출 (Vercel 환경)
curl -X POST https://waide.vercel.app/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"

# Supabase에서 결과 확인
# place_stats_history 테이블 최신 레코드 확인
# keyword_visibility 테이블 mention_count 필드 확인
```
