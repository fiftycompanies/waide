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

### [FIX-1] 분석 플로우 UX 연결 ✅
- **파일**: `components/portal/analysis-required-banner.tsx`, `app/(public)/analysis/loading/page.tsx`, `app/(public)/analysis/[id]/page.tsx`
- **증상**: 포털에서 분석 시작 후 정적 "분석을 시작했습니다" 텍스트만 표시, 분석 결과 페이지에서 포털 복귀 수단 없음
- **수정**:
  - banner: 성공 시 `router.push(/analysis/loading?id=${analysisId}&from=portal)` 리다이렉트
  - loading: `from` 파라미터 추출 → 완료 시 `?from=portal` 전달
  - result: `useSearchParams`로 `from=portal` 감지 → "← 포털 대시보드로 돌아가기" 링크 표시

### [FIX-2] AI 키워드 추천 빈 clientId 방어 ✅
- **파일**: `lib/actions/campaign-planning-actions.ts`
- **증상**: clientId가 빈 문자열일 때 "클라이언트를 찾을 수 없습니다" 에러 (FIX-A로 근본 원인 해결 완료)
- **수정**: `suggestKeywordsForClient()` 최상단에 빈 clientId 체크 + 사용자 친화적 에러 메시지 추가

### [FIX-3] AI 추천 탭 승인/거절 UI ✅ (이미 구현됨)
- **파일**: `app/(portal)/portal/keywords/page.tsx`
- **확인**: `handleApprove` (L122-133) → `approveSuggestedKeyword()`, `handleReject` (L135-146) → `rejectSuggestedKeyword()` — 이미 정상 연결 확인

### [FIX-4] 웹사이트 분석 파이프라인 추가 ✅
- **파일**: `lib/place-analyzer.ts`
- **증상**: url_type='website'인 URL 입력 시 "place_id를 찾을 수 없습니다" 에러로 실패
- **수정**: `runFullAnalysis()`에서 `parsed.urlType === "website"` 분기 → `runWebsiteAnalysis()` 호출. HTML 페치 → 텍스트 추출 → 7항목 SEO 룰 체크 → Claude Sonnet 분석 → 마케팅 점수 계산 (seo_technical 30 + brand_message 25 + content_channel 25 + cta_conversion 20) → DB 저장

### [FIX-5] 분석 결과 페이지 웹사이트 분기 ✅
- **파일**: `app/(public)/analysis/[id]/page.tsx`
- **증상**: 웹사이트 분석 결과에서 네이버 플레이스 전용 섹션(리뷰/메뉴/이미지/경쟁사/SEO코멘트/개선플랜)이 표시됨
- **수정**: `isWebsite` 플래그로 분기. 웹사이트: 마케팅 점수 + SEO 기술 진단 + 키워드 전략 + 브랜드 분석 + 개선 액션플랜만 표시. 네이버 플레이스: 기존 전체 표시

### [FIX-6] 포털 배너 URL 검증 + 인라인 분석 애니메이션 ✅
- **파일**: `components/portal/analysis-required-banner.tsx`
- **증상**: (1) 네이버 URL만 허용, 일반 URL 차단 (2) 분석 시 외부 로딩 페이지로 리다이렉트
- **수정**: (1) http/https URL 모두 허용, 비네이버 URL에 "홈페이지 URL로 웹사이트 마케팅 진단을 진행합니다" 안내 표시, 비URL 입력 시 에러 (2) idle→analyzing→completed→failed 4상태 인라인 UI. 2초 간격 폴링, 3초 간격 상태 메시지 로테이션, 120초 타임아웃, 완료 시 결과 페이지 자동 이동

### [FIX-7] 키워드 페이지 clientId props 전환 ✅
- **파일**: `app/(portal)/portal/keywords/page.tsx`, `portal-keywords-client.tsx`
- **증상**: 클라이언트 컴포넌트에서 meta 태그 DOM 쿼리로 clientId 획득 → 타이밍 이슈
- **수정**: server component wrapper (`page.tsx`)에서 `getCurrentUser()` → `user.client_id` 조회 후 client component에 props로 전달. DOM 쿼리 제거

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
