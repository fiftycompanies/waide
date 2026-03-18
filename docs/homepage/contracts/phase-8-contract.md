# Phase 8 Contract: 모니터링 & 리포트

## 계약 개요
- **Phase**: 8
- **제목**: 모니터링 & 리포트
- **예상 기간**: 2일
- **선행 조건**: Phase 5 (배포 완료된 라이브 홈페이지), Phase 6 (블로그 발행 연동)
- **담당**: Claude Code

---

## 산출물 (Deliverables)

### D-8.1: 방문 통계 수집 시스템
- **설명**: Vercel Analytics API를 연동하여 홈페이지 방문 데이터(일별 방문수, 페이지별 조회수, 유입 경로, 디바이스 비율)를 수집하는 모듈을 구현한다. 대안으로 자체 경량 스크립트(페이지뷰 이벤트 수집)도 지원한다.
- **파일**:
  - `lib/homepage/analytics/vercel-analytics.ts` (Vercel Analytics API 클라이언트)
  - `lib/homepage/analytics/types.ts` (AnalyticsData 타입 정의)
- **검증 방법**: getAnalytics() 호출 시 visitors, pageviews, topPages, topReferrers, devices 데이터 반환 확인

### D-8.2: 홈페이지 통계 대시보드
- **설명**: 프로젝트 상세 페이지에서 방문/상담 통계를 시각화하는 대시보드. KPI 카드 4개(방문수, 상담 접수, 전환율, 블로그 발행), 차트 3개(방문 추이, 상담 상태, 유입 경로), 테이블 2개(인기 페이지, 최근 상담)를 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/_components/analytics-dashboard.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/kpi-cards.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/visitors-chart.tsx` (라인 차트 — 최근 30일)
  - `app/(dashboard)/dashboard/homepage/[id]/_components/inquiry-status-chart.tsx` (파이 차트)
  - `app/(dashboard)/dashboard/homepage/[id]/_components/referrer-chart.tsx` (바 차트)
  - `app/(dashboard)/dashboard/homepage/[id]/_components/top-pages-table.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/_components/recent-inquiries.tsx`
- **검증 방법**: 대시보드 렌더링 확인, KPI 수치 정확성, 차트 데이터 바인딩, 기간 필터 변경 시 데이터 반영

### D-8.3: 월간 리포트 홈페이지 섹션
- **설명**: 기존 waide-mkt 월간 리포트(PDF)에 홈페이지 성과 섹션을 추가한다. 월간 방문수/전환율, 인기 페이지 TOP 5, 유입 경로 분석, 블로그 발행 현황, 상담 현황 요약, 다음 달 발행 예정 키워드를 포함한다.
- **파일**:
  - `lib/reports/sections/homepage-section.tsx` (리포트 데이터 생성)
  - `lib/reports/templates/homepage-report.tsx` (PDF 템플릿 컴포넌트)
- **검증 방법**: 월간 리포트 생성 시 홈페이지 섹션 포함, 데이터 정확성 확인

### D-8.4: Slack 알림 연동
- **설명**: 홈페이지에서 새 상담이 접수되면 Slack 채널로 실시간 알림을 발송한다. 고객명, 연락처, 공간유형, 평수, 예산, 메시지 요약과 "상세 보기" 버튼(어드민 링크)을 포함한 Block Kit 메시지를 전송한다.
- **파일**:
  - `lib/homepage/notifications/slack.ts` (Slack Webhook 알림 발송)
  - `app/api/inquiry/route.ts` (수정 — 상담 접수 시 Slack 알림 트리거)
- **검증 방법**: 상담 접수 시 Slack 채널에 메시지 수신, 30초 이내 발송 확인, "상세 보기" 링크 동작

### D-8.5: 이메일 알림 연동
- **설명**: 새 상담 접수 시 프로젝트 담당자 이메일로 알림을 발송한다. Resend API를 사용하여 HTML 이메일(고객 정보 + 상담 내용 + 관리 페이지 링크)을 전송한다.
- **파일**:
  - `lib/homepage/notifications/email.ts` (Resend API 이메일 발송)
  - `lib/homepage/notifications/templates/inquiry-email.tsx` (이메일 HTML 템플릿 — React Email)
- **검증 방법**: 상담 접수 시 담당자 이메일 수신, 이메일 내용 정확성, 관리 페이지 링크 동작

### D-8.6: 알림 설정 UI
- **설명**: 프로젝트별 알림 채널(Slack Webhook URL, 수신자 이메일)을 설정하는 UI. 테스트 발송 버튼, 알림 유형별 토글(신규 상담, 상태 변경, 일일 요약)을 포함한다.
- **파일**:
  - `app/(dashboard)/dashboard/homepage/[id]/settings/page.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/settings/_components/notification-settings.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/settings/_components/slack-config.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/settings/_components/email-config.tsx`
  - `app/(dashboard)/dashboard/homepage/[id]/settings/actions.ts`
- **검증 방법**: Slack Webhook URL 저장/로드, 이메일 추가/삭제, 테스트 발송 동작 확인

### D-8.7: 전체 홈페이지 운영 대시보드
- **설명**: 운영팀이 모든 홈페이지 프로젝트의 성과를 한눈에 볼 수 있는 통합 대시보드. 전체 라이브 프로젝트 수, 총 방문수, 총 상담수, 평균 전환율 KPI와 프로젝트별 성과 테이블, 담당자별 상담 처리 현황을 포함한다.
- **파일**:
  - `app/(dashboard)/ops/homepage/page.tsx`
  - `app/(dashboard)/ops/homepage/_components/ops-kpi-cards.tsx`
  - `app/(dashboard)/ops/homepage/_components/project-performance-table.tsx`
  - `app/(dashboard)/ops/homepage/_components/assign-status.tsx`
  - `app/(dashboard)/ops/homepage/_components/notification-log.tsx`
- **검증 방법**: 운영 대시보드 접근, 전체 프로젝트 집계 데이터 표시, 프로젝트별 성과 비교 가능

---

## 인수 기준 (Acceptance Criteria)

### AC-8.1: 방문 통계 수집
- [ ] Vercel Analytics API 연동으로 방문 데이터 조회 성공
- [ ] 일별 방문수(unique visitors) 데이터 수집
- [ ] 페이지별 조회수(page views) 데이터 수집
- [ ] 유입 경로(referrer) 데이터 수집
- [ ] 디바이스 비율(desktop/mobile/tablet) 데이터 수집

### AC-8.2: 대시보드 정확성
- [ ] KPI 카드 — 방문수, 상담 접수, 전환율, 블로그 발행 수치 정확
- [ ] KPI 카드 — 전월 대비 증감률(%) 정확
- [ ] 방문 추이 차트 — 최근 30일 데이터 표시
- [ ] 상담 상태 차트 — 신규/연락완료/상담중/계약/이탈 분포 정확
- [ ] 유입 경로 차트 — 네이버/구글/직접/SNS 비율 표시
- [ ] 기간 필터 변경 시 모든 데이터 갱신

### AC-8.3: 월간 리포트
- [ ] 기존 월간 리포트 PDF에 "홈페이지 성과" 섹션 추가
- [ ] 월간 방문수, 전환율, 상담 건수 포함
- [ ] 인기 페이지 TOP 5 포함
- [ ] 블로그 발행 현황(제목, 키워드, 품질 점수) 포함
- [ ] 상담 현황 요약(상태별 건수) 포함

### AC-8.4: Slack 알림
- [ ] 새 상담 접수 시 30초 이내 Slack 메시지 발송
- [ ] 메시지에 고객명, 연락처, 공간유형, 평수, 예산 포함
- [ ] "상세 보기" 버튼이 어드민 상담 상세 페이지로 연결
- [ ] Webhook URL이 프로젝트별로 설정 가능

### AC-8.5: 이메일 알림
- [ ] 새 상담 접수 시 담당자 이메일 발송
- [ ] 이메일에 고객 정보, 상담 내용, 관리 페이지 링크 포함
- [ ] 수신자 이메일이 프로젝트별로 복수 설정 가능
- [ ] 이메일 HTML 템플릿이 주요 이메일 클라이언트에서 정상 표시

### AC-8.6: 알림 설정
- [ ] Slack Webhook URL 입력, 저장, 테스트 발송 동작
- [ ] 수신자 이메일 추가/삭제, 저장, 테스트 발송 동작
- [ ] 알림 유형(신규 상담, 상태 변경, 일일 요약) 토글 설정 저장

### AC-8.7: 운영 대시보드
- [ ] 전체 라이브 프로젝트 수 정확
- [ ] 총 방문수, 총 상담수 집계 정확
- [ ] 프로젝트별 방문수, 상담수, 전환율 비교 가능
- [ ] 담당자별 상담 건수, 처리율 표시

---

## 테스트 요구사항 (Test Requirements)

### T-8.1: Vercel Analytics API 테스트
- **유형**: 통합
- **설명**: getAnalytics()를 실제 Vercel 프로젝트에 대해 호출하고, 올바른 형식의 데이터가 반환되는지 확인한다.
- **예상 결과**: AnalyticsData 타입에 맞는 데이터 반환, visitors/pageviews 숫자형, topPages 배열.

### T-8.2: KPI 카드 정확성 테스트
- **유형**: 단위
- **설명**: 알려진 방문수, 상담수 데이터로 KPI 카드 컴포넌트를 렌더링하고, 수치와 증감률이 정확한지 확인한다.
- **예상 결과**: current=100, previous=80일 때 +25% 증감률 표시.

### T-8.3: 차트 렌더링 테스트
- **유형**: E2E
- **설명**: 대시보드 페이지에서 라인 차트, 파이 차트, 바 차트가 모두 정상 렌더링되는지 확인한다.
- **예상 결과**: 3개 차트 모두 DOM에 존재, 데이터 포인트 표시.

### T-8.4: 월간 리포트 생성 테스트
- **유형**: 통합
- **설명**: generateHomepageReportSection()을 호출하고, 반환된 데이터에 모든 필수 필드가 포함되는지 확인한다.
- **예상 결과**: metrics, topPages, topReferrers, inquiryStatus, blogPosts 필드 존재.

### T-8.5: Slack 알림 발송 테스트
- **유형**: 통합
- **설명**: 테스트 Webhook URL로 sendSlackInquiryNotification()을 호출하고, Slack 채널에 메시지가 수신되는지 확인한다.
- **예상 결과**: Slack 채널에 Block Kit 메시지 수신, 30초 이내 발송.

### T-8.6: 이메일 알림 발송 테스트
- **유형**: 통합
- **설명**: 테스트 이메일 주소로 sendEmailInquiryNotification()을 호출하고, 이메일이 수신되는지 확인한다.
- **예상 결과**: 이메일 수신, HTML 렌더링 정상, 링크 동작.

### T-8.7: 알림 설정 UI 테스트
- **유형**: E2E
- **설명**: 프로젝트 설정 페이지에서 Slack Webhook URL 입력 → 저장 → 테스트 발송, 이메일 추가 → 저장 → 테스트 발송 전체 흐름을 테스트한다.
- **예상 결과**: 설정 저장 성공, 테스트 발송 성공, 페이지 새로고침 후 설정값 유지.

### T-8.8: 운영 대시보드 데이터 집계 테스트
- **유형**: 통합
- **설명**: 복수 프로젝트가 존재할 때 운영 대시보드의 집계 데이터(총 방문수, 총 상담수, 평균 전환율)가 정확한지 확인한다.
- **예상 결과**: 개별 프로젝트 데이터의 합산과 평균이 집계값과 일치.

### T-8.9: 기간 필터 테스트
- **유형**: E2E
- **설명**: 대시보드에서 기간 필터를 "최근 7일", "최근 30일", "이번 달"로 변경하고, 데이터가 해당 기간에 맞게 갱신되는지 확인한다.
- **예상 결과**: 각 기간에 해당하는 데이터만 표시, 차트/KPI 동시 갱신.

---

## 의존성 (Dependencies)
- Phase 5: Vercel 프로젝트 ID (Vercel Analytics API 호출에 필요), 배포 완료된 라이브 홈페이지
- Phase 6: 블로그 발행 데이터 (발행 현황 통계용)
- Phase 2: 상담 신청 데이터 (상담 통계용)
- Vercel Analytics 활성화 (Vercel 프로젝트 설정)
- Resend API Key (이메일 발송)
- Slack Incoming Webhook URL (Slack 알림)
- 기존 waide-mkt 월간 리포트 시스템

## 위험 요소 (Risks)
- **Vercel Analytics API 접근 제한**: Vercel Pro 이상 플랜에서만 Analytics API를 사용할 수 있음. 대응: 플랜 확인, Hobby 플랜인 경우 자체 경량 스크립트로 대체.
- **Slack Webhook URL 관리**: 프로젝트별 Webhook URL을 DB에 저장할 때 보안 이슈. 대응: 암호화 저장, 환경변수로 기본 Webhook 관리.
- **이메일 발송 한도**: Resend 무료 플랜의 일일 발송 한도(100통/일) 초과 가능. 대응: 발송 큐로 조절, 필요 시 유료 플랜 업그레이드.
- **대시보드 차트 라이브러리 선택**: recharts, chart.js, nivo 등 라이브러리 선택에 따른 번들 크기 영향. 대응: recharts 사용 (가볍고 React 친화적), tree-shaking 적용.
- **월간 리포트 기존 구조 충돌**: 기존 리포트 PDF 생성 로직에 섹션을 추가할 때 레이아웃 깨짐 가능. 대응: 기존 리포트 구조 분석 후 동일 패턴으로 섹션 추가.

## 완료 선언 조건
- [ ] 모든 산출물 생성 완료
- [ ] 모든 인수 기준 충족
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 커밋 & 푸시 완료

---

## 부록: 상세 기획서

> 아래 내용은 `/docs/phases/phase-8-detail.md`에서 통합되었습니다.

# Phase 8: 모니터링 & 리포트

## 개요
- **목적:** 홈페이지 방문 통계, 상담 전환율, 블로그 성과를 추적하는 대시보드를 구축하고, 월간 리포트에 홈페이지 섹션을 추가하며, 상담 신청 실시간 알림(Slack + 이메일)을 연동한다.
- **예상 기간:** 2일
- **선행 조건:** Phase 5 (배포 완료된 라이브 홈페이지), Phase 6 (블로그 발행 연동)
- **산출물:** 모니터링 대시보드 페이지, 월간 리포트 확장, 알림 시스템

---

## 상세 작업 목록

### 8.1 방문 통계 수집 시스템

#### 설명
홈페이지 방문자 데이터를 수집하는 경량 분석 시스템을 구현한다. Google Analytics 4 또는 자체 수집 스크립트를 사용한다.

#### 기술 스펙
- **수집 방법 1 (권장):** Vercel Analytics API 연동
  - Vercel 내장 Web Analytics 활성화
  - Vercel API로 방문 데이터 조회
- **수집 방법 2 (대안):** 자체 경량 스크립트
  - 페이지뷰 이벤트: `POST /api/analytics/pageview`
  - homepage_analytics 테이블에 저장
- **수집 데이터:**
  - 일별 방문수 (unique visitors)
  - 페이지별 조회수 (page views)
  - 유입 경로 (referrer)
  - 디바이스 (desktop/mobile/tablet)
  - 상담 폼 전환율 (방문 대비 상담 접수)

#### 파일 구조
```
lib/homepage/
├── analytics/
│   ├── vercel-analytics.ts   ← Vercel Analytics API 클라이언트
│   └── types.ts              ← 분석 데이터 타입
```

#### 코드 예시
```typescript
// lib/homepage/analytics/vercel-analytics.ts
import { vercelFetch } from '../vercel';

interface AnalyticsData {
  period: { start: string; end: string };
  visitors: number;
  pageviews: number;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  devices: { desktop: number; mobile: number; tablet: number };
}

export async function getAnalytics(
  projectId: string,
  from: string,
  to: string
): Promise<AnalyticsData> {
  const data = await vercelFetch<any>({
    method: 'GET',
    path: `/v1/web/insights/stats?projectId=${projectId}&from=${from}&to=${to}`,
  });

  return {
    period: { start: from, end: to },
    visitors: data.visitors,
    pageviews: data.pageviews,
    topPages: data.topPages,
    topReferrers: data.topReferrers,
    devices: data.devices,
  };
}
```

### 8.2 홈페이지 통계 대시보드

#### 설명
어드민에서 홈페이지 방문/상담 통계를 시각적으로 확인할 수 있는 대시보드를 구현한다.

#### 기술 스펙
- **위치:** 프로젝트 상세 → 개요 탭 (또는 별도 통계 탭)
- **KPI 카드 (4개):**
  - 이번 달 방문수 (전월 대비 증감 %)
  - 이번 달 상담 접수 (전월 대비 증감 %)
  - 상담 전환율 (상담수 / 방문수 x 100)
  - 블로그 발행 수 (이번 달)
- **차트 (3개):**
  - 일별 방문수 추이 (최근 30일, 라인 차트)
  - 상담 상태 분포 (파이 차트: 신규/연락완료/상담중/계약/이탈)
  - 유입 경로 분포 (바 차트: 네이버/구글/직접/SNS)
- **테이블 (2개):**
  - 인기 페이지 TOP 10 (페이지, 조회수, 평균 체류시간)
  - 최근 상담 신청 목록 (5개)

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/
├── _components/
│   ├── analytics-dashboard.tsx    ← 통계 대시보드 (Client Component)
│   ├── kpi-cards.tsx              ← KPI 카드 4개
│   ├── visitors-chart.tsx         ← 방문 추이 라인 차트
│   ├── inquiry-status-chart.tsx   ← 상담 상태 파이 차트
│   ├── referrer-chart.tsx         ← 유입 경로 바 차트
│   ├── top-pages-table.tsx        ← 인기 페이지 테이블
│   └── recent-inquiries.tsx       ← 최근 상담 테이블
```

#### 코드 예시
```typescript
// _components/kpi-cards.tsx
interface KPIData {
  visitors: { current: number; previous: number };
  inquiries: { current: number; previous: number };
  conversionRate: number;
  blogPosts: number;
}

export function KPICards({ data }: { data: KPIData }) {
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICard
        title="이번 달 방문수"
        value={data.visitors.current.toLocaleString()}
        change={calcChange(data.visitors.current, data.visitors.previous)}
        icon={<Eye />}
      />
      <KPICard
        title="상담 접수"
        value={data.inquiries.current}
        change={calcChange(data.inquiries.current, data.inquiries.previous)}
        icon={<MessageCircle />}
      />
      <KPICard
        title="전환율"
        value={`${data.conversionRate.toFixed(1)}%`}
        icon={<TrendingUp />}
      />
      <KPICard
        title="블로그 발행"
        value={data.blogPosts}
        icon={<FileText />}
      />
    </div>
  );
}
```

### 8.3 월간 리포트 확장

#### 설명
기존 waide-mkt 월간 리포트(PDF)에 홈페이지 성과 섹션을 추가한다.

#### 기술 스펙
- **기존 리포트 구조:**
  - 커버 페이지
  - SEO 성과 (키워드 순위, 블로그 성과)
  - AEO 성과 (AI 답변 노출)
  - 추천 사항
- **신규 추가 섹션: 홈페이지 성과**
  - 월간 방문수 / 전월 대비 증감
  - 상담 접수 건수 / 전환율
  - 인기 페이지 TOP 5
  - 유입 경로 분석
  - 블로그 발행 현황 (제목, 키워드, 조회수)
  - 상담 현황 요약 (신규/진행중/계약 건수)
  - 다음 달 계획 (발행 예정 키워드)

#### 파일 구조
```
lib/reports/
├── sections/
│   └── homepage-section.tsx   ← 리포트 홈페이지 섹션 (신규)
```

#### 코드 예시
```typescript
// lib/reports/sections/homepage-section.tsx
import { getAnalytics } from '@/lib/homepage/analytics/vercel-analytics';

export async function generateHomepageReportSection(
  projectId: string,
  month: string // '2026-03'
) {
  const startDate = `${month}-01`;
  const endDate = getLastDayOfMonth(month);

  const analytics = await getAnalytics(projectId, startDate, endDate);

  // 상담 데이터
  const { data: inquiries } = await supabase
    .from('homepage_inquiries')
    .select('status')
    .eq('project_id', projectId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // 블로그 데이터
  const { data: blogPosts } = await supabase
    .from('contents')
    .select('title, main_keyword, quality_score')
    .eq('client_id', clientId)
    .in('content_type', ['hp_blog_info', 'hp_blog_review'])
    .gte('published_at', startDate)
    .lte('published_at', endDate);

  return {
    title: '홈페이지 성과',
    metrics: {
      visitors: analytics.visitors,
      pageviews: analytics.pageviews,
      inquiries: inquiries?.length ?? 0,
      conversionRate: analytics.visitors > 0
        ? ((inquiries?.length ?? 0) / analytics.visitors * 100).toFixed(1)
        : '0.0',
      blogPostsPublished: blogPosts?.length ?? 0,
    },
    topPages: analytics.topPages.slice(0, 5),
    topReferrers: analytics.topReferrers.slice(0, 5),
    inquiryStatus: {
      new: inquiries?.filter(i => i.status === 'new').length ?? 0,
      consulting: inquiries?.filter(i => i.status === 'consulting').length ?? 0,
      contracted: inquiries?.filter(i => i.status === 'contracted').length ?? 0,
      lost: inquiries?.filter(i => i.status === 'lost').length ?? 0,
    },
    blogPosts: blogPosts ?? [],
  };
}
```

### 8.4 상담 신청 알림 시스템

#### 설명
홈페이지에서 새 상담이 접수되면 실시간으로 Slack 채널과 담당자 이메일로 알림을 발송한다.

#### 기술 스펙
- **Slack 알림:**
  - Webhook URL: 프로젝트별 설정 가능
  - 메시지 형식: 고객명, 연락처, 공간유형, 평수, 예산, 메시지 요약
  - 채널: `#homepage-inquiries` (기본) 또는 프로젝트별 채널
  - 빠른 액션 버튼: "상세 보기" → 어드민 상담 관리 페이지 링크
- **이메일 알림:**
  - 수신자: 프로젝트 담당자 이메일 (settings에서 설정)
  - 템플릿: HTML 이메일 (고객 정보 + 상담 내용 + 관리 페이지 링크)
  - 발송: Resend API 사용

#### 파일 구조
```
lib/homepage/
├── notifications/
│   ├── slack.ts              ← Slack 알림 발송
│   ├── email.ts              ← 이메일 알림 발송
│   └── templates/
│       └── inquiry-email.tsx  ← 이메일 HTML 템플릿
```

#### 코드 예시
```typescript
// lib/homepage/notifications/slack.ts
interface InquiryNotification {
  projectName: string;
  customerName: string;
  phone: string;
  spaceType: string;
  areaPyeong: number;
  budgetRange: string;
  message: string;
  adminUrl: string;
}

export async function sendSlackInquiryNotification(
  webhookUrl: string,
  data: InquiryNotification
) {
  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `새 상담 신청 — ${data.projectName}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*고객명:*\n${data.customerName}` },
          { type: 'mrkdwn', text: `*연락처:*\n${data.phone}` },
          { type: 'mrkdwn', text: `*공간유형:*\n${data.spaceType}` },
          { type: 'mrkdwn', text: `*평수:*\n${data.areaPyeong}평` },
          { type: 'mrkdwn', text: `*예산:*\n${data.budgetRange}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*메시지:*\n${data.message || '(없음)'}` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '상세 보기' },
            url: data.adminUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// lib/homepage/notifications/email.ts
import { Resend } from 'resend';
import { InquiryEmailTemplate } from './templates/inquiry-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailInquiryNotification(
  to: string[],
  data: InquiryNotification
) {
  await resend.emails.send({
    from: 'waide 홈페이지 <noreply@waide.kr>',
    to,
    subject: `[새 상담] ${data.customerName} — ${data.projectName}`,
    react: InquiryEmailTemplate({ data }),
  });
}
```

### 8.5 알림 설정 UI

#### 설명
프로젝트별 알림 채널(Slack, 이메일)을 설정하는 UI를 어드민에 추가한다.

#### 기술 스펙
- **위치:** 프로젝트 상세 → 설정 탭
- **Slack 설정:** Webhook URL 입력, 테스트 발송 버튼
- **이메일 설정:** 수신자 이메일 추가/삭제, 테스트 발송 버튼
- **알림 유형 토글:** 신규 상담, 상태 변경, 일일 요약

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/
├── settings/
│   └── page.tsx               ← 프로젝트 설정 페이지
│   └── _components/
│       ├── notification-settings.tsx  ← 알림 설정 UI
│       ├── slack-config.tsx           ← Slack 설정
│       └── email-config.tsx           ← 이메일 설정
```

### 8.6 전체 홈페이지 운영 대시보드

#### 설명
운영팀이 모든 홈페이지 프로젝트의 성과를 한눈에 볼 수 있는 통합 대시보드.

#### 기술 스펙
- **위치:** `/ops/homepage` (운영팀 전용)
- **통합 KPI:** 전체 라이브 프로젝트 수, 총 방문수, 총 상담수, 평균 전환율
- **프로젝트별 성과 테이블:** 프로젝트명, 방문수, 상담수, 전환율, 블로그 수, 상태
- **상담 배분 현황:** 담당자별 상담 건수, 처리율
- **알림 로그:** 최근 발송된 알림 이력

---

## 테스트 계획
- [ ] Vercel Analytics API 연동 — 방문 데이터 조회 정상
- [ ] KPI 카드 데이터 정확성 (방문수, 상담수, 전환율)
- [ ] 차트 렌더링 정상 (라인, 파이, 바)
- [ ] 월간 리포트 홈페이지 섹션 생성 확인
- [ ] Slack 알림 발송 정상 (테스트 웹훅)
- [ ] 이메일 알림 발송 정상 (Resend API)
- [ ] 알림 설정 UI — 저장/로드/테스트 동작 확인
- [ ] 운영 대시보드 데이터 집계 정확성
- [ ] 기간 필터 변경 시 데이터 정상 반영

## 완료 기준
- [ ] 방문 통계 수집 시스템 구현 완료
- [ ] 프로젝트별 통계 대시보드 구현 완료 (KPI + 차트 + 테이블)
- [ ] 월간 리포트 홈페이지 섹션 추가 완료
- [ ] Slack 알림 연동 완료
- [ ] 이메일 알림 연동 완료
- [ ] 알림 설정 UI 구현 완료
- [ ] 운영 대시보드 구현 완료
