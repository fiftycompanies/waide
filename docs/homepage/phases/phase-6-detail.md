# Phase 6: 블로그 대량발행 연동

## 개요
- **목적:** waide-mkt 기존 블로그 발행 시스템(SEO Writer, QC, Publisher 에이전트)과 홈페이지 블로그를 통합하여, 키워드 기반 대량 발행 파이프라인을 구축한다.
- **예상 기간:** 2일
- **선행 조건:** Phase 5 (배포 파이프라인), 기존 블로그 발행 시스템 동작 중
- **산출물:** 콘텐츠 타입 확장, 발행 플랫폼 확장, 월간 스케줄러 통합, 어드민 UI

> **상세 기획서:** [docs/phase6-blog-publishing-plan.md](/docs/phase6-blog-publishing-plan.md)

---

## 상세 작업 요약

### 6.1 콘텐츠 타입 확장
- contents.content_type에 `hp_blog_info`, `hp_blog_review` 추가 (Phase 1에서 스키마 완료)
- 콘텐츠 생성 프롬프트 확장:
  - `hp_blog_info` — 정보성 블로그 (비용 가이드, 인테리어 팁, 트렌드)
  - `hp_blog_review` — 후기성 블로그 (시공 사례, Before/After, 견적 공개)
- SEO Writer 에이전트에 인테리어 전용 프롬프트 템플릿 추가
- QC 에이전트에 인테리어 블로그 품질 기준 추가

### 6.2 발행 플랫폼 확장
- publishing_accounts에 `homepage` 플랫폼 추가
- publications에 `homepage` 플랫폼 발행 기록 저장
- 발행 로직: contents INSERT 시 자동으로 홈페이지 블로그 페이지에 반영 (SSG/ISR)
- 네이버 블로그 동시 발행 옵션 (cross-posting)

### 6.3 월간 발행 스케줄러 통합
- 기존 `/api/cron/scheduled-publish` 크론잡 확장
- homepage_projects의 blog_config 기반 월간 발행 계획:
  - `posts_per_month`: 기본 8개
  - `info_ratio`: 정보성 비율 (기본 50%)
  - `review_ratio`: 후기성 비율 (기본 50%)
- 키워드 로테이션: 미발행 키워드 우선 선택
- 콘텐츠 캘린더 자동 생성

### 6.4 초기 블로그 8개 자동 생성
- 홈페이지 빌드 시 초기 블로그 8개 자동 생성:
  - 정보성 4개 (비용, 트렌드, 선택 가이드, 프로세스)
  - 후기성 4개 (포트폴리오 기반 시공 사례)
- 브랜드 페르소나 기반 톤 & 스타일 적용
- QC 점수 70점 이상 필터링

### 6.5 어드민 블로그 관리 UI
- 프로젝트 상세 → 블로그 탭 추가
- 발행된 블로그 글 목록 (제목, 키워드, 타입, 발행일, 품질 점수)
- 수동 글 작성/편집 기능
- 발행 스케줄 설정 UI
- 키워드-블로그 연동 현황 차트

---

## 테스트 계획
- [ ] hp_blog_info / hp_blog_review 콘텐츠 생성 정상 동작
- [ ] QC 에이전트 품질 검수 통과 확인
- [ ] publishing_accounts에 homepage 플랫폼 등록 확인
- [ ] 발행 후 홈페이지 블로그 페이지 반영 확인
- [ ] 월간 스케줄러에서 자동 발행 동작 확인
- [ ] 초기 블로그 8개 자동 생성 확인
- [ ] 네이버 블로그 동시 발행 확인 (옵션)

## 완료 기준
- [ ] 콘텐츠 타입 확장 및 생성 프롬프트 완료
- [ ] 발행 플랫폼 `homepage` 추가 완료
- [ ] 월간 스케줄러 통합 완료
- [ ] 초기 블로그 8개 자동 생성 동작 확인
- [ ] 어드민 블로그 관리 UI 구현 완료
