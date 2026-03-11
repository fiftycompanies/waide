# Waide 현재 이슈 트래커

> 최종 업데이트: 2026-03-11
> 소스 코드 직접 확인 기반

---

## 해결 완료

### [FIX-A] AI 추천 clientId 에러 ✅
- **파일**: `app/(portal)/portal/keywords/page.tsx`
- **증상**: "AI 추천 받기" 클릭 시 "클라이언트를 찾을 수 없습니다" 에러
- **원인**: 각 핸들러에서 `document.querySelector("meta[name='portal-client-id']")`를 반복 호출하는 타이밍 이슈
- **수정**: `clientId` useState + 단일 useEffect로 중앙 관리 (L62~67), `loadData` 의존성 `[clientId]` (L116)
- **커밋**: 917e930

### [FIX-B] 키워드 점유율에 UUID 표시 ✅
- **파일**: `components/portal/keyword-occupancy-section.tsx`, `lib/actions/portal-actions.ts`
- **증상**: 키워드 점유율 칩에 UUID(keyword_id) 8자리가 표시됨
- **원인**: keyword_visibility 테이블에 keyword_id만 있고 keyword 이름 없음, JOIN 안 함
- **수정**: portal-actions.ts에서 `keywords!keyword_id(keyword)` JOIN 추가, 컴포넌트에서 `kw.keyword || kw.keyword_id.slice(0,8)` 표시 (L50)
- **커밋**: 917e930

### [FIX-C] 온보딩 체크리스트 문구/라우팅 ✅
- **파일**: `app/(portal)/portal/page.tsx`
- **증상**: 체크리스트 레이블이 "분석 완료" 등 완료형 표현, 클릭 라우팅 없음
- **수정**: 레이블 변경 (L172~177), desc 필드 추가, `#` 앵커 smooth scroll (L258~264)
- **커밋**: 917e930

### [FIX-D] "분석 준비 중" → 분석 시작 폼 ✅
- **파일**: `app/(portal)/portal/page.tsx`
- **증상**: 분석 미완료 시 정적 텍스트만 표시
- **수정**: `AnalysisRequiredBanner` 컴포넌트 임포트 + `clientId` 전달 (L476~478)
- **커밋**: 917e930

---

## 잠재 이슈 (코드에서 확인)

### [ISSUE-1] portal/page.tsx — 체크리스트 항목의 미구현 라우트
- **파일**: `app/(portal)/portal/page.tsx` L174
- **증상**: "블로그 연결" 항목이 `/portal/blog`로 연결되어 있으나, 해당 페이지의 블로그 연동 기능 구현 상태 확인 필요
- **영향**: 낮음 (페이지는 존재하나 기능 완성도 미확인)

### [ISSUE-2] portal/page.tsx — scoreBreakdown null 시 빈 바 표시
- **파일**: `app/(portal)/portal/page.tsx` L439~454
- **증상**: `data.scoreBreakdown`이 null이면 모든 점수 바가 0으로 표시됨
- **원인**: `const breakdown = data.scoreBreakdown || {};` — 빈 객체에서 각 area가 undefined
- **영향**: 낮음 (UX만 — 분석 미완료 상태에서 발생)

### [ISSUE-3] keywords/page.tsx — createKeyword 임포트 존재 여부
- **파일**: `app/(portal)/portal/keywords/page.tsx` L22
- **증상**: `createKeyword`가 `keyword-actions.ts`에서 임포트되나, 해당 함수 존재 여부 확인 필요
- **영향**: 중간 (키워드 직접 추가 기능 영향)

### [ISSUE-4] keyword-occupancy-section.tsx — 비노출 키워드 미표시
- **파일**: `components/portal/keyword-occupancy-section.tsx` L40~53
- **증상**: `sorted` 배열은 `data.keywords` 전체를 정렬하지만, portal-actions.ts에서 `is_exposed=true`만 쿼리하므로 비노출 키워드가 목록에 없음
- **원인**: portal-actions.ts에서 `.eq("is_exposed", true)` 필터
- **영향**: 낮음 (의도된 동작일 수 있으나, "비노출 키워드" 안내가 없음)

---

## 주의사항

- 이슈 수정 시 반드시 해당 파일 READ 후 수정
- 수정 후 `npx tsc --noEmit` 에러 0개 확인
- 라이브 운영 중 — 기존 코드 삭제 금지, 추가/수정만
