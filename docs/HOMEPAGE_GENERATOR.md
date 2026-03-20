# 홈페이지 생성 기능 — 아키텍처 및 히스토리

## 1. 개발 히스토리 (폐기된 방식 포함)

### ❌ 시도 1 — DOM 복제 방식 (폐기)
- 방식: 레퍼런스 URL HTML을 그대로 복제 후 텍스트/이미지 교체
- 폐기 이유: 저작권 문제

### ❌ 시도 2 — Vision AI 즉흥 생성 방식 (폐기)
- 방식: Playwright 스크린샷 → Claude Vision → HTML 전체 생성
- 폐기 이유: 섹션 구조가 레퍼런스와 무관한 generic 레이아웃 생성,
  품질이 매번 들쭉날쭉, 레퍼런스 텍스트 잔류 문제

### ❌ 시도 3 — Vision + Tailwind 크롭 방식 (레거시 유지)
- 방식: 700px 단위 크롭 → 섹션별 Vision 호출 → 조립
- 파일: lib/homepage/generate/vision-to-html.ts
- 현황: 코드 유지 중이나 신규 생성에는 사용 안 함
- 문제: Nav flex 컨테이너 누락, 영문 텍스트 잔류, 복잡 사이트에서
  ITEM_TITLE 슬롯 미교체 등 버그 다수

### ✅ 현재 방식 — 사전 제작 템플릿 + 브랜드 데이터 주입
- 결정 배경: AI가 HTML을 즉흥 생성하는 것보다
  검증된 고품질 템플릿에 브랜드 데이터를 주입하는 게 품질 일관성 확보에 유리
- Waide는 brand_analyses + brand_persona 데이터를 이미 보유 →
  레퍼런스 URL 불필요
- AI 역할: HTML 생성 금지, 텍스트 슬롯 채우기만 담당

---

## 2. 현재 아키텍처

### 생성 파이프라인 (generateFromTemplate)

```
고객 포털에서 템플릿 선택 + 신청
  ↓
homepage_requests 테이블에 저장 (status: pending)
  ↓
어드민 /ops/homepage-requests 에서 [생성 시작] 클릭
  ↓
brand_analyses + brand_persona 로드
  ↓
Claude Haiku API → 슬롯용 텍스트 JSON 생성
(tagline / subtitle / aboutDesc / services / rooms / reviews 등)
  ↓
선택된 템플릿 HTML 로드 → {{SLOT}} 일괄 치환
  ↓
Unsplash 이미지 슬롯 채우기
  ↓
DB 저장 + Vercel 배포
  ↓
status: completed → output_url 저장
  ↓
어드민이 [전달완료] 처리 → status: delivered
```

### 핵심 파일 목록

| 파일 | 역할 |
|------|------|
| lib/homepage/generate/template-types.ts | 템플릿명 상수, 타입 정의 |
| lib/homepage/generate/brand-content-generator.ts | Claude Haiku로 슬롯 텍스트 생성 |
| lib/homepage/generate/brand-injector.ts | injectToTemplate() — 슬롯 치환 |
| lib/homepage/generate/homepage-generator.ts | generateFromTemplate() 오케스트레이터 |
| lib/homepage/generate/unsplash-images.ts | 업종별 Unsplash 이미지 상수 맵 |
| lib/homepage/generate/vision-to-html.ts | 레거시 Vision 방식 (유지, 미사용) |
| lib/homepage/generate/screenshot-crawler.ts | 레거시 Playwright 크롤러 (유지, 미사용) |
| lib/homepage/generate/reference-cloner.ts | 레거시 DOM 복제 (유지, 미사용) |
| lib/homepage/generate/content-mapper.ts | 레거시 AI 교체 맵 (유지, 미사용) |
| lib/homepage/generate/image-replacer.ts | 레거시 이미지 교체 (유지, 미사용) |
| lib/homepage/generate/html-patcher.ts | 레거시 DOM 패치 (유지, 미사용) |
| lib/actions/homepage-request-actions.ts | 포털 신청 + 어드민 목록/상태/생성 서버 액션 |
| lib/actions/homepage-generate-actions.ts | templateName 파라미터 분기 |
| components/homepage/client-homepage-view.tsx | 포털 템플릿 선택 카드 UI |
| app/(dashboard)/ops/homepage-requests/page.tsx | 어드민 신청 관리 페이지 |

---

## 3. 템플릿 4종

### 공통 CDN
- Tailwind CSS CDN
- AOS.js 2.3.1 (스크롤 애니메이션)
- Swiper 11 (슬라이더)
- GSAP 3.12.2 + ScrollTrigger (고급 애니메이션)
- Google Fonts (Noto Sans KR, Noto Serif KR, Pretendard, Bebas Neue)

### 공통 데이터 슬롯
```
{{BRAND_NAME}} {{TAGLINE}} {{SUBTITLE}} {{ABOUT_DESC}}
{{SERVICE_1}}~{{SERVICE_6}} {{SERVICE_DESC_1}}~{{SERVICE_DESC_6}}
{{PHONE}} {{ADDRESS}} {{HOURS}}
{{HERO_IMG}} {{ABOUT_IMG}}
{{SERVICE_IMG_1}}~{{SERVICE_IMG_3}}
{{GALLERY_IMG_1}}~{{GALLERY_IMG_6}}
```

---

### dark-luxury.html
- 대상 업종: 피부과 / 성형외과 / 고급 의료
- 스타일: 다크(#1a1a1a) + 골드(#c8a97e), Bebas Neue + Noto Sans KR
- 섹션: Fixed Nav → Hero 100vh → 대각선 About → 서비스 5카드
  → Swiper 갤러리 → 상담폼 → 블로그 3카드 → Footer
- 애니메이션: GSAP Hero 텍스트, AOS 섹션 페이드, Swiper 갤러리

---

### warm-natural.html
- 대상 업종: 글램핑 / 펜션 / 캠핑 / 숙박
- 스타일: 크림(#fefcf9) + 숲초록(#4a7c59), Noto Serif KR
- 섹션: Nav(투명→흰) → Hero 100vh → About 2열 → 객실 Swiper
  → 편의시설 4카드 → 매소너리 갤러리 → 후기 Swiper
  → 예약폼(체크인/체크아웃) → Footer
- 추가 슬롯:
```
{{ROOM_1}}~{{ROOM_3}} {{ROOM_PRICE_1}}~{{ROOM_PRICE_3}}
{{ROOM_DESC_1}}~{{ROOM_DESC_3}} {{ROOM_IMG_1}}~{{ROOM_IMG_3}}
{{REVIEW_1}}~{{REVIEW_3}} {{REVIEWER_1}}~{{REVIEWER_3}}
```

---

### light-clean.html
- 대상 업종: 카페 / 음식점 / 인테리어 / 리모델링
- 스타일: 흰 배경 + CSS변수 {{ACCENT_COLOR}}, Pretendard
- 섹션: Sticky Nav → Split Hero(좌텍스트/우이미지) → 카운터 배너
  → 서비스 탭 6개 → 포트폴리오 Swiper → 인스타 그리드
  → 상담폼 → Footer
- 특징: {{ACCENT_COLOR}} 변수로 업종별 강조색 교체 가능,
  GSAP 숫자 카운트업, JS 탭 전환
- 추가 슬롯:
```
{{ACCENT_COLOR}}
{{PORTFOLIO_1}}~{{PORTFOLIO_4}} {{PORTFOLIO_IMG_1}}~{{PORTFOLIO_IMG_4}}
```

---

### 3d-glamping.html
- 대상 업종: 글램핑 / 캠핑 (3D 인터랙티브 프리미엄)
- 스타일: Three.js 3D 히어로(#050510 다크) + warm-natural 하단 섹션
- 구조:
  * 파트1 — Three.js 3D 씬 (100vh)
    - 별 3000개 파티클, 글램핑 텐트 3개, 나무 20그루, 모닥불 Point Light
    - OrbitControls (마우스 드래그 시점 회전), autoRotate
    - 로딩 화면, 스크롤 힌트 bounce 애니메이션
    - renderer를 #hero-3d 컨테이너에 append (overflow-x: hidden으로 스크롤 가능)
  * 파트2 — warm-natural 하단 섹션 그대로 (객실/갤러리/후기/예약폼/Footer)
- 생성 방식: Gemini AI Studio에서 kk님이 수동 생성 후 슬롯 추가
  (Gemini 3.1 Pro — Three.js 3D 생성 능력 업계 최강)
  향후 업종별 다른 3D 씬 필요 시 동일 방식으로 추가
- 슬롯: warm-natural 슬롯 모두 포함 + {{BRAND_NAME}} {{TAGLINE}} {{PHONE}} {{ADDRESS}}

---

## 4. 템플릿 선택 로직

현재 자동 선택 모듈(template-selector.ts)은 미구현.
어드민에서 kk님이 수동 선택하거나, 고객 포털에서 직접 선택.

향후 자동 매칭 구현 시 규칙:
- `/(피부과|성형|의원|클리닉|치과|한의원)/` → dark-luxury
- `/(글램핑|캠핑|camping|glamping)/` + 3D 원하는 경우 → 3d-glamping
- `/(글램핑|펜션|캠핑|숙박|리조트|풀빌라)/` → warm-natural
- `/(카페|음식점|식당|인테리어|리모델링)/` → light-clean
- 기본값 → light-clean

---

## 5. 고객 신청 플로우

```
[고객 포털] /dashboard → /homepage
└─ 프로젝트 없는 고객에게 템플릿 카드 4종 표시 (썸네일 + 업종 설명)
└─ [신청하기] 클릭
└─ homepage_requests INSERT (status: pending)
└─ "담당자 확인 후 진행" 안내

[어드민] /ops/homepage-requests
└─ 신청 목록 (신청일/고객명/템플릿/상태)
└─ 통계 카드 5종 (전체/대기/생성중/완료/전달)
└─ [생성 시작] → status: generating → generateFromTemplate() 실행
└─ 완료 시 status: completed + project_id 연결
└─ [전달완료] → status: delivered
```

---

## 6. DB 테이블

### homepage_requests (migration 070)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | gen_random_uuid() |
| client_id | UUID FK → clients | 고객 ID |
| template_name | VARCHAR(50) | dark-luxury / warm-natural / light-clean / 3d-glamping |
| status | VARCHAR(20) | pending / generating / completed / delivered / failed |
| note | TEXT | 고객 요청사항 |
| admin_note | TEXT | 어드민 메모 (실패 사유 등) |
| project_id | UUID FK → homepage_projects | 생성된 프로젝트 연결 |
| requested_by | UUID FK → users | 신청자 |
| generated_at | TIMESTAMPTZ | 생성 완료 시각 |
| delivered_at | TIMESTAMPTZ | 전달 완료 시각 |
| created_at | TIMESTAMPTZ | 신청 시각 |
| updated_at | TIMESTAMPTZ | 최종 수정 시각 |

인덱스: client_id, status, created_at DESC
RLS: authenticated 사용자 자기 client_id만 SELECT/INSERT

---

## 7. 레거시 코드 (유지, 미사용)

아래 파일들은 시도 1~3의 코드로, 삭제하지 않고 유지 중.
신규 생성에는 사용하지 않으며, 향후 정리 시 삭제 가능.

| 파일 | 원래 용도 |
|------|----------|
| lib/homepage/generate/reference-cloner.ts | DOM 복제 |
| lib/homepage/generate/content-mapper.ts | AI 텍스트 교체 맵 |
| lib/homepage/generate/image-replacer.ts | 이미지 카테고리 교체 |
| lib/homepage/generate/html-patcher.ts | cheerio DOM 패치 |
| lib/homepage/generate/screenshot-crawler.ts | Playwright 스크린샷 크롤러 |
| lib/homepage/generate/vision-to-html.ts | Vision AI → Tailwind HTML |
| lib/homepage/generate/homepage-screenshot-generator.ts | Screenshot-to-Code 오케스트레이터 |
| lib/homepage/generate/homepage-component-generator.ts | 컴포넌트 방식 오케스트레이터 |
| lib/homepage/generate/component-assembler.ts | 컴포넌트 Props 빌더 |
| lib/homepage/components/ | 16종 섹션 컴포넌트 라이브러리 |

---

## 8. 향후 계획

- 3D 템플릿 업종 확대 (피부과용 3D 파티클 씬 등)
  → Gemini AI Studio에서 씬 생성 후 슬롯 추가하는 방식으로 확장
- GrapesJS 에디터 임베드 → 고객이 직접 후보정 가능한 셀프서비스
- Google Search Console 연동으로 배포된 홈페이지 트래픽 추적
- template-selector.ts 자동 매칭 모듈 구현
