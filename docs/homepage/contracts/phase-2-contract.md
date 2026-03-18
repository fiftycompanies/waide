# Phase 2 Contract: 어드민 UI

## 계약 개요
- **Phase**: 2
- **제목**: 어드민 UI
- **예상 기간**: 3일
- **선행 조건**: Phase 1 (DB 스키마 확장) 완료
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-2.1: 사이드바 메뉴 확장
- **설명**: 기존 waide-mkt 어드민 사이드바에 "홈페이지" 메뉴 그룹을 추가한다. Globe 아이콘, 프로젝트 목록/상담 신청 하위 메뉴를 포함한다.
- **파일**: `app/(dashboard)/_components/sidebar.tsx` (수정)
- **검증 방법**: 사이드바에 "홈페이지" 메뉴 표시, 하위 메뉴 클릭 시 해당 페이지 이동 확인

### D-2.2: 프로젝트 목록 페이지
- **설명**: 모든 홈페이지 프로젝트를 카드 형태로 나열하는 목록 페이지. 상태별 통계 카드(5개), 상태 필터 탭, 검색, 프로젝트 카드를 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/page.tsx`
  - `app/(dashboard)/dashboard/homepage/_components/stats-cards.tsx`
  - `app/(dashboard)/dashboard/homepage/_components/project-filters.tsx`
  - `app/(dashboard)/dashboard/homepage/_components/project-card.tsx`
  - `app/(dashboard)/dashboard/homepage/_components/status-badge.tsx`
- **검증 방법**: 통계 카드 수치 정확성, 필터/검색 동작, 프로젝트 카드 렌더링 확인

### D-2.3: 새 프로젝트 생성 페이지
- **설명**: 클라이언트 선택(Combobox), 프로젝트명, 템플릿 선택(3종 카드), 서브도메인 입력(중복 체크)을 포함한 프로젝트 생성 폼 페이지.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/new/page.tsx`
  - `app/(dashboard)/dashboard/homepage/new/_components/client-select.tsx`
  - `app/(dashboard)/dashboard/homepage/new/_components/template-picker.tsx`
  - `app/(dashboard)/dashboard/homepage/new/_components/subdomain-input.tsx`
  - `app/(dashboard)/dashboard/homepage/new/actions.ts`
- **검증 방법**: 클라이언트 선택, 서브도메인 중복 체크, 생성 후 상세 페이지 리다이렉트 확인

### D-2.4: 프로젝트 상세 페이지
- **설명**: 프로젝트 전체 정보를 5개 탭(개요/자료/포트폴리오/후기/상담)으로 보여주는 상세 페이지. 상태 전환 버튼, 프리뷰 열기, 재배포, 위험 영역(삭제/중단)을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/layout.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/project-header.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/tab-navigation.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/overview-tab.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/stats-mini-chart.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/danger-zone.tsx`
- **검증 방법**: 5개 탭 전환 동작, 상태 전환 버튼 동작, 프리뷰 링크 정상 확인

### D-2.5: 자료 수집 5단계 위저드
- **설명**: 고객 자료를 5단계(기본정보 / 서비스정보 / 포트폴리오 / 후기&SNS / 디자인설정)로 수집하는 위저드 폼. 프로그레스 바, 각 단계 자동 저장, 이미지 업로드를 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/collect/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/step-progress.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/step-1-basic.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/step-2-service.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/step-3-portfolio.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/step-4-reviews.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/step-5-design.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/image-uploader.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/color-picker.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/_components/region-select.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/collect/actions.ts`
- **검증 방법**: 5단계 순차 진행, 자동 저장 동작, 이미지 업로드 → Supabase Storage, 완료 시 is_complete=true

### D-2.6: 포트폴리오 관리 페이지
- **설명**: 등록된 포트폴리오를 관리하는 페이지. 드래그 앤 드롭 정렬(dnd-kit), 메인 노출 토글, 편집/삭제 기능을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/portfolios/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/portfolios/_components/portfolio-grid.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/portfolios/_components/portfolio-card.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/portfolios/_components/portfolio-modal.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/portfolios/_components/sortable-item.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/portfolios/actions.ts`
- **검증 방법**: 추가/편집/삭제 CRUD 동작, 드래그 앤 드롭 정렬 저장, is_featured 토글 즉시 반영

### D-2.7: 후기 관리 페이지
- **설명**: 고객 후기를 관리하는 페이지. 수동 추가(고객명/평점/내용/시공유형), 편집, 삭제 기능을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/reviews/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/reviews/_components/review-list.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/reviews/_components/review-form.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/reviews/_components/star-rating.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/reviews/actions.ts`
- **검증 방법**: 후기 추가/편집/삭제 CRUD 동작, 평점 1~5 범위 검증

### D-2.8: 상담 신청 관리 페이지
- **설명**: 홈페이지에서 접수된 상담 신청을 관리하는 페이지. 상태별 필터 탭, 상세 슬라이드 패널, 상태 변경 드롭다운, 담당자 배분을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/_components/inquiry-table.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/_components/inquiry-filters.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/_components/inquiry-detail.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/_components/status-dropdown.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/_components/assign-select.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/inquiries/actions.ts`
- **검증 방법**: 상태 필터 동작, 상세 패널 슬라이드, 상태 변경 즉시 반영, 담당자 배분 저장

### D-2.9: 클라이언트 상세 홈페이지 탭
- **설명**: 기존 클라이언트 상세 페이지(10탭)에 11번째 "홈페이지" 탭을 추가한다. 프로젝트 요약 카드, 방문/상담 통계, 포트폴리오 썸네일, 블로그 발행 현황을 표시한다.
- **파일**: `app/(dashboard)/dashboard/clients/[id]/_components/homepage-tab.tsx`
- **검증 방법**: 클라이언트 상세에서 홈페이지 탭 표시, 데이터 연동 확인

---

## 인수 기준 (Acceptance Criteria)

### AC-2.1: 라우트 접근성
- [ ] /dashboard/homepage 접근 가능 (프로젝트 목록)
- [ ] /dashboard/homepage/new 접근 가능 (새 프로젝트)
- [ ] /dashboard/homepage/[id] 접근 가능 (프로젝트 상세)
- [ ] /dashboard/homepage/[id]/collect 접근 가능 (자료 수집)
- [ ] /dashboard/homepage/[id]/portfolios 접근 가능 (포트폴리오)
- [ ] /dashboard/homepage/[id]/reviews 접근 가능 (후기)
- [ ] /dashboard/homepage/[id]/inquiries 접근 가능 (상담)

### AC-2.2: CRUD 동작
- [ ] 프로젝트 생성(INSERT) 정상 동작
- [ ] 프로젝트 조회(SELECT) — 목록, 상세 정상 동작
- [ ] 프로젝트 수정(UPDATE) — 상태 전환, 설정 변경 정상 동작
- [ ] 프로젝트 삭제(DELETE) — CASCADE 포함 정상 동작
- [ ] 자료(materials) 저장/수정 정상 동작
- [ ] 포트폴리오 CRUD 정상 동작
- [ ] 후기 CRUD 정상 동작
- [ ] 상담 상태 변경/담당자 배분 정상 동작

### AC-2.3: 폼 유효성 검사
- [ ] 프로젝트 생성 시 클라이언트 필수 선택
- [ ] 서브도메인 중복 체크 동작
- [ ] 자료 수집 폼 필수 필드 검증 (업체명, 대표명, 전화번호, 주소, 소개)
- [ ] 후기 평점 1~5 범위 검증
- [ ] 전화번호 형식 검증

### AC-2.4: 반응형 디자인
- [ ] 모바일 (< 640px) 레이아웃 정상
- [ ] 태블릿 (640~1024px) 레이아웃 정상
- [ ] 데스크톱 (> 1024px) 레이아웃 정상

### AC-2.5: 로딩/에러 상태
- [ ] 데이터 로딩 중 스켈레톤 또는 스피너 표시
- [ ] API 에러 시 사용자 친화적 에러 메시지 표시
- [ ] 빈 데이터 상태에서 적절한 Empty State 표시

### AC-2.6: 이미지 업로드
- [ ] 포트폴리오 이미지 Supabase Storage 업로드 성공
- [ ] 로고 이미지 업로드 성공
- [ ] Before/After 이미지 업로드 성공
- [ ] 이미지 미리보기 표시

---

## 테스트 요구사항 (Test Requirements)

### T-2.1: 사이드바 메뉴 테스트
- **유형**: E2E
- **설명**: 사이드바에 "홈페이지" 메뉴가 표시되고, 클릭 시 올바른 페이지로 이동하는지 확인한다.
- **예상 결과**: 메뉴 아이콘, 라벨, 하위 메뉴 표시 및 네비게이션 정상.

### T-2.2: 프로젝트 CRUD 플로우 테스트
- **유형**: E2E
- **설명**: 프로젝트 생성 → 목록에서 확인 → 상세 조회 → 삭제까지 전체 흐름을 테스트한다.
- **예상 결과**: 생성된 프로젝트가 목록에 표시되고, 삭제 후 목록에서 사라진다.

### T-2.3: 자료 수집 위저드 테스트
- **유형**: E2E
- **설명**: 5단계 위저드를 처음부터 끝까지 진행하며 각 단계의 저장과 진행이 정상 동작하는지 확인한다.
- **예상 결과**: 각 단계 데이터 저장 성공, 최종 완료 시 is_complete=true, status='building'으로 전환.

### T-2.4: 이미지 업로드 테스트
- **유형**: 통합
- **설명**: 포트폴리오 이미지, 로고, Before/After 이미지를 업로드하고 Supabase Storage에 정상 저장되는지 확인한다.
- **예상 결과**: 업로드 성공, 공개 URL로 접근 가능, 미리보기 표시.

### T-2.5: 필터 및 검색 테스트
- **유형**: 단위
- **설명**: 프로젝트 목록의 상태 필터와 검색 기능이 정상 동작하는지 확인한다.
- **예상 결과**: 상태별 필터 적용 시 해당 상태 프로젝트만 표시, 검색어 입력 시 일치하는 프로젝트만 표시.

### T-2.6: 반응형 디자인 테스트
- **유형**: E2E
- **설명**: 모바일, 태블릿, 데스크톱 뷰포트에서 모든 페이지의 레이아웃이 정상인지 확인한다.
- **예상 결과**: 각 브레이크포인트에서 레이아웃 깨짐 없음, 터치/클릭 인터랙션 정상.

### T-2.7: 권한 체크 테스트
- **유형**: 통합
- **설명**: 비인가 사용자(로그아웃 상태)가 /dashboard/homepage 경로에 접근 시 리다이렉트되는지 확인한다.
- **예상 결과**: 로그인 페이지로 리다이렉트.

---

## 의존성 (Dependencies)
- Phase 1: 5개 신규 테이블 생성 완료, RLS 정책 활성화, Storage 버킷 생성
- 기존 waide-mkt 사이드바 컴포넌트 구조 파악
- 기존 클라이언트 상세 페이지 탭 구조 파악

## 위험 요소 (Risks)
- **기존 사이드바 구조 변경 충돌**: 기존 사이드바 컴포넌트 수정 시 다른 메뉴에 영향을 줄 수 있음. 대응: 기존 메뉴 배열에 추가만 하고 수정하지 않음.
- **dnd-kit 라이브러리 호환성**: Next.js App Router의 Server Component와 dnd-kit의 Client Component 혼합 시 이슈 발생 가능. 대응: 포트폴리오 그리드를 Client Component로 분리.
- **이미지 업로드 용량 제한**: 대용량 이미지 업로드 시 타임아웃 발생 가능. 대응: 클라이언트 사이드 이미지 리사이징(max 2MB) 적용.

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-2-detail.md`에서 통합되었습니다.

# Phase 2: 어드민 UI

## 개요
- **목적:** waide-mkt 어드민 대시보드에 홈페이지 프로젝트 관리 페이지를 추가하여, 프로젝트 생성/관리, 자료 수집, 포트폴리오/후기/상담 관리를 할 수 있는 UI를 구현한다.
- **예상 기간:** 3일
- **선행 조건:** Phase 1 (DB 스키마) 완료
- **산출물:** 7개 어드민 페이지, 사이드바 메뉴 확장, 클라이언트 상세 홈페이지 탭

---

## 상세 작업 목록

### 2.1 사이드바 메뉴 추가

#### 설명
기존 waide-mkt 어드민 사이드바에 "홈페이지" 메뉴 그룹을 추가한다. 프로젝트 목록, 자료 수집, 템플릿 관리, 상담 신청 하위 메뉴를 포함한다.

#### 기술 스펙
- 기존 사이드바 컴포넌트에 메뉴 아이템 추가
- 아이콘: Globe (lucide-react)
- 활성 상태 하이라이트
- 역할별 접근 제어: owner, admin, member만 접근 가능

#### 파일 구조
```
app/(dashboard)/
├── _components/
│   └── sidebar.tsx          ← 메뉴 아이템 추가
```

#### 코드 예시
```typescript
// sidebar.tsx 메뉴 아이템 추가
const homepageMenuItems = [
  {
    label: '홈페이지',
    icon: Globe,
    href: '/dashboard/homepage',
    children: [
      { label: '프로젝트 목록', href: '/dashboard/homepage' },
      { label: '상담 신청', href: '/dashboard/homepage/inquiries' },
    ],
  },
];
```

### 2.2 프로젝트 목록 페이지 (/dashboard/homepage)

#### 설명
모든 홈페이지 프로젝트를 카드 형태로 나열하는 목록 페이지. 상태별 통계 카드, 필터, 검색, 정렬 기능을 제공한다.

#### 기술 스펙
- **통계 카드 (5개):** 전체, 수집중, 빌드중, 프리뷰, 라이브 — 클릭 시 필터 적용
- **상태 필터 탭:** 전체, 수집중, 빌드중, 프리뷰, 라이브, 중단
- **프로젝트 카드:** 프로젝트명, 업체명, 상태 배지, 템플릿, 서브도메인, 방문수/상담수, 마지막 배포일, 빠른 액션 링크
- **검색:** 업체명/프로젝트명 실시간 검색
- **+ 새 프로젝트 버튼:** 생성 페이지로 이동
- **Server Component:** Supabase에서 직접 조회

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/
├── page.tsx                  ← 프로젝트 목록 (Server Component)
├── _components/
│   ├── stats-cards.tsx       ← 통계 카드 영역
│   ├── project-filters.tsx   ← 필터 탭 + 검색 (Client Component)
│   ├── project-card.tsx      ← 프로젝트 카드 아이템
│   └── status-badge.tsx      ← 상태 배지 컴포넌트
```

#### 코드 예시
```typescript
// page.tsx
export default async function HomepageProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const supabase = await createServerClient();

  let query = supabase
    .from('homepage_projects')
    .select('*, client:clients(company_name, brand_persona)')
    .order('created_at', { ascending: false });

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.q) {
    query = query.ilike('project_name', `%${searchParams.q}%`);
  }

  const { data: projects } = await query;

  // 상태별 카운트
  const { data: stats } = await supabase
    .from('homepage_projects')
    .select('status')
    .then(({ data }) => ({
      data: {
        total: data?.length ?? 0,
        collecting: data?.filter(p => p.status === 'collecting').length ?? 0,
        building: data?.filter(p => p.status === 'building').length ?? 0,
        preview: data?.filter(p => p.status === 'preview').length ?? 0,
        live: data?.filter(p => p.status === 'live').length ?? 0,
      }
    }));

  return (
    <div>
      <PageHeader title="홈페이지 프로젝트" action={<NewProjectButton />} />
      <StatsCards stats={stats} activeStatus={searchParams.status} />
      <ProjectFilters />
      <ProjectList projects={projects} />
    </div>
  );
}
```

### 2.3 새 프로젝트 생성 (/dashboard/homepage/new)

#### 설명
새 홈페이지 프로젝트를 생성하는 폼 페이지. 클라이언트 선택, 프로젝트명, 템플릿 선택, 서브도메인 설정을 포함한다.

#### 기술 스펙
- **클라이언트 선택:** 기존 clients 테이블에서 검색/선택 (Combobox)
- **프로젝트명:** 자동 생성 (업체명 + 홈페이지) + 수동 수정 가능
- **템플릿 선택:** 3종 카드 미리보기 (modern-minimal, natural-wood, premium-dark)
- **서브도메인:** 자동 제안 (업체명 기반 슬러그) + 중복 체크
- **생성 후:** 프로젝트 상세 페이지로 리다이렉트
- **Server Action:** createHomepageProject()

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/new/
├── page.tsx                  ← 생성 폼 페이지
├── _components/
│   ├── client-select.tsx     ← 클라이언트 선택 Combobox
│   ├── template-picker.tsx   ← 템플릿 3종 카드 선택
│   └── subdomain-input.tsx   ← 서브도메인 입력 + 중복 체크
```

#### 코드 예시
```typescript
// actions.ts
'use server'

export async function createHomepageProject(formData: FormData) {
  const supabase = await createServerClient();

  const clientId = formData.get('client_id') as string;
  const projectName = formData.get('project_name') as string;
  const templateId = formData.get('template_id') as string;
  const subdomain = formData.get('subdomain') as string;

  // 서브도메인 중복 체크
  const { data: existing } = await supabase
    .from('homepage_projects')
    .select('id')
    .eq('subdomain', subdomain)
    .single();

  if (existing) {
    return { error: '이미 사용 중인 서브도메인입니다.' };
  }

  const { data: project, error } = await supabase
    .from('homepage_projects')
    .insert({
      client_id: clientId,
      project_name: projectName,
      template_id: templateId,
      subdomain,
      status: 'collecting',
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // 빈 materials 레코드 생성
  await supabase.from('homepage_materials').insert({
    project_id: project.id,
    company_name: '',
    owner_name: '',
    phone: '',
    address: '',
    description: '',
  });

  redirect(`/dashboard/homepage/${project.id}`);
}
```

### 2.4 프로젝트 상세 (/dashboard/homepage/[id])

#### 설명
프로젝트의 전체 정보를 탭 형태로 보여주는 상세 페이지. 개요, 자료, 포트폴리오, 후기, 상담 5개 탭으로 구성된다.

#### 기술 스펙
- **탭 구조:** 개요 / 자료 / 포트폴리오 / 후기 / 상담
- **개요 탭:**
  - 프로젝트 상태 카드 (현재 상태, 서브도메인, 최신 배포일)
  - 빠른 작업 버튼 (프리뷰 열기, 재배포, 설정)
  - 방문/상담 통계 미니 차트
  - 최근 블로그 글 목록 (3개)
  - 최근 상담 신청 목록 (5개)
- **상태 전환 버튼:** collecting → building, preview → live 등
- **위험 영역:** 프로젝트 삭제, 서비스 중단

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/
├── page.tsx                  ← 프로젝트 상세 (탭 구조)
├── layout.tsx                ← 프로젝트 헤더 + 탭 네비게이션
├── _components/
│   ├── project-header.tsx    ← 프로젝트명 + 상태 + 액션 버튼
│   ├── tab-navigation.tsx    ← 탭 전환 UI
│   ├── overview-tab.tsx      ← 개요 탭 콘텐츠
│   ├── stats-mini-chart.tsx  ← 방문/상담 통계 미니 차트
│   └── danger-zone.tsx       ← 삭제/중단 영역
```

#### 코드 예시
```typescript
// layout.tsx
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from('homepage_projects')
    .select('*, client:clients(company_name)')
    .eq('id', params.id)
    .single();

  if (!project) notFound();

  return (
    <div>
      <ProjectHeader project={project} />
      <TabNavigation projectId={params.id} />
      {children}
    </div>
  );
}
```

### 2.5 자료 수집 폼 (/dashboard/homepage/[id]/collect)

#### 설명
고객 자료를 5단계로 수집하는 위저드 폼. 각 단계별로 자동 저장되며, 진행률 표시를 포함한다.

#### 기술 스펙
- **STEP 1 — 기본 정보:** 업체명, 대표명, 전화번호, 주소, 업체 소개, 카카오톡 링크
- **STEP 2 — 서비스 정보:** 서비스 지역 (멀티 셀렉트), 서비스 유형 (멀티 셀렉트)
- **STEP 3 — 포트폴리오:** 시공 사례 등록 (이미지 업로드, Before/After, 공간 유형, 평수, 예산)
- **STEP 4 — 후기 & SNS:** 고객 후기 등록, SNS 계정 입력
- **STEP 5 — 디자인 설정:** 로고 업로드, 메인 컬러/서브 컬러 선택, 템플릿 미리보기
- **프로그레스 바:** 현재 단계 / 전체 단계 시각화
- **자동 저장:** 각 단계 완료 시 Server Action으로 즉시 저장
- **완료 시:** is_complete = true, submitted_at = NOW()

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/collect/
├── page.tsx                  ← 자료 수집 위저드 (Client Component)
├── _components/
│   ├── step-progress.tsx     ← 5단계 프로그레스 바
│   ├── step-1-basic.tsx      ← 기본 정보 폼
│   ├── step-2-service.tsx    ← 서비스 정보 폼
│   ├── step-3-portfolio.tsx  ← 포트폴리오 등록 폼
│   ├── step-4-reviews.tsx    ← 후기 & SNS 폼
│   ├── step-5-design.tsx     ← 디자인 설정 폼
│   ├── image-uploader.tsx    ← 이미지 업로드 컴포넌트
│   ├── color-picker.tsx      ← 컬러 선택기
│   └── region-select.tsx     ← 지역 멀티 셀렉트
├── actions.ts                ← Server Actions
```

#### 코드 예시
```typescript
// actions.ts
'use server'

export async function saveBasicInfo(projectId: string, formData: FormData) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('homepage_materials')
    .update({
      company_name: formData.get('company_name'),
      owner_name: formData.get('owner_name'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      description: formData.get('description'),
      kakao_link: formData.get('kakao_link'),
    })
    .eq('project_id', projectId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addPortfolio(projectId: string, formData: FormData) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('homepage_portfolios')
    .insert({
      project_id: projectId,
      title: formData.get('title'),
      space_type: formData.get('space_type'),
      style: formData.get('style'),
      area_pyeong: parseInt(formData.get('area_pyeong') as string),
      budget_range: formData.get('budget_range'),
      description: formData.get('description'),
      image_urls: JSON.parse(formData.get('image_urls') as string),
      before_image_url: formData.get('before_image_url'),
      after_image_url: formData.get('after_image_url'),
    });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/homepage/${projectId}/collect`);
  return { success: true };
}

export async function completeCollection(projectId: string) {
  const supabase = await createServerClient();

  await supabase
    .from('homepage_materials')
    .update({ is_complete: true, submitted_at: new Date().toISOString() })
    .eq('project_id', projectId);

  // 프로젝트 상태를 building으로 변경
  await supabase
    .from('homepage_projects')
    .update({ status: 'building' })
    .eq('id', projectId);

  // 키워드 자동 생성 트리거
  await generateHomepageKeywords(projectId);

  redirect(`/dashboard/homepage/${projectId}`);
}
```

### 2.6 포트폴리오 관리 (/dashboard/homepage/[id]/portfolios)

#### 설명
등록된 포트폴리오를 관리하는 페이지. 드래그 앤 드롭 정렬, 메인 페이지 노출 토글, 편집/삭제 기능을 제공한다.

#### 기술 스펙
- **포트폴리오 그리드:** 이미지 썸네일 + 정보 카드 형태
- **드래그 앤 드롭:** sort_order 변경 (dnd-kit 사용)
- **메인 노출 토글:** is_featured 즉시 업데이트
- **편집 모달:** 제목, 설명, 공간 유형, 평수, 예산, 이미지 변경
- **삭제:** 확인 다이얼로그 후 삭제
- **+ 추가 버튼:** 새 포트폴리오 등록 모달

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/portfolios/
├── page.tsx                  ← 포트폴리오 목록 (Server Component)
├── _components/
│   ├── portfolio-grid.tsx    ← 포트폴리오 그리드 (Client Component)
│   ├── portfolio-card.tsx    ← 개별 포트폴리오 카드
│   ├── portfolio-modal.tsx   ← 등록/편집 모달
│   └── sortable-item.tsx     ← 드래그 가능한 아이템
├── actions.ts                ← Server Actions
```

### 2.7 후기 관리 (/dashboard/homepage/[id]/reviews)

#### 설명
고객 후기를 관리하는 페이지. 수동 추가, 네이버 플레이스 임포트, 편집/삭제 기능을 제공한다.

#### 기술 스펙
- **후기 목록:** 고객명, 평점(별), 내용, 시공 유형, 출처 배지, 등록일
- **수동 추가:** 고객명, 평점, 후기 내용, 시공 유형 입력 폼
- **네이버 임포트:** 네이버 플레이스 URL 입력 → 후기 크롤링 (향후)
- **삭제:** 확인 다이얼로그 후 삭제

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/reviews/
├── page.tsx                  ← 후기 목록 (Server Component)
├── _components/
│   ├── review-list.tsx       ← 후기 목록 테이블
│   ├── review-form.tsx       ← 후기 추가 폼
│   ├── star-rating.tsx       ← 별점 입력 컴포넌트
│   └── import-dialog.tsx     ← 네이버 임포트 다이얼로그
├── actions.ts
```

### 2.8 상담 신청 관리 (/dashboard/homepage/[id]/inquiries)

#### 설명
홈페이지에서 접수된 상담 신청을 관리하는 페이지. 상태별 필터, 상세 슬라이드 패널, 담당자 배분, 메모 기능을 제공한다.

#### 기술 스펙
- **상담 목록:** 테이블 형태 — 고객명, 연락처, 공간유형, 평수, 예산, 상태 배지, 접수일
- **상태 필터 탭:** 전체, 신규, 연락완료, 상담중, 계약, 이탈
- **상세 슬라이드 패널:** 우측에서 슬라이드 인 — 상담 상세 + 타임라인 + 메모
- **상태 변경:** 드롭다운으로 즉시 변경
- **담당자 배분:** 멤버 목록에서 선택
- **Slack/이메일 알림 설정:** 신규 상담 접수 시 알림

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/inquiries/
├── page.tsx                  ← 상담 목록 (Server Component)
├── _components/
│   ├── inquiry-table.tsx     ← 상담 목록 테이블
│   ├── inquiry-filters.tsx   ← 상태 필터 탭
│   ├── inquiry-detail.tsx    ← 상세 슬라이드 패널
│   ├── status-dropdown.tsx   ← 상태 변경 드롭다운
│   └── assign-select.tsx     ← 담당자 배분 셀렉트
├── actions.ts
```

### 2.9 클라이언트 상세에 홈페이지 탭 추가

#### 설명
기존 클라이언트 상세 페이지(10탭)에 11번째 "홈페이지" 탭을 추가한다. 해당 클라이언트의 홈페이지 프로젝트 요약, 배포 이력, 통계를 보여준다.

#### 기술 스펙
- **프로젝트 요약 카드:** 상태, 서브도메인, 템플릿, 최신 배포일
- **방문/상담 통계 차트:** 최근 30일 추이
- **포트폴리오 목록:** 최근 6개 썸네일
- **블로그 발행 현황:** 최근 5개 글 목록
- **빠른 링크:** 프로젝트 상세, 프리뷰, 어드민 바로가기

#### 파일 구조
```
app/(dashboard)/dashboard/clients/[id]/
├── _components/
│   └── homepage-tab.tsx      ← 홈페이지 탭 컨텐츠 (신규)
```

---

## 테스트 계획
- [ ] 사이드바에 "홈페이지" 메뉴 표시 및 네비게이션 동작 확인
- [ ] 프로젝트 목록 페이지 — 통계 카드, 필터, 검색, 정렬 동작 확인
- [ ] 새 프로젝트 생성 — 클라이언트 선택, 서브도메인 중복 체크, 생성 후 리다이렉트
- [ ] 프로젝트 상세 — 5개 탭 전환 동작 확인
- [ ] 자료 수집 폼 — 5단계 위저드 진행, 자동 저장, 이미지 업로드
- [ ] 포트폴리오 관리 — 추가, 편집, 삭제, 정렬, 메인 노출 토글
- [ ] 후기 관리 — 추가, 편집, 삭제
- [ ] 상담 관리 — 목록 조회, 상태 변경, 상세 패널, 담당자 배분
- [ ] 클라이언트 홈페이지 탭 — 데이터 연동 확인
- [ ] 반응형 레이아웃 (모바일/태블릿/데스크톱) 확인
- [ ] 권한 체크 — 비인가 사용자 접근 차단 확인

## 완료 기준
- [ ] 7개 어드민 페이지 구현 완료
- [ ] 사이드바 메뉴 추가 및 활성 상태 표시 정상
- [ ] 클라이언트 상세 홈페이지 탭 추가 완료
- [ ] 모든 CRUD 동작 정상 (생성, 조회, 수정, 삭제)
- [ ] 이미지 업로드 → Supabase Storage 연동 정상
- [ ] 자료 수집 5단계 위저드 전체 흐름 정상
- [ ] 반응형 디자인 3개 브레이크포인트 대응 완료
