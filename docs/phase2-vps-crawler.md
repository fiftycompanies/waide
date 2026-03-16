# Phase 2 — VPS 크롤러 수정 (점유율 · 저장수 · 플레이스 순위)

## 목표
iwinv VPS(115.68.231.90:8000)의 FastAPI + Playwright 크롤러를 수정하여:
1. 네이버 플레이스 저장수(bookmark_count) 수집 추가 시도
2. 키워드별 블로그/구글 검색 결과에서 당사 콘텐츠 mention_count 계산
3. 플레이스 순위(place_rank_pc, place_rank_mo) 수집

---

## ⚠️ 필수 확인 사항

```
⚠️ 현재 라이브 서비스 운영 중. VPS 기존 크롤링 엔드포인트 절대 수정 금지. 새 기능은 신규 엔드포인트 또는 기존 응답에 필드 추가 방식으로만.
```

**시작 전 실행 — VPS 현재 코드 파악:**
```bash
ssh root@115.68.231.90
# 또는 직접 파일 확인:
cat scripts/iwinv-main-patched.py | head -200
grep -n "bookmark\|저장수\|bookmarkCount" scripts/iwinv-main-patched.py
grep -n "mention\|share\|점유율" scripts/iwinv-main-patched.py
grep -n "place_rank\|플레이스.*순위\|순위.*플레이스" scripts/iwinv-main-patched.py
grep -n "def.*route\|@app\." scripts/iwinv-main-patched.py
```

실제 코드를 확인한 후 아래 스펙대로 구현할 것.

---

## 작업 내용

### 2-A. 네이버 플레이스 저장수 수집 시도

**GraphQL 필드 존재 여부 확인 (필수 선행):**
```python
# 크롤러에서 GraphQL 응답 전체를 한 번 출력해서 bookmarkCount 필드 확인
# 없으면 2-A 전체 보류하고 2-B로 넘어갈 것
```

**bookmark_count 필드가 있는 경우:**
- 기존 VPS `/analyze` 응답 JSON에 `bookmark_count: int | null` 필드 추가
- GraphQL 응답에서 `bookmarkCount` 또는 유사 필드를 파싱하여 반환
- 필드 없거나 에러 시 `null` 반환 (중단 금지)

**bookmark_count 필드가 없는 경우:**
- 2-A 보류, `bookmark_count: null` 항상 반환
- Phase 3에서 DB에 NULL로 저장

---

### 2-B. 점유율(mention_count) 계산

**엔드포인트: 기존 `/analyze` 응답에 추가 (또는 신규 `/keyword-visibility` 엔드포인트)**

로직:
1. 키워드로 네이버 블로그 검색 → 상위 20개 결과 URL 수집
2. 상위 20개 URL 중 `client.naver_place_url`, `client.blog_domain`, `client.brand_name`이 포함된 URL 개수 카운트 → `naver_mention_count`
3. 키워드로 구글 검색(Serper.dev) → 상위 20개 결과 중 동일 방식으로 카운트 → `google_mention_count`

**응답 스펙:**
```json
{
  "keyword": "가평 풀빌라",
  "naver_mention_count": 4,
  "google_mention_count": 2,
  "naver_top20_urls": ["..."],
  "google_top20_urls": ["..."]
}
```

---

### 2-C. 플레이스 순위 수집

**기존 `checkKeywordRankings()` 함수 확인 후 응답에 추가:**
- 기존 `rank_pc`, `rank_mo` 는 블로그 검색 순위
- 플레이스 전용 순위(`place_rank_pc`, `place_rank_mo`)를 별도로 수집
- 네이버 플레이스 검색에서 해당 업체의 순위를 파싱 (50위까지, 없으면 null)

**응답 스펙 추가:**
```json
{
  "keyword": "가평 풀빌라",
  "place_rank_pc": 3,
  "place_rank_mo": 2,
  "rank_pc": 5,
  "rank_mo": 4
}
```

---

## VPS 배포

```bash
# VPS에서
cd /path/to/app
git pull origin main  # 또는 파일 직접 수정
systemctl restart waide-vps  # 또는 해당 서비스명

# 재시작 후 헬스체크
curl http://115.68.231.90:8000/health

# 기존 엔드포인트 정상 동작 확인
curl -X POST http://115.68.231.90:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"place_url":"https://map.naver.com/...", "keywords":["가평 풀빌라"]}'
```

---

## 완료 조건
- [ ] VPS `/analyze` 응답에 `bookmark_count` 필드 추가 (null 허용)
- [ ] VPS `/analyze` 응답에 `naver_mention_count`, `google_mention_count` 필드 추가
- [ ] VPS `/analyze` 응답에 `place_rank_pc`, `place_rank_mo` 필드 추가
- [ ] 기존 응답 필드 깨짐 없음 확인
- [ ] VPS 서비스 정상 재시작 확인

---

## Phase 3으로 넘어가기 전 체크
VPS 엔드포인트 변경사항을 Next.js 타입 정의에도 반영할 것.
