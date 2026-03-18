# Phase 5: Vercel 빌드/배포 파이프라인 기획서

> 작성일: 2026-03-17
> 프로젝트: waide-mkt(ai-marketer) 인테리어 업체 홈페이지 자동 생성/배포 시스템
> 예상 소요: 2일
> 상태: 기획 완료

---

## 1. 시스템 개요

### 1-1. 목표

- 어드민에서 "빌드" 버튼 한 번으로 인테리어 업체 홈페이지를 Vercel에 자동 배포
- 업체별 서브도메인(`{업체명}.waide.kr`) 자동 설정
- 빌드 상태 실시간 모니터링 및 롤백 기능 제공
- Supabase 환경변수 자동 주입으로 수동 설정 제거

### 1-2. 전체 아키텍처

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         waide-mkt 어드민 대시보드                            │
│                                                                            │
│  [프로젝트 상세] → [빌드 버튼 클릭] → [배포 상태 모니터링] → [라이브 전환]    │
│        │                │                    │                    │        │
│        ▼                ▼                    ▼                    ▼        │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │ Supabase │   │ Server Action│   │  Webhook     │   │ DNS 설정     │   │
│  │ 데이터    │   │ deploy       │   │  수신/처리    │   │ 도메인 연결   │   │
│  │ 조회     │   │ Homepage()   │   │              │   │              │   │
│  └──────────┘   └──────┬───────┘   └──────┬───────┘   └──────────────┘   │
│                        │                   │                               │
└────────────────────────┼───────────────────┼───────────────────────────────┘
                         │                   │
                         ▼                   │
              ┌──────────────────┐           │
              │  Vercel REST API │           │
              │                  │◀──────────┘
              │  - 프로젝트 생성  │   (Deployment Webhook)
              │  - 환경변수 설정  │
              │  - 배포 트리거    │
              │  - 도메인 연결    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  {업체}.waide.kr  │
              │  Next.js 홈페이지 │
              │  (SSG/ISR)       │
              └──────────────────┘
```

### 1-3. 배포 상태 흐름

```
homepage_projects.status 상태 전이:

  collecting ──▶ building ──▶ preview ──▶ live
       │             │           │          │
       │             │           │          ▼
       │             ▼           │      suspended
       │         build_failed    │
       │             │           ▼
       │             ▼       rollback
       └─────── (재시도) ◀──────┘
```

| 상태 | 설명 | 트리거 |
|------|------|--------|
| `collecting` | 자료 수집 중 | 프로젝트 생성 시 |
| `building` | Vercel 빌드 진행 중 | 배포 API 호출 시 |
| `build_failed` | 빌드 실패 | Webhook 수신 시 |
| `preview` | 프리뷰 URL 생성됨 | 빌드 성공 Webhook 수신 시 |
| `live` | 라이브 배포 완료 | 프로모트 API 호출 시 |
| `suspended` | 서비스 일시 중단 | 수동 조작 |

---

## 2. Vercel API 연동 아키텍처

### 2-1. 인증 설정

```typescript
// lib/vercel.ts — Vercel API 클라이언트

const VERCEL_API_BASE = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN!;      // Vercel 계정 토큰
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;       // 팀 계정 사용 시 (선택)

interface VercelRequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
}

async function vercelFetch<T>({ method, path, body }: VercelRequestOptions): Promise<T> {
  const url = new URL(path, VERCEL_API_BASE);

  // 팀 계정 사용 시 teamId 쿼리 파라미터 추가
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID);
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new VercelAPIError(response.status, error);
  }

  return response.json() as Promise<T>;
}

class VercelAPIError extends Error {
  constructor(
    public statusCode: number,
    public details: Record<string, unknown>,
  ) {
    super(`Vercel API Error (${statusCode}): ${JSON.stringify(details)}`);
    this.name = 'VercelAPIError';
  }
}
```

### 2-2. 환경변수 (.env) 설정

```bash
# waide-mkt 서버 (.env.local)

# Vercel API 인증
VERCEL_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx     # Settings > Tokens 에서 발급
VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxx          # 팀 사용 시 (선택)

# Git Repository (템플릿 소스)
VERCEL_GIT_REPO_ID=xxxxxxxx                   # GitHub 연동 repo ID
VERCEL_GIT_REPO_OWNER=widewild                # GitHub 조직/사용자명
VERCEL_GIT_REPO_NAME=homepage-templates       # GitHub 저장소명

# 도메인 설정
VERCEL_BASE_DOMAIN=waide.kr                   # 서브도메인 베이스

# Webhook
VERCEL_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx  # 웹훅 시크릿 (직접 생성)

# 프로젝트별 주입되는 환경변수 (템플릿)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxx
```

### 2-3. Vercel 프로젝트 생성

```typescript
// lib/vercel.ts — 프로젝트 CRUD

interface CreateProjectPayload {
  name: string;                    // Vercel 프로젝트명 (고유)
  framework: 'nextjs';
  gitRepository?: {
    repo: string;                  // "owner/repo"
    type: 'github';
  };
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  rootDirectory?: string;          // monorepo인 경우 템플릿 경로
  environmentVariables?: Array<{
    key: string;
    value: string;
    type: 'encrypted' | 'plain' | 'system';
    target: Array<'production' | 'preview' | 'development'>;
  }>;
}

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  link?: {
    type: string;
    repo: string;
    repoId: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Vercel 프로젝트를 생성한다.
 * 1개 인테리어 업체 = 1개 Vercel 프로젝트
 */
async function createVercelProject(
  projectName: string,
  templateId: string,
  envVars: Record<string, string>,
): Promise<VercelProject> {
  // 프로젝트명 정규화 (Vercel 규칙: 소문자, 하이픈, 최대 100자)
  const normalizedName = `hp-${projectName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);

  // 환경변수 배열 구성
  const environmentVariables = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    type: key.startsWith('NEXT_PUBLIC_') ? 'plain' as const : 'encrypted' as const,
    target: ['production', 'preview'] as Array<'production' | 'preview'>,
  }));

  const project = await vercelFetch<VercelProject>({
    method: 'POST',
    path: '/v11/projects',
    body: {
      name: normalizedName,
      framework: 'nextjs',
      gitRepository: {
        repo: `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_NAME}`,
        type: 'github',
      },
      // monorepo 구조: templates/{templateId} 를 루트로 사용
      rootDirectory: `templates/${templateId}`,
      buildCommand: 'next build',
      installCommand: 'npm install',
      environmentVariables,
    },
  });

  return project;
}
```

### 2-4. 환경변수 자동 주입

```typescript
// lib/vercel.ts — 환경변수 관리

/**
 * 프로젝트별 필수 환경변수 목록을 생성한다.
 * Supabase 연결 정보 + 프로젝트 식별자 + SEO 설정
 */
function buildProjectEnvVars(
  projectId: string,
  subdomain: string,
  templateId: string,
): Record<string, string> {
  return {
    // ── Supabase 연결 ──
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,

    // ── 프로젝트 식별 ──
    HOMEPAGE_PROJECT_ID: projectId,
    HOMEPAGE_TEMPLATE_ID: templateId,

    // ── 사이트 URL (SEO) ──
    NEXT_PUBLIC_SITE_URL: `https://${subdomain}.waide.kr`,
    NEXT_PUBLIC_SITE_DOMAIN: `${subdomain}.waide.kr`,

    // ── 빌드 최적화 ──
    NEXT_TELEMETRY_DISABLED: '1',

    // ── ISR 재검증 주기 (초) ──
    REVALIDATE_INTERVAL: '3600',   // 1시간

    // ── Google Analytics (선택) ──
    // NEXT_PUBLIC_GA_ID: 'G-XXXXXXXXXX',
  };
}

/**
 * 기존 Vercel 프로젝트에 환경변수를 추가/업데이트한다.
 */
async function upsertEnvVars(
  vercelProjectId: string,
  envVars: Record<string, string>,
): Promise<void> {
  // 기존 환경변수 조회
  const existing = await vercelFetch<{ envs: Array<{ key: string; id: string }> }>({
    method: 'GET',
    path: `/v9/projects/${vercelProjectId}/env`,
  });

  const existingKeys = new Map(existing.envs.map(e => [e.key, e.id]));

  for (const [key, value] of Object.entries(envVars)) {
    const type = key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted';
    const target = ['production', 'preview'];

    if (existingKeys.has(key)) {
      // 기존 환경변수 업데이트
      await vercelFetch({
        method: 'PATCH',
        path: `/v9/projects/${vercelProjectId}/env/${existingKeys.get(key)}`,
        body: { value, type, target },
      });
    } else {
      // 새 환경변수 추가
      await vercelFetch({
        method: 'POST',
        path: `/v10/projects/${vercelProjectId}/env`,
        body: { key, value, type, target },
      });
    }
  }
}
```

### 2-5. 서브도메인 자동 설정

```typescript
// lib/vercel.ts — 도메인 관리

interface VercelDomain {
  name: string;
  apexName: string;
  verified: boolean;
  gitBranch: string | null;
  redirect: string | null;
  redirectStatusCode: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Vercel 프로젝트에 서브도메인을 연결한다.
 * 예: gangnam-interior.waide.kr
 *
 * 사전 조건: waide.kr 도메인이 Vercel 팀 계정에 등록되어 있어야 함
 * DNS 설정: *.waide.kr → CNAME → cname.vercel-dns.com
 */
async function addSubdomain(
  vercelProjectId: string,
  subdomain: string,
): Promise<VercelDomain> {
  const domain = `${subdomain}.waide.kr`;

  const result = await vercelFetch<VercelDomain>({
    method: 'POST',
    path: `/v10/projects/${vercelProjectId}/domains`,
    body: { name: domain },
  });

  return result;
}

/**
 * 커스텀 도메인을 추가한다. (고객이 자체 도메인을 사용하는 경우)
 * 예: www.gangnam-interior.com
 *
 * 고객 측 DNS 설정이 필요:
 * - CNAME: www → cname.vercel-dns.com
 * - 또는 A: @ → 76.76.21.21
 */
async function addCustomDomain(
  vercelProjectId: string,
  customDomain: string,
): Promise<VercelDomain> {
  const result = await vercelFetch<VercelDomain>({
    method: 'POST',
    path: `/v10/projects/${vercelProjectId}/domains`,
    body: { name: customDomain },
  });

  return result;
}

/**
 * 도메인 검증 상태를 확인한다.
 */
async function checkDomainVerification(
  vercelProjectId: string,
  domain: string,
): Promise<{ verified: boolean; verification: Array<{ type: string; domain: string; value: string }> }> {
  const result = await vercelFetch<{
    verified: boolean;
    verification: Array<{ type: string; domain: string; value: string }>;
  }>({
    method: 'GET',
    path: `/v9/projects/${vercelProjectId}/domains/${domain}/verify`,
  });

  return result;
}

/**
 * 프로젝트에 연결된 도메인 목록을 조회한다.
 */
async function listDomains(vercelProjectId: string): Promise<VercelDomain[]> {
  const result = await vercelFetch<{ domains: VercelDomain[] }>({
    method: 'GET',
    path: `/v9/projects/${vercelProjectId}/domains`,
  });

  return result.domains;
}

/**
 * 도메인을 제거한다.
 */
async function removeDomain(
  vercelProjectId: string,
  domain: string,
): Promise<void> {
  await vercelFetch({
    method: 'DELETE',
    path: `/v9/projects/${vercelProjectId}/domains/${domain}`,
  });
}
```

### 2-6. DNS 사전 설정 (Vercel 팀 계정)

```
waide.kr 도메인 DNS 레코드:

┌────────────────────────────────────────────────────────┐
│  Type   │  Name          │  Value                      │
├─────────┼────────────────┼─────────────────────────────┤
│  A      │  @             │  76.76.21.21                │
│  CNAME  │  *             │  cname.vercel-dns.com       │
│  CNAME  │  www           │  cname.vercel-dns.com       │
│  TXT    │  _vercel       │  vc-domain-verify=xxxxx     │
└────────────────────────────────────────────────────────┘

설정 방법:
1. Vercel 대시보드 > Settings > Domains > waide.kr 추가
2. DNS 관리자(가비아/후이즈 등)에서 위 레코드 설정
3. 와일드카드 CNAME (*.waide.kr) 설정 → 모든 서브도메인 자동 라우팅
4. SSL 인증서는 Vercel이 Let's Encrypt로 자동 발급
```

---

## 3. 빌드/배포 워크플로우

### 3-1. 전체 워크플로우 다이어그램

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          배포 워크플로우 상세                               │
│                                                                          │
│  ① 어드민 "빌드" 버튼 클릭                                                │
│         │                                                                │
│         ▼                                                                │
│  ② 사전 검증 (Server Action: deployHomepage)                              │
│     ├─ homepage_materials.is_complete === true 확인                       │
│     ├─ homepage_portfolios 최소 6개 확인                                  │
│     ├─ subdomain 중복 확인                                               │
│     └─ 포인트 잔액 확인 (선택)                                            │
│         │                                                                │
│         ▼                                                                │
│  ③ Vercel 프로젝트 존재 여부 확인                                         │
│     ├─ 없음 → createVercelProject() + addSubdomain()                     │
│     └─ 있음 → upsertEnvVars() (환경변수 동기화)                           │
│         │                                                                │
│         ▼                                                                │
│  ④ Vercel Deployment 생성 (Git 기반 빌드 트리거)                          │
│     ├─ POST /v13/deployments                                             │
│     ├─ target: 'production'                                              │
│     └─ homepage_projects.status → 'building'                             │
│         │                                                                │
│         ▼                                                                │
│  ⑤ 빌드 진행 (Vercel 내부)                                               │
│     ├─ npm install                                                       │
│     ├─ next build (SSG: Supabase에서 데이터 fetch)                        │
│     └─ 빌드 로그 스트리밍 (선택)                                          │
│         │                                                                │
│         ├── 성공 ──────────────────────────┐                              │
│         │                                  ▼                              │
│         │   ⑥-A Webhook 수신 (status: READY)                             │
│         │        ├─ homepage_projects.status → 'preview'                  │
│         │        ├─ homepage_projects.vercel_deployment_url 저장           │
│         │        └─ homepage_projects.last_deployed_at 갱신               │
│         │                                                                │
│         └── 실패 ──────────────────────────┐                              │
│                                            ▼                              │
│              ⑥-B Webhook 수신 (status: ERROR)                             │
│                   ├─ homepage_projects.status → 'build_failed'            │
│                   ├─ 에러 로그 저장                                       │
│                   └─ 슬랙/이메일 알림 발송                                 │
│                                                                          │
│         ▼                                                                │
│  ⑦ 프리뷰 확인 (어드민에서 프리뷰 URL 접속)                                │
│         │                                                                │
│         ▼                                                                │
│  ⑧ "라이브" 전환 (Server Action: promoteToLive)                           │
│     ├─ Vercel production alias 설정                                      │
│     ├─ homepage_projects.status → 'live'                                 │
│     └─ Google Search Console 사이트맵 제출 (선택)                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3-2. 배포 트리거 (Deployment 생성)

```typescript
// lib/vercel.ts — 배포 관리

interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyState: string;
  createdAt: number;
  buildingAt: number;
  ready: number;
  meta: Record<string, string>;
}

/**
 * Git 기반 배포를 트리거한다.
 * Vercel은 GitHub 연동된 프로젝트에서 자동으로 빌드를 실행한다.
 *
 * 방법 1: Deploy Hook 사용 (간편)
 * 방법 2: Deployments API 사용 (세밀한 제어)
 */

// ─── 방법 1: Deploy Hook (권장) ───
// Vercel 프로젝트 Settings > Git > Deploy Hooks 에서 생성
// 각 프로젝트별 Deploy Hook URL을 homepage_projects 테이블에 저장

async function triggerDeployHook(deployHookUrl: string): Promise<{
  job: { id: string; state: string; createdAt: number };
}> {
  const response = await fetch(deployHookUrl, { method: 'POST' });
  return response.json();
}

// ─── 방법 2: Deployments API (고급) ───
// 파일 업로드 기반 배포 (Git 없이도 가능)

async function createDeployment(
  vercelProjectId: string,
  projectName: string,
  target: 'production' | 'preview' = 'production',
): Promise<VercelDeployment> {
  const deployment = await vercelFetch<VercelDeployment>({
    method: 'POST',
    path: '/v13/deployments',
    body: {
      name: projectName,
      project: vercelProjectId,
      target,
      gitSource: {
        type: 'github',
        repo: `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_NAME}`,
        ref: 'main',               // 배포할 브랜치
      },
    },
  });

  return deployment;
}

/**
 * 배포 상태를 조회한다.
 */
async function getDeployment(deploymentId: string): Promise<VercelDeployment> {
  return vercelFetch<VercelDeployment>({
    method: 'GET',
    path: `/v13/deployments/${deploymentId}`,
  });
}

/**
 * 프로젝트의 배포 목록을 조회한다.
 */
async function listDeployments(
  vercelProjectId: string,
  limit: number = 10,
): Promise<{ deployments: VercelDeployment[] }> {
  return vercelFetch({
    method: 'GET',
    path: `/v6/deployments?projectId=${vercelProjectId}&limit=${limit}`,
  });
}
```

### 3-3. Webhook 수신 및 처리

```typescript
// app/api/homepage/deploy/webhook/route.ts

import { createHmac } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Deployment Webhook 수신 엔드포인트
 *
 * Vercel 웹훅 설정:
 *   Dashboard > Settings > Webhooks > Add
 *   URL: https://app.waide.kr/api/homepage/deploy/webhook
 *   Events: deployment.created, deployment.succeeded, deployment.error, deployment.canceled
 *   Secret: VERCEL_WEBHOOK_SECRET
 */

// Webhook 이벤트 타입 정의
interface VercelWebhookPayload {
  id: string;                      // 이벤트 ID
  type: string;                    // 이벤트 타입
  createdAt: number;               // 이벤트 생성 시각
  payload: {
    deployment: {
      id: string;                  // 배포 ID
      name: string;                // 프로젝트명
      url: string;                 // 배포 URL
      meta: Record<string, string>;
    };
    project: {
      id: string;                  // Vercel 프로젝트 ID
    };
    target: 'production' | 'preview' | null;
  };
}

// Webhook 시그니처 검증
function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.VERCEL_WEBHOOK_SECRET!;
  const expectedSignature = createHmac('sha1', secret)
    .update(body)
    .digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  // 1. Raw body 읽기
  const rawBody = await request.text();

  // 2. 시그니처 검증
  const signature = request.headers.get('x-vercel-signature');
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 3. 이벤트 파싱
  const event: VercelWebhookPayload = JSON.parse(rawBody);
  const { type, payload } = event;
  const vercelProjectId = payload.project.id;
  const deploymentUrl = payload.deployment.url;

  // 4. Supabase에서 해당 프로젝트 조회
  const supabase = await createClient();
  const { data: project, error: findError } = await supabase
    .from('homepage_projects')
    .select('id, status, project_name, client_id')
    .eq('vercel_project_id', vercelProjectId)
    .single();

  if (findError || !project) {
    console.error('프로젝트를 찾을 수 없음:', vercelProjectId);
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // 5. 이벤트 타입별 처리
  switch (type) {
    case 'deployment.created': {
      // 빌드 시작됨
      await supabase
        .from('homepage_projects')
        .update({
          status: 'building',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
      break;
    }

    case 'deployment.succeeded': {
      // 빌드 성공 → 프리뷰 상태로 전환
      await supabase
        .from('homepage_projects')
        .update({
          status: 'preview',
          vercel_deployment_url: `https://${deploymentUrl}`,
          last_deployed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      // 배포 이력 저장
      await supabase
        .from('homepage_deploy_logs')
        .insert({
          project_id: project.id,
          deployment_id: payload.deployment.id,
          deployment_url: `https://${deploymentUrl}`,
          status: 'succeeded',
          event_type: type,
          raw_payload: event,
        });

      // 알림 발송 (선택)
      await sendDeployNotification(project, 'success', deploymentUrl);
      break;
    }

    case 'deployment.error': {
      // 빌드 실패
      await supabase
        .from('homepage_projects')
        .update({
          status: 'build_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      // 배포 이력 저장 (에러 로그 포함)
      await supabase
        .from('homepage_deploy_logs')
        .insert({
          project_id: project.id,
          deployment_id: payload.deployment.id,
          status: 'error',
          event_type: type,
          raw_payload: event,
        });

      // 에러 알림 발송
      await sendDeployNotification(project, 'error', deploymentUrl);
      break;
    }

    case 'deployment.canceled': {
      // 빌드 취소
      await supabase
        .from('homepage_projects')
        .update({
          status: 'collecting',  // 이전 상태로 복원
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
      break;
    }

    default:
      console.log('처리하지 않는 이벤트 타입:', type);
  }

  return NextResponse.json({ received: true });
}

// 배포 알림 발송 (Slack + 이메일)
async function sendDeployNotification(
  project: { id: string; project_name: string; client_id: string },
  status: 'success' | 'error',
  deploymentUrl: string,
): Promise<void> {
  // Slack 알림
  if (process.env.SLACK_WEBHOOK_URL) {
    const emoji = status === 'success' ? '[성공]' : '[실패]';
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} 홈페이지 배포 ${status === 'success' ? '완료' : '실패'}\n` +
              `프로젝트: ${project.project_name}\n` +
              `URL: https://${deploymentUrl}`,
      }),
    });
  }
}
```

---

## 4. API 엔드포인트 설계

### 4-1. 엔드포인트 총괄표

| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| `POST` | `/api/homepage/deploy` | 배포 시작 | 어드민 |
| `GET` | `/api/homepage/deploy/status/[id]` | 배포 상태 확인 | 어드민 |
| `POST` | `/api/homepage/deploy/promote` | 프리뷰 → 라이브 전환 | 어드민 |
| `POST` | `/api/homepage/deploy/webhook` | Vercel 웹훅 수신 | Webhook Secret |
| `POST` | `/api/homepage/deploy/rollback` | 이전 배포로 롤백 | 어드민 |
| `GET` | `/api/homepage/deploy/logs/[id]` | 배포 이력 조회 | 어드민 |

### 4-2. POST /api/homepage/deploy — 배포 시작

```typescript
// app/api/homepage/deploy/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  createVercelProject,
  addSubdomain,
  buildProjectEnvVars,
  upsertEnvVars,
  triggerDeployHook,
} from '@/lib/vercel';

// Request Body
interface DeployRequest {
  projectId: string;              // homepage_projects.id
  templateId?: string;            // 템플릿 오버라이드 (선택)
  force?: boolean;                // 강제 재배포
}

// Response Body
interface DeployResponse {
  success: boolean;
  deploymentId?: string;
  previewUrl?: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DeployResponse>> {
  const supabase = await createClient();
  const body: DeployRequest = await request.json();
  const { projectId, templateId: templateOverride, force } = body;

  try {
    // ─── 1. 프로젝트 조회 ───
    const { data: project, error: projectError } = await supabase
      .from('homepage_projects')
      .select(`
        *,
        materials:homepage_materials(*),
        portfolios:homepage_portfolios(count),
        client:clients(id, name, brand_persona)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, message: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // ─── 2. 사전 검증 ───
    // 2-a. 이미 빌드 중인지 확인
    if (project.status === 'building' && !force) {
      return NextResponse.json(
        { success: false, message: '이미 빌드가 진행 중입니다.' },
        { status: 409 },
      );
    }

    // 2-b. 자료 수집 완료 여부
    if (!project.materials?.is_complete) {
      return NextResponse.json(
        { success: false, message: '자료 수집이 완료되지 않았습니다.' },
        { status: 400 },
      );
    }

    // 2-c. 포트폴리오 최소 개수
    const portfolioCount = project.portfolios?.[0]?.count ?? 0;
    if (portfolioCount < 6) {
      return NextResponse.json(
        { success: false, message: `포트폴리오가 ${portfolioCount}개입니다. 최소 6개가 필요합니다.` },
        { status: 400 },
      );
    }

    // 2-d. 서브도메인 확인
    if (!project.subdomain) {
      return NextResponse.json(
        { success: false, message: '서브도메인이 설정되지 않았습니다.' },
        { status: 400 },
      );
    }

    // ─── 3. Vercel 프로젝트 생성 또는 업데이트 ───
    const templateId = templateOverride || project.template_id;
    const envVars = buildProjectEnvVars(projectId, project.subdomain, templateId);

    let vercelProjectId = project.vercel_project_id;

    if (!vercelProjectId) {
      // 최초 배포: Vercel 프로젝트 생성
      const vercelProject = await createVercelProject(
        project.subdomain,
        templateId,
        envVars,
      );
      vercelProjectId = vercelProject.id;

      // 서브도메인 연결
      await addSubdomain(vercelProjectId, project.subdomain);

      // Vercel 프로젝트 ID 저장
      await supabase
        .from('homepage_projects')
        .update({ vercel_project_id: vercelProjectId })
        .eq('id', projectId);
    } else {
      // 재배포: 환경변수 동기화
      await upsertEnvVars(vercelProjectId, envVars);
    }

    // ─── 4. 배포 트리거 ───
    // Deploy Hook URL 사용 (프로젝트별로 미리 생성)
    const deployHookUrl = project.vercel_deploy_hook_url;

    if (deployHookUrl) {
      // Deploy Hook 방식
      const result = await triggerDeployHook(deployHookUrl);

      // 상태 업데이트
      await supabase
        .from('homepage_projects')
        .update({
          status: 'building',
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      return NextResponse.json({
        success: true,
        deploymentId: result.job.id,
        message: '빌드가 시작되었습니다. Webhook을 통해 결과가 통보됩니다.',
      });
    } else {
      // Deployments API 방식 (Deploy Hook이 없는 경우)
      const deployment = await createDeployment(
        vercelProjectId,
        project.subdomain,
        'production',
      );

      await supabase
        .from('homepage_projects')
        .update({
          status: 'building',
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      return NextResponse.json({
        success: true,
        deploymentId: deployment.id,
        previewUrl: `https://${deployment.url}`,
        message: '빌드가 시작되었습니다.',
      });
    }
  } catch (error) {
    console.error('배포 시작 실패:', error);

    // 빌드 실패 상태로 변경
    await supabase
      .from('homepage_projects')
      .update({
        status: 'build_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '배포 시작에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
```

### 4-3. GET /api/homepage/deploy/status/[id] — 배포 상태 확인

```typescript
// app/api/homepage/deploy/status/[id]/route.ts

import { createClient } from '@/lib/supabase/server';
import { getDeployment, listDeployments } from '@/lib/vercel';
import { NextRequest, NextResponse } from 'next/server';

interface DeployStatusResponse {
  projectId: string;
  status: string;                           // homepage_projects.status
  vercelDeploymentUrl: string | null;       // 최신 배포 URL
  lastDeployedAt: string | null;
  currentDeployment: {
    id: string;
    state: string;
    url: string;
    createdAt: string;
    readyAt: string | null;
  } | null;
  recentDeployments: Array<{
    id: string;
    state: string;
    url: string;
    createdAt: string;
    target: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<DeployStatusResponse>> {
  const { id: projectId } = await params;
  const supabase = await createClient();

  // 1. Supabase에서 프로젝트 조회
  const { data: project, error } = await supabase
    .from('homepage_projects')
    .select('id, status, vercel_project_id, vercel_deployment_url, last_deployed_at')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: 'Project not found' } as any,
      { status: 404 },
    );
  }

  // 2. Vercel에서 최신 배포 상태 조회
  let currentDeployment = null;
  let recentDeployments: any[] = [];

  if (project.vercel_project_id) {
    try {
      const { deployments } = await listDeployments(project.vercel_project_id, 5);
      recentDeployments = deployments.map(d => ({
        id: d.id,
        state: d.state,
        url: d.url,
        createdAt: new Date(d.createdAt).toISOString(),
        target: (d as any).target || 'preview',
      }));

      if (deployments.length > 0) {
        const latest = deployments[0];
        currentDeployment = {
          id: latest.id,
          state: latest.state,
          url: latest.url,
          createdAt: new Date(latest.createdAt).toISOString(),
          readyAt: latest.ready ? new Date(latest.ready).toISOString() : null,
        };
      }
    } catch (vercelError) {
      console.error('Vercel 배포 상태 조회 실패:', vercelError);
    }
  }

  return NextResponse.json({
    projectId: project.id,
    status: project.status,
    vercelDeploymentUrl: project.vercel_deployment_url,
    lastDeployedAt: project.last_deployed_at,
    currentDeployment,
    recentDeployments,
  });
}
```

### 4-4. POST /api/homepage/deploy/promote — 프리뷰 → 라이브 전환

```typescript
// app/api/homepage/deploy/promote/route.ts

import { createClient } from '@/lib/supabase/server';
import { addSubdomain, checkDomainVerification } from '@/lib/vercel';
import { NextRequest, NextResponse } from 'next/server';

interface PromoteRequest {
  projectId: string;
  customDomain?: string;          // 커스텀 도메인 추가 (선택)
}

interface PromoteResponse {
  success: boolean;
  liveUrl: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PromoteResponse>> {
  const supabase = await createClient();
  const body: PromoteRequest = await request.json();
  const { projectId, customDomain } = body;

  try {
    // 1. 프로젝트 조회
    const { data: project, error } = await supabase
      .from('homepage_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { success: false, liveUrl: '', message: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // 2. 프리뷰 상태 확인
    if (project.status !== 'preview') {
      return NextResponse.json(
        { success: false, liveUrl: '', message: `현재 상태(${project.status})에서는 라이브 전환이 불가합니다. preview 상태에서만 가능합니다.` },
        { status: 400 },
      );
    }

    // 3. 서브도메인 도메인 연결 확인
    const domainCheck = await checkDomainVerification(
      project.vercel_project_id,
      `${project.subdomain}.waide.kr`,
    );

    if (!domainCheck.verified) {
      return NextResponse.json(
        { success: false, liveUrl: '', message: '도메인 DNS 검증이 완료되지 않았습니다.' },
        { status: 400 },
      );
    }

    // 4. 커스텀 도메인 추가 (선택)
    if (customDomain) {
      await addCustomDomain(project.vercel_project_id, customDomain);
      await supabase
        .from('homepage_projects')
        .update({ custom_domain: customDomain })
        .eq('id', projectId);
    }

    // 5. 라이브 상태로 전환
    const liveUrl = `https://${project.subdomain}.waide.kr`;
    await supabase
      .from('homepage_projects')
      .update({
        status: 'live',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // 6. 배포 이력 저장
    await supabase
      .from('homepage_deploy_logs')
      .insert({
        project_id: projectId,
        status: 'promoted',
        event_type: 'promote_to_live',
        deployment_url: liveUrl,
      });

    return NextResponse.json({
      success: true,
      liveUrl,
      message: `라이브 전환이 완료되었습니다. ${liveUrl}`,
    });
  } catch (error) {
    console.error('라이브 전환 실패:', error);
    return NextResponse.json(
      { success: false, liveUrl: '', message: '라이브 전환에 실패했습니다.' },
      { status: 500 },
    );
  }
}
```

### 4-5. POST /api/homepage/deploy/rollback — 롤백

```typescript
// app/api/homepage/deploy/rollback/route.ts

import { createClient } from '@/lib/supabase/server';
import { listDeployments, createDeployment } from '@/lib/vercel';
import { NextRequest, NextResponse } from 'next/server';

interface RollbackRequest {
  projectId: string;
  targetDeploymentId?: string;    // 특정 배포 ID로 롤백 (선택, 없으면 직전 배포)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body: RollbackRequest = await request.json();
  const { projectId, targetDeploymentId } = body;

  try {
    // 1. 프로젝트 조회
    const { data: project } = await supabase
      .from('homepage_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project?.vercel_project_id) {
      return NextResponse.json(
        { success: false, message: '프로젝트를 찾을 수 없거나 Vercel 프로젝트가 없습니다.' },
        { status: 404 },
      );
    }

    // 2. 롤백 대상 배포 결정
    let targetId = targetDeploymentId;

    if (!targetId) {
      // 직전 성공 배포를 찾는다
      const { deployments } = await listDeployments(project.vercel_project_id, 10);
      const previousSuccess = deployments.find(
        (d, i) => i > 0 && d.state === 'READY',
      );

      if (!previousSuccess) {
        return NextResponse.json(
          { success: false, message: '롤백할 이전 배포를 찾을 수 없습니다.' },
          { status: 400 },
        );
      }

      targetId = previousSuccess.id;
    }

    // 3. Vercel 롤백 실행 (해당 배포를 production으로 프로모트)
    // Vercel의 Instant Rollback API 사용
    const rollbackResult = await vercelFetch({
      method: 'POST',
      path: `/v13/deployments/${targetId}/promote`,
      body: {},
    });

    // 4. 상태 업데이트
    await supabase
      .from('homepage_projects')
      .update({
        status: 'preview',   // 라이브에서 프리뷰로 되돌림
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // 5. 롤백 이력 저장
    await supabase
      .from('homepage_deploy_logs')
      .insert({
        project_id: projectId,
        deployment_id: targetId,
        status: 'rollback',
        event_type: 'rollback',
      });

    return NextResponse.json({
      success: true,
      message: `배포 ${targetId}로 롤백이 완료되었습니다.`,
      rollbackDeploymentId: targetId,
    });
  } catch (error) {
    console.error('롤백 실패:', error);
    return NextResponse.json(
      { success: false, message: '롤백에 실패했습니다.' },
      { status: 500 },
    );
  }
}
```

---

## 5. Server Actions

### 5-1. deployHomepage — 홈페이지 배포

```typescript
// actions/homepage-deploy.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createVercelProject,
  addSubdomain,
  buildProjectEnvVars,
  upsertEnvVars,
  triggerDeployHook,
  createDeployment,
} from '@/lib/vercel';

interface DeployResult {
  success: boolean;
  message: string;
  deploymentId?: string;
  previewUrl?: string;
}

/**
 * 홈페이지를 Vercel에 배포한다.
 *
 * 실행 흐름:
 * 1. 사전 검증 (자료 완성도, 포트폴리오 수, 서브도메인)
 * 2. Vercel 프로젝트 생성 또는 환경변수 동기화
 * 3. 서브도메인 연결
 * 4. 배포 트리거
 * 5. 상태 업데이트
 */
export async function deployHomepage(
  projectId: string,
  templateId?: string,
): Promise<DeployResult> {
  const supabase = await createClient();

  try {
    // ─── 1. 프로젝트 데이터 조회 ───
    const { data: project, error: projectError } = await supabase
      .from('homepage_projects')
      .select(`
        *,
        materials:homepage_materials(*),
        portfolios:homepage_portfolios(id)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, message: '프로젝트를 찾을 수 없습니다.' };
    }

    // ─── 2. 사전 검증 ───
    if (project.status === 'building') {
      return { success: false, message: '현재 빌드가 진행 중입니다.' };
    }

    if (!project.materials?.is_complete) {
      return { success: false, message: '자료 수집을 먼저 완료해주세요.' };
    }

    if ((project.portfolios?.length ?? 0) < 6) {
      return {
        success: false,
        message: `포트폴리오가 ${project.portfolios?.length ?? 0}개입니다. 최소 6개 필요합니다.`,
      };
    }

    if (!project.subdomain) {
      return { success: false, message: '서브도메인을 먼저 설정해주세요.' };
    }

    // ─── 3. 템플릿 결정 ───
    const finalTemplateId = templateId || project.template_id;

    // ─── 4. 환경변수 구성 ───
    const envVars = buildProjectEnvVars(projectId, project.subdomain, finalTemplateId);

    // ─── 5. Vercel 프로젝트 생성 또는 업데이트 ───
    let vercelProjectId = project.vercel_project_id;

    if (!vercelProjectId) {
      // 최초 배포: 프로젝트 생성
      const vercelProject = await createVercelProject(
        project.subdomain,
        finalTemplateId,
        envVars,
      );
      vercelProjectId = vercelProject.id;

      // 서브도메인 연결
      await addSubdomain(vercelProjectId, project.subdomain);

      // Vercel 프로젝트 ID 저장
      await supabase
        .from('homepage_projects')
        .update({
          vercel_project_id: vercelProjectId,
          template_id: finalTemplateId,
        })
        .eq('id', projectId);
    } else {
      // 재배포: 환경변수만 동기화
      await upsertEnvVars(vercelProjectId, envVars);
    }

    // ─── 6. 배포 트리거 ───
    let deploymentId: string | undefined;
    let previewUrl: string | undefined;

    if (project.vercel_deploy_hook_url) {
      const result = await triggerDeployHook(project.vercel_deploy_hook_url);
      deploymentId = result.job.id;
    } else {
      const deployment = await createDeployment(
        vercelProjectId,
        project.subdomain,
        'production',
      );
      deploymentId = deployment.id;
      previewUrl = `https://${deployment.url}`;
    }

    // ─── 7. 상태 업데이트 ───
    await supabase
      .from('homepage_projects')
      .update({
        status: 'building',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // 캐시 무효화
    revalidatePath(`/dashboard/homepage/${projectId}`);

    return {
      success: true,
      message: '빌드가 시작되었습니다.',
      deploymentId,
      previewUrl,
    };
  } catch (error) {
    console.error('[deployHomepage] 배포 실패:', error);

    // 실패 상태 업데이트
    await supabase
      .from('homepage_projects')
      .update({
        status: 'build_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return {
      success: false,
      message: error instanceof Error ? error.message : '배포에 실패했습니다.',
    };
  }
}
```

### 5-2. getDeploymentStatus — 배포 상태 조회

```typescript
// actions/homepage-deploy.ts (계속)
'use server';

interface DeploymentStatusResult {
  status: string;
  vercelDeploymentUrl: string | null;
  lastDeployedAt: string | null;
  buildLogs?: string[];
  recentDeployments?: Array<{
    id: string;
    state: string;
    url: string;
    createdAt: string;
  }>;
}

/**
 * 프로젝트의 현재 배포 상태를 조회한다.
 * 어드민 대시보드에서 폴링 또는 실시간 업데이트용으로 사용.
 */
export async function getDeploymentStatus(
  projectId: string,
): Promise<DeploymentStatusResult> {
  const supabase = await createClient();

  // 1. Supabase에서 프로젝트 상태 조회
  const { data: project } = await supabase
    .from('homepage_projects')
    .select('status, vercel_project_id, vercel_deployment_url, last_deployed_at')
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new Error('프로젝트를 찾을 수 없습니다.');
  }

  const result: DeploymentStatusResult = {
    status: project.status,
    vercelDeploymentUrl: project.vercel_deployment_url,
    lastDeployedAt: project.last_deployed_at,
  };

  // 2. Vercel에서 실시간 배포 상태 조회 (building 상태일 때)
  if (project.vercel_project_id && project.status === 'building') {
    try {
      const { deployments } = await listDeployments(project.vercel_project_id, 3);
      result.recentDeployments = deployments.map(d => ({
        id: d.id,
        state: d.state,
        url: d.url,
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    } catch (error) {
      console.error('Vercel 상태 조회 실패:', error);
    }
  }

  // 3. 배포 로그 조회 (최근 5건)
  const { data: logs } = await supabase
    .from('homepage_deploy_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (logs) {
    result.buildLogs = logs.map(
      log => `[${log.status}] ${log.event_type} - ${new Date(log.created_at).toLocaleString('ko-KR')}`,
    );
  }

  return result;
}
```

### 5-3. promoteToLive — 프리뷰 → 라이브 전환

```typescript
// actions/homepage-deploy.ts (계속)
'use server';

interface PromoteResult {
  success: boolean;
  message: string;
  liveUrl?: string;
}

/**
 * 프리뷰 상태의 홈페이지를 라이브로 전환한다.
 *
 * 실행 흐름:
 * 1. preview 상태 확인
 * 2. 도메인 DNS 검증
 * 3. 상태 → live 전환
 * 4. (선택) Google Search Console에 사이트맵 제출
 */
export async function promoteToLive(
  projectId: string,
  customDomain?: string,
): Promise<PromoteResult> {
  const supabase = await createClient();

  try {
    const { data: project } = await supabase
      .from('homepage_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, message: '프로젝트를 찾을 수 없습니다.' };
    }

    if (project.status !== 'preview') {
      return {
        success: false,
        message: `현재 상태(${project.status})에서는 라이브 전환이 불가합니다.`,
      };
    }

    // 도메인 검증
    const domainCheck = await checkDomainVerification(
      project.vercel_project_id,
      `${project.subdomain}.waide.kr`,
    );

    if (!domainCheck.verified) {
      return {
        success: false,
        message: 'DNS 검증이 완료되지 않았습니다. 와일드카드 CNAME 설정을 확인해주세요.',
      };
    }

    // 커스텀 도메인 추가
    if (customDomain) {
      await addCustomDomain(project.vercel_project_id, customDomain);
      await supabase
        .from('homepage_projects')
        .update({ custom_domain: customDomain })
        .eq('id', projectId);
    }

    // 라이브 전환
    const liveUrl = `https://${project.subdomain}.waide.kr`;

    await supabase
      .from('homepage_projects')
      .update({
        status: 'live',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // 배포 이력 기록
    await supabase
      .from('homepage_deploy_logs')
      .insert({
        project_id: projectId,
        status: 'promoted',
        event_type: 'promote_to_live',
        deployment_url: liveUrl,
      });

    revalidatePath(`/dashboard/homepage/${projectId}`);

    return {
      success: true,
      message: '라이브 전환이 완료되었습니다.',
      liveUrl,
    };
  } catch (error) {
    console.error('[promoteToLive] 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '라이브 전환에 실패했습니다.',
    };
  }
}
```

### 5-4. rollbackDeployment — 이전 배포로 롤백

```typescript
// actions/homepage-deploy.ts (계속)
'use server';

interface RollbackResult {
  success: boolean;
  message: string;
  rollbackDeploymentId?: string;
}

/**
 * 이전 성공 배포로 롤백한다.
 *
 * 실행 흐름:
 * 1. 이전 성공 배포 ID 탐색
 * 2. Vercel Instant Rollback 실행
 * 3. 상태 업데이트
 */
export async function rollbackDeployment(
  projectId: string,
  targetDeploymentId?: string,
): Promise<RollbackResult> {
  const supabase = await createClient();

  try {
    const { data: project } = await supabase
      .from('homepage_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project?.vercel_project_id) {
      return {
        success: false,
        message: 'Vercel 프로젝트가 연결되지 않은 프로젝트입니다.',
      };
    }

    // 롤백 대상 결정
    let rollbackId = targetDeploymentId;

    if (!rollbackId) {
      // 직전 성공 배포 탐색
      const { deployments } = await listDeployments(project.vercel_project_id, 10);
      const previous = deployments.find(
        (d, idx) => idx > 0 && d.state === 'READY',
      );

      if (!previous) {
        return {
          success: false,
          message: '롤백 가능한 이전 배포를 찾을 수 없습니다.',
        };
      }

      rollbackId = previous.id;
    }

    // Vercel Instant Rollback
    await vercelFetch({
      method: 'POST',
      path: `/v13/deployments/${rollbackId}/promote`,
      body: {},
    });

    // 상태 업데이트
    await supabase
      .from('homepage_projects')
      .update({
        status: 'preview',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // 이력 저장
    await supabase
      .from('homepage_deploy_logs')
      .insert({
        project_id: projectId,
        deployment_id: rollbackId,
        status: 'rollback',
        event_type: 'rollback',
      });

    revalidatePath(`/dashboard/homepage/${projectId}`);

    return {
      success: true,
      message: '롤백이 완료되었습니다.',
      rollbackDeploymentId: rollbackId,
    };
  } catch (error) {
    console.error('[rollbackDeployment] 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '롤백에 실패했습니다.',
    };
  }
}
```

---

## 6. 추가 DB 스키마 — 배포 이력 테이블

```sql
-- ── homepage_deploy_logs: 배포 이력 추적 ──
CREATE TABLE homepage_deploy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES homepage_projects(id) ON DELETE CASCADE,

  -- 배포 정보
  deployment_id TEXT,                         -- Vercel Deployment ID
  deployment_url TEXT,                        -- 배포 URL
  status TEXT NOT NULL,                       -- 'building', 'succeeded', 'error', 'canceled', 'promoted', 'rollback'
  event_type TEXT NOT NULL,                   -- Webhook 이벤트 타입 또는 수동 액션

  -- 상세 정보
  error_message TEXT,                         -- 에러 메시지 (실패 시)
  build_duration_ms INTEGER,                  -- 빌드 소요 시간 (ms)
  raw_payload JSONB,                          -- Webhook 원본 페이로드

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hp_deploy_logs_project ON homepage_deploy_logs(project_id);
CREATE INDEX idx_hp_deploy_logs_status ON homepage_deploy_logs(status);
CREATE INDEX idx_hp_deploy_logs_created ON homepage_deploy_logs(created_at DESC);


-- ── homepage_projects 테이블 확장 (기존 테이블에 컬럼 추가) ──
ALTER TABLE homepage_projects
  ADD COLUMN IF NOT EXISTS vercel_deploy_hook_url TEXT,     -- Vercel Deploy Hook URL
  ADD COLUMN IF NOT EXISTS build_error_message TEXT;         -- 마지막 빌드 에러 메시지
```

---

## 7. 환경변수 관리 상세

### 7-1. 프로젝트별 필수 환경변수 목록

| 변수명 | 설명 | 주입 방식 | 예시 |
|--------|------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 글로벌 공통 | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | 글로벌 공통 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (서버 전용) | 글로벌 공통, 암호화 | `eyJ...` |
| `HOMEPAGE_PROJECT_ID` | homepage_projects.id | 프로젝트별 고유 | `uuid` |
| `HOMEPAGE_TEMPLATE_ID` | 사용 템플릿 ID | 프로젝트별 고유 | `modern-minimal` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 전체 URL | 프로젝트별 고유 | `https://xxx.waide.kr` |
| `NEXT_PUBLIC_SITE_DOMAIN` | 사이트 도메인 | 프로젝트별 고유 | `xxx.waide.kr` |
| `REVALIDATE_INTERVAL` | ISR 재검증 주기 (초) | 프로젝트별 설정 가능 | `3600` |
| `NEXT_TELEMETRY_DISABLED` | Next.js 텔레메트리 비활성화 | 글로벌 공통 | `1` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | 프로젝트별 (선택) | `G-XXXXXXXXXX` |

### 7-2. 환경변수 보안 분류

```
┌──────────────────────────────────────────────────────────┐
│  환경변수 보안 등급                                        │
│                                                          │
│  [PUBLIC] NEXT_PUBLIC_* 접두사                             │
│  ├─ NEXT_PUBLIC_SUPABASE_URL       → 클라이언트 노출 OK   │
│  ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY  → 클라이언트 노출 OK   │
│  ├─ NEXT_PUBLIC_SITE_URL           → 클라이언트 노출 OK   │
│  ├─ NEXT_PUBLIC_SITE_DOMAIN        → 클라이언트 노출 OK   │
│  └─ NEXT_PUBLIC_GA_ID              → 클라이언트 노출 OK   │
│                                                          │
│  [ENCRYPTED] 서버 전용 (Vercel encrypted)                  │
│  ├─ SUPABASE_SERVICE_ROLE_KEY      → 서버에서만 사용      │
│  └─ HOMEPAGE_PROJECT_ID            → 서버에서만 사용      │
│                                                          │
│  [SYSTEM] 빌드 설정                                       │
│  ├─ REVALIDATE_INTERVAL            → 빌드 타임 설정       │
│  └─ NEXT_TELEMETRY_DISABLED        → 빌드 타임 설정       │
│                                                          │
│  Vercel 환경변수 타입 매핑:                                │
│  - NEXT_PUBLIC_* → type: 'plain' (암호화 불필요)           │
│  - 그 외        → type: 'encrypted' (Vercel이 암호화 저장) │
└──────────────────────────────────────────────────────────┘
```

### 7-3. 템플릿에서 환경변수 사용

```typescript
// templates/modern-minimal/data/config.ts
// 빌드 타임에 환경변수를 통해 프로젝트 데이터를 fetch

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;  // 서버 전용
const projectId = process.env.HOMEPAGE_PROJECT_ID!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getHomepageConfig() {
  const { data: project } = await supabase
    .from('homepage_projects')
    .select(`
      *,
      client:clients(id, name, brand_persona),
      materials:homepage_materials(*),
      portfolios:homepage_portfolios(*),
      reviews:homepage_reviews(*)
    `)
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);
  }

  return {
    company: {
      name: project.materials.company_name,
      owner: project.materials.owner_name,
      phone: project.materials.phone,
      address: project.materials.address,
      description: project.materials.description,
      kakaoLink: project.materials.kakao_link,
      logo: project.materials.logo_url,
    },
    theme: project.theme_config,
    seo: project.seo_config,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
    portfolios: project.portfolios,
    reviews: project.reviews,
    faqItems: project.materials.faq_items || [],
    persona: project.client.brand_persona,
  };
}

// ISR 재검증 주기
export const revalidateInterval = parseInt(
  process.env.REVALIDATE_INTERVAL || '3600',
  10,
);
```

---

## 8. 오류 처리 및 롤백

### 8-1. 오류 처리 체계

```
┌──────────────────────────────────────────────────────────┐
│  오류 단계별 처리 전략                                     │
│                                                          │
│  [1단계] Vercel API 호출 실패                              │
│  ├─ 원인: 네트워크, 인증 토큰 만료, Rate Limit             │
│  ├─ 처리: 최대 3회 재시도 (지수 백오프)                    │
│  └─ 알림: 3회 실패 시 Slack 알림 + 로그 기록               │
│                                                          │
│  [2단계] 프로젝트 생성 실패                                │
│  ├─ 원인: 프로젝트명 중복, 팀 한도 초과                    │
│  ├─ 처리: 프로젝트명 suffix 추가 후 재시도                 │
│  └─ 알림: 한도 초과 시 관리자 알림                         │
│                                                          │
│  [3단계] 빌드 실패                                        │
│  ├─ 원인: 종속성 설치 실패, 타입 에러, 데이터 fetch 실패    │
│  ├─ 처리:                                                 │
│  │   ├─ 에러 로그 파싱 → 원인 분류                        │
│  │   ├─ 종속성 실패 → npm cache 클리어 후 재시도           │
│  │   ├─ 데이터 실패 → Supabase 연결 확인 후 재시도         │
│  │   └─ 코드 에러 → 관리자에게 에스컬레이션                │
│  └─ 알림: 에러 로그 포함 Slack 알림                        │
│                                                          │
│  [4단계] 도메인 연결 실패                                  │
│  ├─ 원인: DNS 미전파, 도메인 미검증                        │
│  ├─ 처리: 30분 후 자동 재검증 (최대 3회)                   │
│  └─ 알림: DNS 설정 가이드 포함 알림                        │
│                                                          │
│  [5단계] 라이브 후 장애                                    │
│  ├─ 원인: Vercel 장애, Supabase 연결 끊김                  │
│  ├─ 처리: 자동 롤백 (직전 성공 배포로)                     │
│  └─ 알림: 긴급 Slack 알림 + 관리자 호출                    │
└──────────────────────────────────────────────────────────┘
```

### 8-2. 재시도 로직 구현

```typescript
// lib/vercel.ts — 재시도 유틸리티

interface RetryOptions {
  maxRetries: number;              // 최대 재시도 횟수
  initialDelayMs: number;          // 초기 대기 시간 (ms)
  maxDelayMs: number;              // 최대 대기 시간 (ms)
  backoffMultiplier: number;       // 지수 배수
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,            // 1초
  maxDelayMs: 30000,               // 30초
  backoffMultiplier: 2,
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Rate Limit (429) 또는 서버 에러 (5xx)만 재시도
      if (error instanceof VercelAPIError) {
        if (error.statusCode === 429 || error.statusCode >= 500) {
          if (attempt < opts.maxRetries) {
            console.warn(
              `[Vercel API] ${attempt + 1}/${opts.maxRetries} 재시도 중... (${delay}ms 대기)`,
            );
            await sleep(delay);
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
            continue;
          }
        }
        // 4xx 에러 (Rate Limit 제외)는 재시도하지 않음
        throw error;
      }

      // 네트워크 에러는 재시도
      if (attempt < opts.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        continue;
      }
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 사용 예시
async function createVercelProjectWithRetry(
  projectName: string,
  templateId: string,
  envVars: Record<string, string>,
): Promise<VercelProject> {
  return withRetry(
    () => createVercelProject(projectName, templateId, envVars),
    { maxRetries: 3 },
  );
}
```

### 8-3. 빌드 실패 시 자동 재시도

```typescript
// app/api/homepage/deploy/webhook/route.ts 내 에러 핸들링 확장

async function handleBuildError(
  projectId: string,
  deploymentId: string,
  event: VercelWebhookPayload,
): Promise<void> {
  const supabase = await createClient();

  // 1. 재시도 횟수 확인
  const { count } = await supabase
    .from('homepage_deploy_logs')
    .select('id', { count: 'exact' })
    .eq('project_id', projectId)
    .eq('status', 'error')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());  // 최근 1시간

  const retryCount = count ?? 0;
  const MAX_AUTO_RETRIES = 2;

  if (retryCount < MAX_AUTO_RETRIES) {
    // 자동 재시도
    console.log(`[자동 재시도] ${retryCount + 1}/${MAX_AUTO_RETRIES} - 프로젝트: ${projectId}`);

    // 30초 후 재배포 (즉시 재시도 방지)
    setTimeout(async () => {
      await deployHomepage(projectId);
    }, 30000);

    await supabase
      .from('homepage_deploy_logs')
      .insert({
        project_id: projectId,
        deployment_id: deploymentId,
        status: 'auto_retry',
        event_type: 'auto_retry',
        error_message: `자동 재시도 ${retryCount + 1}/${MAX_AUTO_RETRIES}`,
        raw_payload: event,
      });
  } else {
    // 재시도 한도 초과 → 관리자 알림
    await supabase
      .from('homepage_projects')
      .update({
        status: 'build_failed',
        build_error_message: '자동 재시도 한도 초과. 수동 확인이 필요합니다.',
      })
      .eq('id', projectId);

    // Slack 긴급 알림
    await sendDeployNotification(
      { id: projectId, project_name: '', client_id: '' },
      'error',
      `자동 재시도 ${MAX_AUTO_RETRIES}회 초과. 수동 확인 필요.`,
    );
  }
}
```

### 8-4. 롤백 워크플로우

```
┌─────────────────────────────────────────────────┐
│  롤백 시나리오                                    │
│                                                  │
│  시나리오 1: 빌드 실패 후 복원                     │
│  ├─ 이전 상태: live                               │
│  ├─ 빌드 시도 → 실패                              │
│  ├─ 자동 조치: 이전 배포가 그대로 유지됨            │
│  │             (Vercel은 실패한 빌드를 배포하지 않음)│
│  └─ 상태: build_failed → 어드민에서 수동 재시도     │
│                                                  │
│  시나리오 2: 새 배포 후 문제 발견                    │
│  ├─ 이전 상태: preview (새 배포 성공)               │
│  ├─ 어드민: "이전 버전으로 롤백" 클릭               │
│  ├─ 동작: Vercel Instant Rollback 실행             │
│  └─ 결과: 직전 성공 배포로 즉시 복원 (다운타임 없음) │
│                                                  │
│  시나리오 3: 라이브 중 데이터 문제                   │
│  ├─ 원인: Supabase 데이터 오류로 페이지 깨짐        │
│  ├─ 자동 조치: ISR 캐시로 이전 버전 서빙            │
│  └─ 수동 조치: 데이터 수정 후 재배포               │
└─────────────────────────────────────────────────┘
```

---

## 9. 비용 최적화

### 9-1. Vercel 요금제 및 제한

```
┌──────────────────────────────────────────────────────────┐
│  Vercel 요금제별 제한 (2026년 기준)                        │
│                                                          │
│  [Hobby] 무료                                             │
│  ├─ 프로젝트: 무제한 (개인 비상업용)                       │
│  ├─ 빌드 시간: 6,000분/월                                 │
│  ├─ 대역폭: 100GB/월                                      │
│  ├─ Serverless 함수: 100GB-Hours                          │
│  └─ 도메인: 50개 프로젝트당                                │
│                                                          │
│  [Pro] $20/월/멤버 (권장)                                  │
│  ├─ 프로젝트: 무제한                                       │
│  ├─ 빌드 시간: 24,000분/월                                 │
│  ├─ 대역폭: 1TB/월 (추가 $40/100GB)                       │
│  ├─ Serverless 함수: 1,000GB-Hours                        │
│  ├─ 도메인: 무제한                                         │
│  ├─ 프리뷰 배포: 무제한                                    │
│  └─ DDoS 보호: 포함                                       │
│                                                          │
│  [Enterprise] 커스텀                                       │
│  ├─ SLA 보장                                               │
│  ├─ 전용 빌드 인프라                                       │
│  └─ 우선 지원                                              │
│                                                          │
│  ── 비용 추정 (50개 업체 기준) ──                           │
│                                                          │
│  Pro 플랜: $20/월                                          │
│  빌드: 50개 × 3분/빌드 × 4회/월 = 600분/월 (24,000분 한도)  │
│  대역폭: 50개 × 5GB/월 = 250GB/월 (1TB 한도 충분)          │
│  추가 비용 예상: 없음 (Pro 플랜 한도 내)                    │
│                                                          │
│  ── 100개 업체 기준 ──                                     │
│  빌드: 100개 × 3분 × 4회 = 1,200분/월 (여유)               │
│  대역폭: 100개 × 5GB = 500GB/월 (여유)                     │
│  추가 비용 예상: 없음                                       │
└──────────────────────────────────────────────────────────┘
```

### 9-2. 빌드 시간 최적화

```typescript
// templates/modern-minimal/next.config.ts — 빌드 최적화 설정

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ─── SSG + ISR 전략 ───
  // 정적 페이지는 빌드 타임에 생성하고, 데이터 변경 시 ISR로 갱신
  // → 빌드 시간 최소화 + 실시간 데이터 반영

  // 이미지 최적화 (Vercel 이미지 최적화 CDN 활용)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',       // Supabase Storage 이미지
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,               // 24시간 캐시
  },

  // 빌드 출력 최적화
  output: 'standalone',                    // Docker 배포 대비 (선택)

  // 실험적 기능
  experimental: {
    // PPR (Partial Prerendering) 활용 — 정적 + 동적 하이브리드
    ppr: true,
  },

  // 헤더 설정 (캐싱)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // 정적 자산 장기 캐시
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 9-3. ISR/SSG 활용 전략

```typescript
// templates/modern-minimal/app/page.tsx — 메인 페이지 ISR 설정

import { getHomepageConfig, revalidateInterval } from '@/data/config';

// ISR: 1시간마다 재검증 (데이터 변경 반영)
export const revalidate = 3600;

export default async function HomePage() {
  const config = await getHomepageConfig();
  // ... 페이지 렌더링
}

// ─── 페이지별 렌더링 전략 ───
//
// [SSG] 빌드 타임에 생성 (변경 빈도 낮음)
// ├─ / (메인)              → ISR 1시간
// ├─ /about                → ISR 24시간
// ├─ /services             → ISR 24시간
// ├─ /faq                  → ISR 24시간
// ├─ /location             → ISR 24시간
// └─ /contact              → SSR (폼 제출 때문)
//
// [ISR] 주기적 재검증 (변경 빈도 중간)
// ├─ /portfolio            → ISR 1시간
// ├─ /portfolio/[slug]     → ISR 1시간
// ├─ /reviews              → ISR 1시간
// └─ /blog                 → ISR 30분 (새 글 빠른 반영)
//
// [SSR] 요청마다 생성 (변경 빈도 높음)
// └─ /blog/[slug]          → ISR 30분
//
// 빌드 시간 예상:
// - 정적 페이지: ~10개 (10초 이내)
// - 블로그 페이지: ~20개 (30초 이내)
// - 포트폴리오 페이지: ~20개 (30초 이내)
// - 총 빌드 시간: 약 2-3분
```

### 9-4. On-Demand Revalidation (데이터 변경 시 즉시 갱신)

```typescript
// app/api/revalidate/route.ts — 온디맨드 ISR 재검증 엔드포인트
// waide-mkt 어드민에서 데이터 수정 시 호출

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { secret, paths, tags } = await request.json();

  // 보안: revalidation secret 검증
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // 경로 기반 재검증
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path);
    }
  }

  // 태그 기반 재검증
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag);
    }
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}

// ─── waide-mkt 어드민에서 호출하는 예시 ───
//
// 포트폴리오 수정 시:
//   POST https://{subdomain}.waide.kr/api/revalidate
//   { "secret": "xxx", "paths": ["/", "/portfolio"] }
//
// 블로그 글 발행 시:
//   POST https://{subdomain}.waide.kr/api/revalidate
//   { "secret": "xxx", "paths": ["/", "/blog", "/blog/{slug}"] }
//
// 후기 추가 시:
//   POST https://{subdomain}.waide.kr/api/revalidate
//   { "secret": "xxx", "paths": ["/", "/reviews"] }
```

### 9-5. 프로젝트 수 제한 관리

```typescript
// lib/vercel.ts — 프로젝트 수 모니터링

/**
 * 현재 Vercel 팀의 프로젝트 수를 조회한다.
 * Pro 플랜은 프로젝트 수 제한 없음. Hobby는 제한 있음.
 */
async function getProjectCount(): Promise<{ total: number; active: number }> {
  const result = await vercelFetch<{
    projects: Array<{ id: string; updatedAt: number }>;
    pagination: { count: number };
  }>({
    method: 'GET',
    path: '/v9/projects?limit=1',
  });

  const total = result.pagination.count;

  // 최근 30일 내 배포된 활성 프로젝트 수 (비용에 영향)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeResult = await vercelFetch<{
    projects: Array<{ id: string; updatedAt: number }>;
  }>({
    method: 'GET',
    path: `/v9/projects?limit=100&since=${thirtyDaysAgo}`,
  });

  return {
    total,
    active: activeResult.projects.length,
  };
}

/**
 * 비용 최적화: 비활성 프로젝트 정리
 * - 90일 이상 배포 없는 프로젝트 → 일시 중단 후보
 * - suspended 상태 프로젝트 → Vercel 프로젝트 삭제 후보
 */
async function getInactiveProjects(daysThreshold: number = 90): Promise<string[]> {
  const supabase = await createClient();
  const threshold = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  const { data: projects } = await supabase
    .from('homepage_projects')
    .select('id, vercel_project_id, project_name, last_deployed_at')
    .lt('last_deployed_at', threshold.toISOString())
    .in('status', ['live', 'preview']);

  return projects?.map(p => p.id) || [];
}
```

---

## 10. 어드민 UI 연동

### 10-1. 배포 관리 UI 컴포넌트

```typescript
// components/homepage/DeployPanel.tsx
// 프로젝트 상세 페이지 내 배포 관리 패널

'use client';

import { useState, useEffect } from 'react';
import {
  deployHomepage,
  getDeploymentStatus,
  promoteToLive,
  rollbackDeployment,
} from '@/actions/homepage-deploy';

interface DeployPanelProps {
  projectId: string;
  initialStatus: string;
  vercelDeploymentUrl: string | null;
  subdomain: string | null;
  lastDeployedAt: string | null;
}

export function DeployPanel({
  projectId,
  initialStatus,
  vercelDeploymentUrl,
  subdomain,
  lastDeployedAt,
}: DeployPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState(vercelDeploymentUrl);
  const [error, setError] = useState<string | null>(null);

  // 빌드 중일 때 상태 폴링
  useEffect(() => {
    if (status !== 'building') return;

    const interval = setInterval(async () => {
      const result = await getDeploymentStatus(projectId);
      setStatus(result.status);
      if (result.vercelDeploymentUrl) {
        setDeploymentUrl(result.vercelDeploymentUrl);
      }
      if (result.status !== 'building') {
        clearInterval(interval);
      }
    }, 5000); // 5초 간격 폴링

    return () => clearInterval(interval);
  }, [status, projectId]);

  // 배포 시작
  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);
    const result = await deployHomepage(projectId);
    if (result.success) {
      setStatus('building');
    } else {
      setError(result.message);
    }
    setIsDeploying(false);
  };

  // 라이브 전환
  const handlePromote = async () => {
    const result = await promoteToLive(projectId);
    if (result.success) {
      setStatus('live');
    } else {
      setError(result.message);
    }
  };

  // 롤백
  const handleRollback = async () => {
    const result = await rollbackDeployment(projectId);
    if (result.success) {
      setStatus('preview');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <h3 className="text-lg font-semibold">배포 관리</h3>

      {/* 상태 표시 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">상태:</span>
        <StatusBadge status={status} />
      </div>

      {/* 배포 URL */}
      {deploymentUrl && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">URL:</span>
          <a href={deploymentUrl} target="_blank" rel="noopener noreferrer"
             className="text-sm text-blue-600 hover:underline">
            {deploymentUrl}
          </a>
        </div>
      )}

      {/* 서브도메인 */}
      {subdomain && status === 'live' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">라이브 URL:</span>
          <a href={`https://${subdomain}.waide.kr`} target="_blank"
             className="text-sm text-green-600 hover:underline font-medium">
            https://{subdomain}.waide.kr
          </a>
        </div>
      )}

      {/* 마지막 배포 시각 */}
      {lastDeployedAt && (
        <div className="text-xs text-muted-foreground">
          마지막 배포: {new Date(lastDeployedAt).toLocaleString('ko-KR')}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {/* 빌드 진행 중 표시 */}
      {status === 'building' && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <span className="animate-spin">...</span>
          빌드가 진행 중입니다...
        </div>
      )}

      {/* 액션 버튼들 */}
      <div className="flex gap-2 pt-2">
        {/* 빌드/재배포 버튼 */}
        {['collecting', 'build_failed', 'preview', 'live'].includes(status) && (
          <button
            onClick={handleDeploy}
            disabled={isDeploying || status === 'building'}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'collecting' ? '빌드 시작' : '재배포'}
          </button>
        )}

        {/* 라이브 전환 버튼 */}
        {status === 'preview' && (
          <button
            onClick={handlePromote}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            라이브 전환
          </button>
        )}

        {/* 롤백 버튼 */}
        {['preview', 'live', 'build_failed'].includes(status) && (
          <button
            onClick={handleRollback}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
          >
            이전 버전으로 롤백
          </button>
        )}

        {/* 프리뷰 열기 */}
        {deploymentUrl && (
          <a
            href={deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border text-sm rounded hover:bg-gray-50"
          >
            프리뷰 열기
          </a>
        )}
      </div>
    </div>
  );
}

// 상태 뱃지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    collecting: { label: '자료 수집 중', className: 'bg-gray-100 text-gray-700' },
    building: { label: '빌드 중', className: 'bg-amber-100 text-amber-700' },
    build_failed: { label: '빌드 실패', className: 'bg-red-100 text-red-700' },
    preview: { label: '프리뷰', className: 'bg-blue-100 text-blue-700' },
    live: { label: '라이브', className: 'bg-green-100 text-green-700' },
    suspended: { label: '중단됨', className: 'bg-gray-100 text-gray-500' },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-gray-100' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  );
}
```

### 10-2. 배포 이력 목록

```typescript
// components/homepage/DeployHistory.tsx

'use client';

interface DeployLog {
  id: string;
  deployment_id: string | null;
  deployment_url: string | null;
  status: string;
  event_type: string;
  error_message: string | null;
  build_duration_ms: number | null;
  created_at: string;
}

export function DeployHistory({ logs }: { logs: DeployLog[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">배포 이력</h4>
      <div className="space-y-1">
        {logs.map(log => (
          <div
            key={log.id}
            className="flex items-center justify-between text-xs border-b pb-1"
          >
            <div className="flex items-center gap-2">
              <StatusDot status={log.status} />
              <span>{log.event_type}</span>
              {log.deployment_url && (
                <a
                  href={log.deployment_url}
                  target="_blank"
                  className="text-blue-500 hover:underline"
                >
                  {log.deployment_url.replace('https://', '').slice(0, 30)}...
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {log.build_duration_ms && (
                <span>{(log.build_duration_ms / 1000).toFixed(1)}초</span>
              )}
              <span>{new Date(log.created_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    succeeded: 'bg-green-500',
    error: 'bg-red-500',
    building: 'bg-amber-500',
    promoted: 'bg-blue-500',
    rollback: 'bg-purple-500',
    canceled: 'bg-gray-400',
    auto_retry: 'bg-orange-400',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colorMap[status] || 'bg-gray-300'}`}
    />
  );
}
```

---

## 11. 보안 고려사항

### 11-1. API 인증 및 접근 제어

```
┌──────────────────────────────────────────────────────────┐
│  보안 체크리스트                                           │
│                                                          │
│  [인증]                                                   │
│  [x] Vercel API 토큰은 환경변수로만 관리                   │
│  [x] Webhook Secret으로 수신 검증                         │
│  [x] 배포 API는 어드민 인증 필수                           │
│  [x] Supabase Service Role Key는 encrypted로 저장        │
│                                                          │
│  [접근 제어]                                               │
│  [x] 배포 API는 운영팀(ops) 권한만 허용                    │
│  [x] 프리뷰 URL은 비공개 (guessable URL이지만 인덱싱 차단) │
│  [x] 롤백은 관리자 확인 후 실행                            │
│                                                          │
│  [데이터 보호]                                             │
│  [x] 환경변수에 민감 정보 직접 노출하지 않음                │
│  [x] Webhook payload 로깅 시 민감 필드 마스킹              │
│  [x] 빌드 로그에 환경변수 값 노출 방지                     │
│                                                          │
│  [네트워크]                                                │
│  [x] 모든 통신은 HTTPS                                    │
│  [x] Vercel SSL 자동 발급 (Let's Encrypt)                  │
│  [x] Webhook 엔드포인트 Rate Limiting                     │
└──────────────────────────────────────────────────────────┘
```

---

## 12. 구현 체크리스트

### Phase 5-1: 기반 구축 (Day 1)

- [ ] `lib/vercel.ts` — Vercel API 클라이언트 구현
  - [ ] `vercelFetch()` 공통 요청 함수
  - [ ] `withRetry()` 재시도 유틸리티
  - [ ] `VercelAPIError` 에러 클래스
- [ ] `lib/vercel.ts` — 프로젝트 관리 함수
  - [ ] `createVercelProject()` 프로젝트 생성
  - [ ] `buildProjectEnvVars()` 환경변수 구성
  - [ ] `upsertEnvVars()` 환경변수 업서트
- [ ] `lib/vercel.ts` — 도메인 관리 함수
  - [ ] `addSubdomain()` 서브도메인 연결
  - [ ] `addCustomDomain()` 커스텀 도메인 추가
  - [ ] `checkDomainVerification()` DNS 검증
  - [ ] `listDomains()` 도메인 목록 조회
  - [ ] `removeDomain()` 도메인 제거
- [ ] `lib/vercel.ts` — 배포 관리 함수
  - [ ] `triggerDeployHook()` Deploy Hook 트리거
  - [ ] `createDeployment()` Deployments API 배포
  - [ ] `getDeployment()` 배포 상태 조회
  - [ ] `listDeployments()` 배포 목록 조회
- [ ] DB 마이그레이션
  - [ ] `homepage_deploy_logs` 테이블 생성
  - [ ] `homepage_projects` 테이블 컬럼 추가 (`vercel_deploy_hook_url`, `build_error_message`)
- [ ] 환경변수 설정
  - [ ] `VERCEL_API_TOKEN` 발급 및 등록
  - [ ] `VERCEL_TEAM_ID` 설정 (팀 사용 시)
  - [ ] `VERCEL_WEBHOOK_SECRET` 생성 및 등록
  - [ ] Vercel 팀 계정에 `waide.kr` 도메인 등록
  - [ ] DNS 와일드카드 CNAME 설정

### Phase 5-2: API 및 Server Actions (Day 2)

- [ ] Server Actions
  - [ ] `deployHomepage()` 구현
  - [ ] `getDeploymentStatus()` 구현
  - [ ] `promoteToLive()` 구현
  - [ ] `rollbackDeployment()` 구현
- [ ] API 엔드포인트
  - [ ] `POST /api/homepage/deploy` — 배포 시작
  - [ ] `GET /api/homepage/deploy/status/[id]` — 상태 조회
  - [ ] `POST /api/homepage/deploy/promote` — 라이브 전환
  - [ ] `POST /api/homepage/deploy/rollback` — 롤백
  - [ ] `POST /api/homepage/deploy/webhook` — Webhook 수신
  - [ ] `GET /api/homepage/deploy/logs/[id]` — 배포 이력 조회
- [ ] 어드민 UI
  - [ ] `DeployPanel` 컴포넌트 (빌드/배포/롤백 버튼)
  - [ ] `DeployHistory` 컴포넌트 (배포 이력)
  - [ ] 빌드 상태 폴링 (5초 간격)
  - [ ] 프로젝트 상세 페이지에 배포 패널 통합
- [ ] 테스트
  - [ ] 최초 배포 (프로젝트 생성 + 서브도메인 + 빌드) E2E 테스트
  - [ ] 재배포 (환경변수 동기화 + 빌드) 테스트
  - [ ] Webhook 수신 및 상태 업데이트 테스트
  - [ ] 롤백 테스트
  - [ ] 에러 시 재시도 테스트
- [ ] On-Demand Revalidation
  - [ ] 템플릿에 `/api/revalidate` 엔드포인트 추가
  - [ ] 어드민에서 데이터 수정 시 revalidation 호출 연동

---

## 13. 요약

| 항목 | 내용 |
|------|------|
| **배포 방식** | Vercel REST API + GitHub 연동 (Git 기반 빌드) |
| **프로젝트 구조** | 1개 인테리어 업체 = 1개 Vercel 프로젝트 |
| **도메인** | `{subdomain}.waide.kr` (와일드카드 CNAME) + 커스텀 도메인 지원 |
| **환경변수** | Supabase 연결 + 프로젝트 ID 자동 주입 (6개 필수, 3개 선택) |
| **빌드 트리거** | Deploy Hook (권장) 또는 Deployments API |
| **상태 동기화** | Vercel Webhook → Supabase `homepage_projects.status` 자동 갱신 |
| **렌더링 전략** | SSG + ISR (1시간) + On-Demand Revalidation |
| **오류 처리** | 지수 백오프 재시도 (최대 3회) + 자동 재빌드 (최대 2회) |
| **롤백** | Vercel Instant Rollback (다운타임 제로) |
| **예상 비용** | Pro 플랜 $20/월 (100개 업체까지 추가 비용 없음) |
| **빌드 시간** | 프로젝트당 약 2-3분 |
| **구현 기간** | 2일 (Day 1: 기반 구축, Day 2: API/UI) |
