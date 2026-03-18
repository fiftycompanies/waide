# Phase 5 Contract: 빌드/배포 파이프라인

## 계약 개요
- **Phase**: 5
- **제목**: 빌드/배포 파이프라인
- **예상 기간**: 2일
- **선행 조건**: Phase 4 (홈페이지 템플릿 A 완료)
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-5.1: Vercel API 클라이언트 모듈
- **설명**: Vercel REST API를 래핑하는 TypeScript 클라이언트 모듈. Bearer Token 인증, 팀 계정 지원(teamId), 프로젝트 CRUD, 배포 트리거, 도메인 관리, 환경변수 관리 메서드를 포함한다. 에러 핸들링과 재시도(exponential backoff) 로직을 포함한다.
- **파일**: `lib/homepage/vercel.ts`
- **검증 방법**: Vercel API 호출 성공 (프로젝트 목록 조회 등), 에러 시 재시도 동작 확인

### D-5.2: 배포 Server Actions
- **설명**: 어드민에서 빌드/배포를 제어하는 Server Actions 집합.
- **파일**: `lib/homepage/actions/deploy.ts`
- **검증 방법**: 각 액션 호출 시 Vercel API 정상 호출, DB 상태 업데이트 확인
- **포함 액션**:
  - `createVercelProject()` — 신규 Vercel 프로젝트 생성, homepage_projects.vercel_project_id 저장
  - `deployHomepage()` — Git 기반 빌드 트리거, status = 'building'
  - `promoteToProduction()` — 프리뷰 → 프로덕션 프로모트, status = 'live'
  - `rollbackDeployment()` — 이전 배포 버전으로 롤백
  - `redeployHomepage()` — 데이터 변경 시 재배포 트리거

### D-5.3: 서브도메인 자동 설정
- **설명**: Vercel 프로젝트에 `{subdomain}.waide.kr` 도메인을 자동 연결하는 로직. DNS CNAME 와일드카드 설정을 전제로, Vercel API로 도메인 추가 및 SSL 인증서 자동 발급을 수행한다. 커스텀 도메인 추가도 지원한다.
- **파일**: `lib/homepage/actions/deploy.ts` (createVercelProject 내 포함)
- **검증 방법**: 프로젝트 생성 후 `{subdomain}.waide.kr` 접속 가능 확인

### D-5.4: 환경변수 자동 주입
- **설명**: Vercel 프로젝트 생성 시 필요한 환경변수(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PROJECT_ID, CLIENT_ID, SUBDOMAIN)를 production/preview/development 환경별로 자동 설정한다.
- **파일**: `lib/homepage/actions/deploy.ts` (createVercelProject 내 포함)
- **검증 방법**: Vercel 대시보드에서 환경변수 존재 확인, 빌드 시 환경변수 참조 정상

### D-5.5: Webhook 수신 라우트
- **설명**: Vercel 배포 이벤트를 수신하여 homepage_projects 상태를 자동 업데이트하는 Webhook 엔드포인트. 서명 검증(WEBHOOK_SECRET), 이벤트 타입별 처리(deployment.created, deployment.ready, deployment.error)를 포함한다.
- **파일**: `app/api/webhook/vercel/route.ts`
- **검증 방법**: Vercel Webhook 설정, 배포 이벤트 수신 시 DB 상태 변경 확인

### D-5.6: 배포 모니터링 UI
- **설명**: 어드민 프로젝트 상세에서 배포 상태를 실시간으로 모니터링하는 UI. 배포 상태 표시(폴링), 배포 이력 로그, 빌드 로그 뷰어, 롤백/재배포 버튼을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/_components/deploy-status.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/deploy-history.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/build-log-viewer.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/deploy-actions.tsx`
- **검증 방법**: 배포 중 상태 변화가 UI에 반영, 배포 이력 목록 표시, 롤백 버튼 동작

---

## 인수 기준 (Acceptance Criteria)

### AC-5.1: Vercel 프로젝트 자동 생성
- [ ] createVercelProject() 호출 시 Vercel에 프로젝트가 생성됨
- [ ] homepage_projects.vercel_project_id에 Vercel 프로젝트 ID 저장됨
- [ ] 환경변수 6개 자동 주입됨 (production/preview/development)

### AC-5.2: 서브도메인 접속
- [ ] `{subdomain}.waide.kr` 도메인이 Vercel 프로젝트에 연결됨
- [ ] HTTPS SSL 인증서 자동 발급됨
- [ ] 브라우저에서 `https://{subdomain}.waide.kr` 접속 가능

### AC-5.3: 빌드/배포 전체 흐름
- [ ] "빌드" 버튼 클릭 → Vercel 빌드 트리거 → status = 'building'
- [ ] 빌드 완료 → Webhook → status = 'preview', vercel_deployment_url 업데이트
- [ ] "프로덕션 프로모트" → status = 'live'
- [ ] 빌드 실패 → Webhook → status = 'build_failed'

### AC-5.4: 롤백
- [ ] 이전 배포 목록에서 선택하여 롤백 가능
- [ ] 롤백 후 해당 배포 URL로 서비스 전환

### AC-5.5: 재배포
- [ ] 데이터 변경(포트폴리오 추가, 후기 수정 등) 후 재배포 트리거 동작
- [ ] 재배포 완료 후 변경된 데이터 반영 확인

### AC-5.6: Webhook 보안
- [ ] Webhook 서명 검증 정상 (유효하지 않은 서명 → 401 응답)
- [ ] 지원하지 않는 이벤트 타입 → 무시(200 응답)

### AC-5.7: 배포 모니터링 UI
- [ ] 배포 중 상태가 실시간으로 UI에 반영됨 (10초 폴링)
- [ ] 배포 이력이 시간순으로 표시됨
- [ ] 빌드 로그를 터미널 스타일로 표시

---

## 테스트 요구사항 (Test Requirements)

### T-5.1: Vercel 프로젝트 생성 테스트
- **유형**: 통합
- **설명**: createVercelProject()를 호출하여 실제 Vercel 프로젝트가 생성되고 환경변수가 주입되는지 확인한다.
- **예상 결과**: Vercel API 200 응답, 프로젝트 ID 반환, 환경변수 6개 설정됨.

### T-5.2: 배포 트리거 테스트
- **유형**: 통합
- **설명**: deployHomepage()를 호출하여 Vercel 빌드가 트리거되고 homepage_projects.status가 'building'으로 변경되는지 확인한다.
- **예상 결과**: Vercel 배포 생성됨, DB status = 'building'.

### T-5.3: 서브도메인 접속 테스트
- **유형**: E2E
- **설명**: 프로젝트 생성 및 배포 완료 후 `https://{subdomain}.waide.kr`에 브라우저로 접속하여 홈페이지가 표시되는지 확인한다.
- **예상 결과**: 홈페이지 메인 페이지 렌더링, SSL 유효.

### T-5.4: Webhook 수신 테스트
- **유형**: 통합
- **설명**: 올바른 서명을 포함한 deployment.ready 이벤트를 POST /api/webhook/vercel에 전송하고, DB 상태가 업데이트되는지 확인한다.
- **예상 결과**: status = 'preview', vercel_deployment_url 업데이트됨.

### T-5.5: Webhook 서명 검증 테스트
- **유형**: 단위
- **설명**: 유효하지 않은 서명을 포함한 Webhook 요청이 401로 거부되는지 확인한다.
- **예상 결과**: 401 Unauthorized 응답.

### T-5.6: 롤백 테스트
- **유형**: 통합
- **설명**: rollbackDeployment()를 호출하여 이전 배포로 롤백하고, 해당 배포가 활성화되는지 확인한다.
- **예상 결과**: Vercel에서 지정된 배포가 프로덕션으로 프로모트됨.

### T-5.7: 재배포 테스트
- **유형**: 통합
- **설명**: redeployHomepage()를 호출하여 재빌드가 트리거되는지 확인한다.
- **예상 결과**: 새 배포가 시작됨, 완료 후 최신 데이터 반영.

---

## 의존성 (Dependencies)
- Phase 4: Next.js 템플릿 프로젝트가 Git 저장소에 존재
- Vercel API Token (팀 계정 권한)
- waide.kr 도메인 DNS 와일드카드 CNAME 설정 (`*.waide.kr → cname.vercel-dns.com`)
- WEBHOOK_SECRET 환경변수

## 위험 요소 (Risks)
- **Vercel API Rate Limit**: 대량 프로젝트 생성/배포 시 API 호출 제한에 걸릴 수 있음. 대응: 재시도 로직(exponential backoff), 배치 작업 큐 활용.
- **DNS 전파 지연**: 서브도메인 설정 후 DNS 전파에 시간이 걸릴 수 있음 (보통 수 분). 대응: UI에 "DNS 전파 중" 상태 표시, 최대 24시간 안내.
- **Vercel 프로젝트 수 제한**: Vercel Pro 플랜의 프로젝트 수 제한 확인 필요. 대응: 사전에 Vercel 플랜 확인, 필요 시 Enterprise 문의.
- **Webhook 유실**: 네트워크 이슈로 Webhook 이벤트가 유실될 수 있음. 대응: 폴링 기반 fallback (30초 간격으로 Vercel API 상태 확인).

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-5-detail.md`에서 통합되었습니다.

# Phase 5: 빌드/배포 파이프라인

## 개요
- **목적:** Vercel REST API를 활용하여 어드민에서 버튼 한 번으로 홈페이지를 자동 빌드/배포하고, 서브도메인(`{업체}.waide.kr`)을 자동 설정하는 파이프라인을 구축한다.
- **예상 기간:** 2일
- **선행 조건:** Phase 4 (홈페이지 템플릿 A 완료)
- **산출물:** Vercel API 클라이언트, 배포 Server Actions, Webhook 수신 라우트, 어드민 배포 UI

> **상세 기획서:** [docs/phase5-vercel-deploy-plan.md](/docs/phase5-vercel-deploy-plan.md)

---

## 상세 작업 요약

### 5.1 Vercel API 클라이언트 (lib/vercel.ts)
- Vercel REST API 인증 설정 (Bearer Token)
- 팀 계정 지원 (teamId 파라미터)
- 프로젝트 CRUD, 배포 트리거, 도메인 관리, 환경변수 관리 메서드
- 에러 핸들링 및 재시도 로직

### 5.2 배포 Server Actions
- `createVercelProject()` — 신규 Vercel 프로젝트 생성
- `deployHomepage()` — 빌드 트리거 (Git 또는 소스 업로드)
- `promoteToProduction()` — 프리뷰 → 라이브 프로모트
- `rollbackDeployment()` — 이전 배포로 롤백
- `redeployHomepage()` — 데이터 변경 시 재배포

### 5.3 서브도메인 자동 설정
- `{subdomain}.waide.kr` 도메인 자동 연결
- DNS CNAME 설정 (Vercel → waide.kr 와일드카드)
- SSL 인증서 자동 발급 (Vercel 제공)
- 커스텀 도메인 추가 지원

### 5.4 환경변수 자동 주입
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PROJECT_ID`, `CLIENT_ID`, `SUBDOMAIN`
- production/preview/development 환경별 분리

### 5.5 Webhook 수신 (배포 상태 업데이트)
- POST `/api/webhook/vercel` — 배포 상태 이벤트 수신
- `deployment.created` → status = 'building'
- `deployment.ready` → status = 'preview', vercel_deployment_url 업데이트
- `deployment.error` → status = 'build_failed'
- 서명 검증 (WEBHOOK_SECRET)

### 5.6 배포 모니터링 UI
- 배포 상태 실시간 표시 (폴링 또는 SSE)
- 배포 이력 로그
- 빌드 로그 뷰어 (Vercel API)
- 롤백 버튼

---

## 테스트 계획
- [ ] Vercel 프로젝트 생성 API 정상 동작
- [ ] 환경변수 자동 주입 확인
- [ ] 배포 트리거 → 빌드 → 완료 전체 흐름 확인
- [ ] 서브도메인 접속 확인
- [ ] Webhook 수신 및 상태 업데이트 확인
- [ ] 롤백 동작 확인
- [ ] 재배포 트리거 확인

## 완료 기준
- [ ] "빌드" 버튼 → Vercel 자동 배포 완료
- [ ] `{subdomain}.waide.kr` 접속 가능
- [ ] 배포 상태 실시간 모니터링 정상
- [ ] 롤백 기능 정상
- [ ] 환경변수 자동 주입 정상
