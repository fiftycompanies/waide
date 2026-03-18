# Phase 7 Contract: 템플릿 B, C

## 계약 개요
- **Phase**: 7
- **제목**: 템플릿 B (내추럴 우드), 템플릿 C (프리미엄 다크)
- **예상 기간**: 3일
- **선행 조건**: Phase 4 (Template A 완료), Phase 5 (배포 파이프라인)
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-7.1: 공유 컴포넌트 추출
- **설명**: Template A에서 모든 템플릿이 공통으로 사용하는 로직/컴포넌트를 `templates/shared/`로 추출한다. 데이터 레이어, Supabase 클라이언트, JSON-LD 컴포넌트, 상담 API, 공통 타입을 포함한다.
- **파일**:
  - `templates/shared/data/config.ts` (getHomepageConfig — 전 템플릿 공유)
  - `templates/shared/lib/supabase.ts` (Supabase 클라이언트)
  - `templates/shared/components/JsonLd.tsx` (구조화 데이터)
  - `templates/shared/api/inquiry/route.ts` (상담 API)
  - `templates/shared/types/index.ts` (HomepageConfig, Portfolio, Review 등 타입)
- **검증 방법**: Template A를 공유 모듈로 리팩토링 후 기존 기능 정상 동작 확인

### D-7.2: Template B — 내추럴 우드 (Natural Wood)
- **설명**: 따뜻하고 감성적인 우드톤 디자인의 두 번째 템플릿. 신혼부부/가족 대상 인테리어 업체에 최적화된다.
- **파일**:
  - `templates/natural-wood/app/layout.tsx`
  - `templates/natural-wood/app/page.tsx`
  - `templates/natural-wood/app/globals.css` (웜화이트 배경, 우드브라운/올리브 포인트)
  - `templates/natural-wood/app/portfolio/[slug]/page.tsx`
  - `templates/natural-wood/app/blog/page.tsx`
  - `templates/natural-wood/app/blog/[slug]/page.tsx`
  - `templates/natural-wood/app/contact/page.tsx`
  - `templates/natural-wood/app/faq/page.tsx`
  - `templates/natural-wood/app/sitemap.ts`
  - `templates/natural-wood/app/robots.ts`
  - `templates/natural-wood/components/home/Hero.tsx` (대형 감성 사진 + 부드러운 타이포)
  - `templates/natural-wood/components/home/Portfolio.tsx` (2열 카드 + 둥근 모서리)
  - `templates/natural-wood/components/home/Reviews.tsx` (감성적 캐러셀)
  - `templates/natural-wood/components/layout/Nav.tsx` (세리프 폰트 로고)
  - `templates/natural-wood/components/layout/Footer.tsx`
  - `templates/natural-wood/components/layout/FloatingCTA.tsx`
- **검증 방법**: 전체 페이지 렌더링 확인, 색상 테마(#FEFCF9, #8B6914, #6B7B3A) 적용 확인, Noto Serif KR 폰트 적용 확인
- **디자인 스펙**:
  - 배경: 웜화이트 (#FEFCF9)
  - 포인트: 우드브라운 (#8B6914), 올리브 (#6B7B3A)
  - 제목 폰트: Noto Serif KR
  - 본문 폰트: Pretendard
  - 히어로: 대형 감성 사진 + 부드러운 타이포그래피
  - 갤러리: 2열 카드 레이아웃 + 둥근 모서리 (border-radius: 16px)
  - 애니메이션: 부드러운 페이드인 + 패럴랙스 스크롤

### D-7.3: Template C — 프리미엄 다크 (Premium Dark)
- **설명**: 고급스러운 다크 테마의 세 번째 템플릿. 40-50대 고소득층 대상 프리미엄 인테리어 업체에 최적화된다.
- **파일**:
  - `templates/premium-dark/app/layout.tsx`
  - `templates/premium-dark/app/page.tsx`
  - `templates/premium-dark/app/globals.css` (다크 배경, 골드 포인트)
  - `templates/premium-dark/app/portfolio/[slug]/page.tsx`
  - `templates/premium-dark/app/blog/page.tsx`
  - `templates/premium-dark/app/blog/[slug]/page.tsx`
  - `templates/premium-dark/app/contact/page.tsx`
  - `templates/premium-dark/app/faq/page.tsx`
  - `templates/premium-dark/app/sitemap.ts`
  - `templates/premium-dark/app/robots.ts`
  - `templates/premium-dark/components/home/Hero.tsx` (풀스크린 비디오/시네마그래프)
  - `templates/premium-dark/components/home/Portfolio.tsx` (풀스크린 갤러리 + 라이트박스)
  - `templates/premium-dark/components/home/Reviews.tsx` (프리미엄 레이아웃)
  - `templates/premium-dark/components/layout/Nav.tsx` (다크 테마 네비게이션)
  - `templates/premium-dark/components/layout/Footer.tsx`
  - `templates/premium-dark/components/layout/FloatingCTA.tsx`
- **검증 방법**: 전체 페이지 렌더링 확인, 색상 테마(#0A0A0A, #C9A96E, #F5F0EB) 적용 확인, Playfair Display 폰트 적용 확인
- **디자인 스펙**:
  - 배경: 다크 (#0A0A0A)
  - 포인트: 골드 (#C9A96E), 오프화이트 (#F5F0EB)
  - 제목 폰트: Playfair Display
  - 본문 폰트: Pretendard
  - 히어로: 풀스크린 비디오 또는 시네마그래프
  - 갤러리: 풀스크린 이미지 갤러리 + 라이트박스
  - 애니메이션: 시네마틱 트랜지션 + 타이핑 효과

### D-7.4: 템플릿 전환 메커니즘
- **설명**: 어드민에서 template_id를 변경하면 재배포를 트리거하여 다른 템플릿으로 전환하는 메커니즘. 환경변수 TEMPLATE_ID로 빌드 시 템플릿을 선택한다. 데이터 구조는 동일하므로 마이그레이션 불필요하다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/_components/template-switcher.tsx` (템플릿 전환 UI)
  - `lib/homepage/actions/deploy.ts` (수정 — template_id 변경 시 환경변수 업데이트 + 재배포)
- **검증 방법**: 어드민에서 template_id 변경 → 재배포 → 변경된 템플릿 렌더링 확인

### D-7.5: 3종 템플릿 프리뷰 비교 기능
- **설명**: 어드민에서 현재 데이터를 3종 템플릿으로 동시에 프리뷰할 수 있는 비교 기능. iframe 또는 스크린샷 기반으로 3종 나란히 표시한다.
- **파일**: `app/(dashboard)/dashboard/homepage/[id]/_components/template-comparison.tsx`
- **검증 방법**: 3종 템플릿 프리뷰가 나란히 표시, 각 템플릿별 고유 스타일 구분 가능

---

## 인수 기준 (Acceptance Criteria)

### AC-7.1: 공유 컴포넌트 분리
- [ ] Template A가 `templates/shared/` 모듈을 참조하여 기존과 동일하게 동작
- [ ] getHomepageConfig()이 모든 템플릿에서 동일한 데이터 반환
- [ ] 상담 API가 모든 템플릿에서 동일하게 동작

### AC-7.2: Template B 완성도
- [ ] 메인 페이지 10개 섹션 모두 렌더링
- [ ] 웜화이트 배경, 우드브라운/올리브 포인트 색상 적용
- [ ] Noto Serif KR 제목 폰트 적용
- [ ] 2열 카드 갤러리 + 둥근 모서리 레이아웃
- [ ] 부드러운 페이드인 + 패럴랙스 스크롤 애니메이션
- [ ] 블로그, 포트폴리오 상세, FAQ, 상담 페이지 정상 동작
- [ ] 반응형 디자인 (모바일/태블릿/데스크톱)

### AC-7.3: Template C 완성도
- [ ] 메인 페이지 10개 섹션 모두 렌더링
- [ ] 다크 배경, 골드 포인트, 오프화이트 텍스트 적용
- [ ] Playfair Display 제목 폰트 적용
- [ ] 풀스크린 갤러리 + 라이트박스 레이아웃
- [ ] 시네마틱 트랜지션 + 타이핑 효과 애니메이션
- [ ] 블로그, 포트폴리오 상세, FAQ, 상담 페이지 정상 동작
- [ ] 반응형 디자인 (모바일/태블릿/데스크톱)

### AC-7.4: 템플릿 전환
- [ ] 어드민에서 template_id 변경 시 재배포 트리거됨
- [ ] 재배포 후 변경된 템플릿 렌더링 확인
- [ ] 데이터는 유지되며 템플릿만 변경됨

### AC-7.5: 성능
- [ ] Template B Lighthouse Performance > 90
- [ ] Template C Lighthouse Performance > 90
- [ ] Template B Lighthouse SEO > 95
- [ ] Template C Lighthouse SEO > 95

### AC-7.6: 각 템플릿 고유 아이덴티티
- [ ] Template A, B, C가 시각적으로 명확하게 구분됨
- [ ] 각 템플릿의 타겟 고객층에 적합한 분위기 전달

---

## 테스트 요구사항 (Test Requirements)

### T-7.1: Template B 렌더링 테스트
- **유형**: E2E
- **설명**: Template B의 메인 페이지, 포트폴리오 상세, 블로그 목록/상세, FAQ, 상담 페이지가 모두 정상 렌더링되는지 확인한다.
- **예상 결과**: 모든 페이지 렌더링 성공, 디자인 스펙(색상, 폰트, 레이아웃) 일치.

### T-7.2: Template C 렌더링 테스트
- **유형**: E2E
- **설명**: Template C의 메인 페이지, 포트폴리오 상세, 블로그 목록/상세, FAQ, 상담 페이지가 모두 정상 렌더링되는지 확인한다.
- **예상 결과**: 모든 페이지 렌더링 성공, 디자인 스펙(색상, 폰트, 레이아웃) 일치.

### T-7.3: 공유 컴포넌트 호환성 테스트
- **유형**: 통합
- **설명**: getHomepageConfig(), 상담 API, JSON-LD 컴포넌트를 3개 템플릿에서 각각 호출하여 동일한 결과를 반환하는지 확인한다.
- **예상 결과**: 3개 템플릿에서 동일한 데이터, 동일한 API 응답.

### T-7.4: 템플릿 전환 테스트
- **유형**: E2E
- **설명**: 어드민에서 template_id를 A→B로 변경하고 재배포 후, 홈페이지가 Template B로 렌더링되는지 확인한다.
- **예상 결과**: 재배포 완료 후 Template B 디자인 적용, 데이터 유지.

### T-7.5: 반응형 디자인 테스트 (B, C)
- **유형**: E2E
- **설명**: Template B, C를 각각 320px, 768px, 1280px 뷰포트에서 렌더링하여 레이아웃 깨짐이 없는지 확인한다.
- **예상 결과**: 각 브레이크포인트에서 정상 레이아웃.

### T-7.6: Lighthouse 성능 테스트 (B, C)
- **유형**: E2E
- **설명**: Template B, C 각각에 대해 Lighthouse를 실행하고 점수를 확인한다.
- **예상 결과**: Performance > 90, SEO > 95, Accessibility > 90.

### T-7.7: 프리뷰 비교 기능 테스트
- **유형**: E2E
- **설명**: 어드민에서 3종 템플릿 비교 뷰를 열고, 3개 템플릿이 나란히 표시되는지 확인한다.
- **예상 결과**: 3종 템플릿이 시각적으로 구분되어 표시.

---

## 의존성 (Dependencies)
- Phase 4: Template A 소스코드 (공유 컴포넌트 추출 대상)
- Phase 5: 배포 파이프라인 (템플릿 전환 시 재배포 트리거)
- Google Fonts: Noto Serif KR (Template B), Playfair Display (Template C)

## 위험 요소 (Risks)
- **공유 컴포넌트 추출 시 Template A 회귀**: 리팩토링 과정에서 Template A의 기존 기능이 깨질 수 있음. 대응: Template A E2E 테스트 우선 작성 후 리팩토링, 변경 후 회귀 테스트.
- **풀스크린 비디오 성능**: Template C의 히어로 비디오가 모바일에서 성능 저하를 유발할 수 있음. 대응: 모바일에서는 비디오 대신 정적 이미지 fallback, 비디오 lazy loading.
- **Playfair Display 한글 미지원**: Playfair Display 폰트가 한글을 지원하지 않음. 대응: 제목에서 영문은 Playfair Display, 한글은 Pretendard로 폰트 스택 설정.
- **3개 템플릿 동시 프리뷰 리소스**: iframe 3개 동시 로드 시 브라우저 메모리 부하. 대응: 스크린샷 기반 정적 비교로 대체 가능.

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-7-detail.md`에서 통합되었습니다.

# Phase 7: 템플릿 B, C (내추럴 우드 / 프리미엄 다크)

## 개요
- **목적:** 모던 미니멀(Template A) 외에 내추럴 우드(Template B)와 프리미엄 다크(Template C) 2개 추가 템플릿을 개발하고, 어드민에서 템플릿 전환이 가능한 시스템을 구축한다.
- **예상 기간:** 3일
- **선행 조건:** Phase 4 (Template A 완료), Phase 5 (배포 파이프라인)
- **산출물:** 2개 추가 템플릿, 공유 컴포넌트 추출, 템플릿 전환 메커니즘

> **상세 기획서:** [docs/phase7-templates-bc-plan.md](/docs/phase7-templates-bc-plan.md)

---

## 상세 작업 요약

### 7.1 공통 아키텍처 — 공유 컴포넌트 추출
- Template A에서 공통 로직을 `templates/shared/`로 추출:
  - `data/config.ts` — getHomepageConfig() (전 템플릿 공유)
  - `lib/supabase.ts` — Supabase 클라이언트
  - `components/JsonLd.tsx` — 구조화 데이터 컴포넌트
  - `api/inquiry/route.ts` — 상담 신청 API
  - `types/index.ts` — 공통 타입 정의
- 독립 유지: CSS 테마 변수, 레이아웃, 섹션 컴포넌트

### 7.2 Template B: 내추럴 우드 (Natural Wood)
- **디자인 콘셉트:** 따뜻하고 감성적인 우드톤 디자인
- **타겟:** 신혼부부, 가족 대상 인테리어 업체
- **색상:** 웜화이트(#FEFCF9), 우드브라운(#8B6914), 올리브(#6B7B3A)
- **폰트:** Noto Serif KR (제목), Pretendard (본문)
- **히어로:** 대형 감성 사진 + 부드러운 타이포그래피
- **갤러리:** 2열 카드 레이아웃 + 둥근 모서리
- **애니메이션:** 부드러운 페이드인, 패럴랙스 스크롤

### 7.3 Template C: 프리미엄 다크 (Premium Dark)
- **디자인 콘셉트:** 고급스러운 다크 테마
- **타겟:** 40-50대 고소득층 대상 프리미엄 인테리어 업체
- **색상:** 다크(#0A0A0A), 골드(#C9A96E), 오프화이트(#F5F0EB)
- **폰트:** Playfair Display (제목), Pretendard (본문)
- **히어로:** 풀스크린 비디오 또는 시네마 그래프
- **갤러리:** 풀스크린 이미지 갤러리 + 라이트박스
- **애니메이션:** 시네마틱 트랜지션, 타이핑 효과

### 7.4 템플릿 전환 메커니즘
- 어드민에서 template_id 변경 → 재배포 트리거
- 환경변수 `TEMPLATE_ID`로 빌드 시 템플릿 선택
- 데이터 구조 동일 → 템플릿 변경 시 데이터 마이그레이션 불필요
- 프리뷰에서 3종 비교 기능

### 7.5 템플릿 비교표

| 항목 | A: 모던 미니멀 | B: 내추럴 우드 | C: 프리미엄 다크 |
|------|---------------|---------------|-----------------|
| 배경 | 화이트 (#fff) | 웜화이트 (#FEFCF9) | 다크 (#0A0A0A) |
| 포인트 | 업체 컬러 / 블루 | 우드브라운 / 올리브 | 골드 (#C9A96E) |
| 폰트 | Pretendard | Noto Serif KR | Playfair Display |
| 히어로 | 이미지 슬라이더 | 대형 감성 사진 | 풀스크린 비디오 |
| 갤러리 | 3열 그리드 필터 | 2열 카드 | 풀스크린 갤러리 |
| 톤 | 깔끔, 전문적 | 따뜻한, 감성적 | 고급, 프리미엄 |
| 타겟 | 20-30대 | 신혼/가족 | 40-50대 고소득 |

---

## 테스트 계획
- [ ] Template B 전체 페이지 렌더링 확인
- [ ] Template C 전체 페이지 렌더링 확인
- [ ] 공유 컴포넌트 3개 템플릿에서 정상 동작 확인
- [ ] 템플릿 전환 → 재배포 → 정상 표시 확인
- [ ] 반응형 디자인 3개 템플릿 모두 확인
- [ ] Lighthouse 점수 3개 템플릿 모두 기준 달성

## 완료 기준
- [ ] Template B (내추럴 우드) 구현 완료
- [ ] Template C (프리미엄 다크) 구현 완료
- [ ] 공유 컴포넌트 추출 및 분리 완료
- [ ] 어드민 템플릿 전환 기능 구현 완료
- [ ] 3종 템플릿 프리뷰 비교 기능 구현 완료
