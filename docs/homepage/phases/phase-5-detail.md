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
