# Task: IA 구조 변경 — SEO & AEO 메뉴 통합 + 탭 구조

status: pending
priority: high
squad: all
created: 2026-03-07
phase: 1

## 목표

사이드바 메뉴를 "SEO & AEO" 통합 구조로 변경. 각 메뉴 내부는 탭으로 단계 표현. 캠페인 기획을 콘텐츠 관리에 흡수.

## 배경

현재 사이드바는 기능별로 분산되어 있어 SEO와 AEO를 통합 관리하기 어렵다. MASTER_ROADMAP.md의 IA 구조에 따라 메뉴를 재편성하여 고객과 어드민 모두 SEO+AEO를 하나의 흐름으로 관리할 수 있도록 한다.

## 작업 내용

(PM이 Phase 1 세부 기획 후 업데이트 예정)

## 기술 결정 사항

- 사이드바: components/dashboard/app-sidebar.tsx 수정
- 탭 구조: shadcn/ui Tabs 컴포넌트 활용
- 포털 사이드바: components/portal/portal-shell.tsx 수정

## DB 변경

없음 (UI 변경만)

## 제약 조건

- 기존 라우트 경로 유지 (리디렉트로 호환)
- 포털과 어드민 메뉴 동기화
- 역할 기반 메뉴 필터링 유지 (admin_users.role)

## 참조

- MASTER_ROADMAP.md Phase 1 섹션
- 최종 메뉴 구조: MASTER_ROADMAP.md IA 구조 (섹션 3)

## 완료 기준

- [ ] 코드 작성 완료
- [ ] tsc --noEmit 통과
- [ ] npm run build 통과
- [ ] CLAUDE.md 업데이트
- [ ] 커밋+푸시

## 결과 (완료 후 기록)

- 신규 파일:
- 수정 파일:
- 마이그레이션:
