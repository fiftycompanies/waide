# Phase 6 Contract: 블로그 대량발행 연동

## 계약 개요
- **Phase**: 6
- **제목**: 블로그 대량발행 연동
- **예상 기간**: 2일
- **선행 조건**: Phase 5 (배포 파이프라인), 기존 블로그 발행 시스템(SEO Writer, QC, Publisher 에이전트) 동작 중
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-6.1: 콘텐츠 타입 확장 및 프롬프트 템플릿
- **설명**: 기존 SEO Writer 에이전트에 인테리어 전용 콘텐츠 타입(hp_blog_info, hp_blog_review)의 프롬프트 템플릿을 추가한다. 정보성(비용 가이드, 인테리어 팁, 트렌드)과 후기성(시공 사례, Before/After, 견적 공개) 블로그 생성을 지원한다.
- **파일**:
  - `lib/ai/prompts/hp-blog-info.ts` (정보성 블로그 프롬프트 템플릿)
  - `lib/ai/prompts/hp-blog-review.ts` (후기성 블로그 프롬프트 템플릿)
  - `lib/ai/generate-content.ts` (수정 — hp_blog_info, hp_blog_review 분기 추가)
- **검증 방법**: content_type='hp_blog_info'로 콘텐츠 생성 API 호출 시 인테리어 전용 프롬프트 적용 확인

### D-6.2: QC 에이전트 인테리어 품질 기준 추가
- **설명**: 기존 QC 에이전트에 인테리어 블로그 전용 품질 검수 기준을 추가한다. 시공 사례의 구체성, 비용 정보의 신뢰성, Before/After 언급 여부 등을 평가한다.
- **파일**: `lib/ai/qc/interior-criteria.ts` (인테리어 QC 기준)
- **검증 방법**: hp_blog_info, hp_blog_review 콘텐츠에 대해 QC 점수 산출 확인, 70점 미만 콘텐츠 필터링

### D-6.3: 발행 플랫폼 'homepage' 추가
- **설명**: publishing_accounts 테이블에 'homepage' 플랫폼을 추가하고, Publisher 에이전트에서 홈페이지 블로그로 발행하는 로직을 구현한다. 발행 시 contents.publish_status를 'published'로 업데이트하면 홈페이지 블로그 페이지에서 ISR로 자동 반영된다.
- **파일**:
  - `lib/publishing/platforms/homepage.ts` (홈페이지 발행 플랫폼 모듈)
  - `lib/publishing/publisher.ts` (수정 — 'homepage' 플랫폼 분기 추가)
- **검증 방법**: publishing_accounts에 homepage 플랫폼 등록, publications에 발행 기록 저장, 홈페이지 블로그에 글 표시

### D-6.4: 월간 발행 스케줄러 통합
- **설명**: 기존 `/api/cron/scheduled-publish` 크론잡을 확장하여 홈페이지 블로그 월간 발행 계획을 자동 실행한다. homepage_projects.blog_config(posts_per_month, info_ratio, review_ratio)를 기반으로 키워드 선택, 콘텐츠 생성, 발행을 수행한다.
- **파일**:
  - `app/api/cron/scheduled-publish/route.ts` (수정 — 홈페이지 블로그 스케줄 추가)
  - `lib/homepage/actions/blog-scheduler.ts` (월간 발행 계획 생성 로직)
- **검증 방법**: 크론잡 실행 시 홈페이지 프로젝트별 블로그 발행 트리거, 미발행 키워드 우선 선택 확인

### D-6.5: 초기 블로그 8개 자동 생성
- **설명**: 홈페이지 빌드 시 초기 블로그 8개(정보성 4개 + 후기성 4개)를 자동 생성하는 로직. 브랜드 페르소나 기반 톤 적용, QC 70점 이상 필터링을 포함한다.
- **파일**: `lib/homepage/actions/generate-initial-blogs.ts`
- **검증 방법**: 프로젝트 빌드 트리거 시 contents 테이블에 8개 레코드 INSERT 확인, content_type 분포 확인

### D-6.6: 어드민 블로그 관리 UI
- **설명**: 프로젝트 상세 페이지에 블로그 탭을 추가한다. 발행된 블로그 글 목록(제목, 키워드, 타입, 발행일, 품질 점수), 수동 글 작성/편집, 발행 스케줄 설정을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/blog/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/blog/_components/blog-list.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/blog/_components/blog-editor.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/blog/_components/schedule-settings.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/blog/_components/keyword-blog-chart.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/blog/actions.ts`
- **검증 방법**: 블로그 목록 표시, 수동 글 작성/편집 동작, 스케줄 설정 저장/조회

---

## 인수 기준 (Acceptance Criteria)

### AC-6.1: 콘텐츠 생성
- [ ] POST /api/ai/generate-content에 contentType='hp_blog_info'로 호출 시 정보성 블로그 생성됨
- [ ] POST /api/ai/generate-content에 contentType='hp_blog_review'로 호출 시 후기성 블로그 생성됨
- [ ] 생성된 콘텐츠에 brand_persona 기반 톤 적용됨
- [ ] 생성된 콘텐츠에 인테리어 전용 구조(비용표, Before/After 등) 포함

### AC-6.2: 품질 검수
- [ ] QC 에이전트가 hp_blog_info, hp_blog_review 콘텐츠를 평가함
- [ ] quality_score >= 70인 콘텐츠만 발행 대상
- [ ] quality_score < 70인 콘텐츠는 재생성 또는 수동 편집 대기

### AC-6.3: 홈페이지 발행
- [ ] publishing_accounts에 platform='homepage' 레코드 등록됨
- [ ] 콘텐츠 발행 시 publications 테이블에 platform='homepage' 기록 저장
- [ ] 발행된 콘텐츠가 홈페이지 /blog 페이지에 표시됨 (ISR 갱신 이내)

### AC-6.4: 월간 스케줄러
- [ ] /api/cron/scheduled-publish 실행 시 홈페이지 프로젝트별 블로그 발행 처리
- [ ] blog_config.posts_per_month 설정에 따라 올바른 수의 콘텐츠 생성
- [ ] info_ratio, review_ratio 비율에 맞게 정보성/후기성 분배
- [ ] 미발행 키워드가 우선 선택됨 (키워드 로테이션)

### AC-6.5: 초기 블로그
- [ ] 프로젝트 빌드 시 정보성 4개 + 후기성 4개 = 8개 블로그 자동 생성
- [ ] 모든 초기 블로그의 quality_score >= 70
- [ ] 초기 블로그에 프로젝트 키워드 적용

### AC-6.6: 네이버 블로그 동시 발행 (옵션)
- [ ] blog_config에 cross_posting.naver = true 설정 시 네이버 블로그에도 발행
- [ ] 네이버 발행 실패 시 홈페이지 발행에 영향 없음

---

## 테스트 요구사항 (Test Requirements)

### T-6.1: 콘텐츠 생성 API 테스트
- **유형**: 통합
- **설명**: contentType='hp_blog_info'와 'hp_blog_review'로 각각 콘텐츠 생성 API를 호출하고, 올바른 형식의 콘텐츠가 생성되는지 확인한다.
- **예상 결과**: contents 테이블에 레코드 생성, content_type 정확, 본문에 인테리어 관련 내용 포함.

### T-6.2: QC 품질 검수 테스트
- **유형**: 통합
- **설명**: 생성된 hp_blog_info, hp_blog_review 콘텐츠에 대해 QC 에이전트를 실행하고 quality_score가 산출되는지 확인한다.
- **예상 결과**: quality_score 0~100 범위 산출, 인테리어 전용 기준 적용됨.

### T-6.3: 홈페이지 발행 플로우 테스트
- **유형**: 통합
- **설명**: 콘텐츠 생성 → QC 통과 → 홈페이지 발행 전체 흐름을 테스트한다.
- **예상 결과**: publishing_accounts에 homepage 존재, publications에 기록 생성, 홈페이지 /blog에 표시.

### T-6.4: 월간 스케줄러 테스트
- **유형**: 통합
- **설명**: /api/cron/scheduled-publish를 수동 호출하고, 홈페이지 프로젝트에 대한 블로그 발행이 실행되는지 확인한다.
- **예상 결과**: blog_config 설정에 따라 콘텐츠 생성 및 발행 처리.

### T-6.5: 초기 블로그 자동 생성 테스트
- **유형**: 통합
- **설명**: 프로젝트 빌드 트리거 시 generateInitialBlogs()가 실행되어 8개 블로그가 생성되는지 확인한다.
- **예상 결과**: contents 테이블에 8개 레코드 (hp_blog_info 4개 + hp_blog_review 4개).

### T-6.6: 키워드 로테이션 테스트
- **유형**: 단위
- **설명**: 이미 발행된 키워드와 미발행 키워드가 있을 때, 미발행 키워드가 우선 선택되는지 확인한다.
- **예상 결과**: metadata.publish_count가 0인 키워드가 우선 선택됨.

### T-6.7: 블로그 관리 UI 테스트
- **유형**: E2E
- **설명**: 프로젝트 상세 블로그 탭에서 글 목록 표시, 수동 글 작성, 스케줄 설정을 테스트한다.
- **예상 결과**: 모든 CRUD 동작 정상, 스케줄 설정 저장/조회 정상.

---

## 의존성 (Dependencies)
- Phase 1: contents.content_type에 'hp_blog_info', 'hp_blog_review' 허용
- Phase 3: keywords 테이블에 blog_target 소스 키워드 존재
- Phase 4: 홈페이지 /blog 페이지에서 contents 데이터 렌더링 (ISR)
- Phase 5: 재배포 트리거로 ISR 캐시 즉시 무효화 가능
- 기존 waide-mkt: SEO Writer 에이전트, QC 에이전트, Publisher 에이전트, 크론잡 시스템

## 위험 요소 (Risks)
- **AI 콘텐츠 품질 편차**: 인테리어 전용 프롬프트에서도 품질이 일정하지 않을 수 있음. 대응: QC 기준 강화, 70점 미만 재생성 로직 추가, 최대 3회 재시도.
- **크론잡 실행 시간 초과**: 다수 프로젝트에 대해 동시 콘텐츠 생성 시 크론잡 타임아웃 가능. 대응: 프로젝트별 순차 처리, 작업 큐(jobs 테이블) 활용으로 비동기 처리.
- **ISR 캐시 갱신 지연**: 블로그 발행 후 홈페이지에 즉시 반영되지 않을 수 있음 (최대 1시간). 대응: 발행 완료 시 재배포 트리거(Phase 5)로 즉시 갱신, 또는 On-demand ISR 활용.
- **네이버 블로그 동시 발행 실패**: 네이버 API 이슈로 동시 발행 실패 시 메인 발행에 영향 줄 수 있음. 대응: 홈페이지 발행과 네이버 발행을 독립적으로 처리, 실패 시 별도 재시도 큐.

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-6-detail.md`에서 통합되었습니다.

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
