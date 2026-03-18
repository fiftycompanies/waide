# 홈페이지 서비스 데이터베이스 스키마

## 개요

인테리어 업체 홈페이지 서비스를 위한 Supabase(PostgreSQL) 데이터베이스 스키마입니다.
5개 핵심 테이블과 Storage 버킷으로 구성됩니다.

---

## 테이블 관계도

```
clients (기존 테이블)
  |
  +-- homepage_projects (1:N)
        |
        +-- homepage_materials (1:1)
        |
        +-- homepage_portfolios (1:N)
        |
        +-- homepage_reviews (1:N)
        |
        +-- homepage_inquiries (1:N)

keywords (기존 테이블)
  +-- homepage_projects와 metadata.project_id로 연결

contents (기존 테이블)
  +-- hp_blog_info, hp_blog_review 타입으로 홈페이지 블로그 연동

publishing_accounts (기존 테이블)
  +-- platform='homepage'로 홈페이지 블로그 발행 플랫폼 등록

homepage_page_views (신규)
  +-- homepage_projects.id로 연결, 방문 통계 수집
```

---

## 1. homepage_projects

> 홈페이지 프로젝트 - 인테리어 업체별 홈페이지 관리

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 프로젝트 ID |
| `client_id` | UUID | NOT NULL, FK -> clients(id) ON DELETE CASCADE | 클라이언트 ID |
| `project_name` | TEXT | NOT NULL | 프로젝트명 |
| `template_id` | TEXT | NOT NULL, DEFAULT 'modern-minimal' | 템플릿 ID |
| `status` | TEXT | NOT NULL, DEFAULT 'collecting', CHECK | 프로젝트 상태 |
| `subdomain` | TEXT | UNIQUE | 서브도메인 (예: gangnam-interior) |
| `custom_domain` | TEXT | - | 커스텀 도메인 |
| `vercel_project_id` | TEXT | - | Vercel 프로젝트 ID |
| `vercel_deployment_url` | TEXT | - | 현재 배포 URL |
| `theme_config` | JSONB | NOT NULL, DEFAULT '{}' | 테마 설정 |
| `seo_config` | JSONB | NOT NULL, DEFAULT '{}' | SEO 설정 |
| `blog_config` | JSONB | NOT NULL, DEFAULT '{}' | 블로그 발행 설정 |
| `total_visits` | INTEGER | DEFAULT 0 | 총 방문수 |
| `total_inquiries` | INTEGER | DEFAULT 0 | 총 상담수 |
| `last_deployed_at` | TIMESTAMPTZ | - | 마지막 배포 시각 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |

**status CHECK 제약조건:**
```
'collecting' | 'building' | 'build_failed' | 'preview' | 'live' | 'suspended'
```

**인덱스:**
- `idx_hp_projects_client` - client_id
- `idx_hp_projects_status` - status
- `idx_hp_projects_subdomain` - subdomain (UNIQUE, WHERE subdomain IS NOT NULL)

**RLS 정책:**
- SELECT: 워크스페이스 멤버만 자신의 프로젝트 조회 가능
- INSERT: 워크스페이스 멤버만 자신의 클라이언트에 프로젝트 생성 가능
- UPDATE: 워크스페이스 멤버만 자신의 프로젝트 수정 가능
- DELETE: 워크스페이스 멤버만 자신의 프로젝트 삭제 가능

**트리거:**
- `homepage_projects_updated_at` - BEFORE UPDATE -> update_updated_at()

---

## 2. homepage_materials

> 고객 수집 자료 - 5단계 위저드로 수집한 업체 정보

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 자료 ID |
| `project_id` | UUID | NOT NULL, FK -> homepage_projects(id) ON DELETE CASCADE | 프로젝트 ID |
| `company_name` | TEXT | NOT NULL | 업체명 |
| `owner_name` | TEXT | NOT NULL | 대표자명 |
| `phone` | TEXT | NOT NULL | 연락처 |
| `address` | TEXT | NOT NULL | 주소 |
| `address_lat` | FLOAT | - | 위도 |
| `address_lng` | FLOAT | - | 경도 |
| `description` | TEXT | NOT NULL | 업체 소개 |
| `kakao_link` | TEXT | - | 카카오톡 상담 링크 |
| `service_regions` | TEXT[] | DEFAULT '{}' | 서비스 지역 배열 |
| `service_types` | TEXT[] | DEFAULT '{}' | 서비스 유형 배열 |
| `logo_url` | TEXT | - | 로고 URL |
| `primary_color` | TEXT | DEFAULT '#2563eb' | 메인 색상 |
| `secondary_color` | TEXT | DEFAULT '#10b981' | 보조 색상 |
| `instagram_url` | TEXT | - | 인스타그램 URL |
| `youtube_url` | TEXT | - | 유튜브 URL |
| `naver_place_url` | TEXT | - | 네이버 플레이스 URL |
| `naver_blog_url` | TEXT | - | 네이버 블로그 URL |
| `certifications` | TEXT[] | - | 자격증/인증 목록 |
| `operating_hours` | TEXT | - | 운영 시간 |
| `business_number` | TEXT | - | 사업자등록번호 |
| `faq_items` | JSONB | DEFAULT '[]' | FAQ 항목 [{q, a}] |
| `is_complete` | BOOLEAN | DEFAULT FALSE | 수집 완료 여부 |
| `submitted_at` | TIMESTAMPTZ | - | 제출 시각 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |

**인덱스:**
- `idx_hp_materials_project` - project_id

**RLS 정책:**
- SELECT/INSERT/UPDATE/DELETE: 프로젝트 소유 워크스페이스 멤버만 접근 가능

**트리거:**
- `homepage_materials_updated_at` - BEFORE UPDATE -> update_updated_at()

---

## 3. homepage_portfolios

> 포트폴리오 - 시공 사례 이미지 및 정보

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 포트폴리오 ID |
| `project_id` | UUID | NOT NULL, FK -> homepage_projects(id) ON DELETE CASCADE | 프로젝트 ID |
| `title` | TEXT | - | 제목 |
| `slug` | TEXT | - | URL 슬러그 |
| `space_type` | TEXT | - | 공간 유형 (거실, 주방 등) |
| `style` | TEXT | - | 스타일 (모던, 미니멀 등) |
| `area_pyeong` | INTEGER | - | 평수 |
| `budget_range` | TEXT | - | 예산 범위 |
| `description` | TEXT | - | 설명 |
| `image_urls` | TEXT[] | NOT NULL, DEFAULT '{}' | 이미지 URL 배열 |
| `before_image_url` | TEXT | - | Before 이미지 URL |
| `after_image_url` | TEXT | - | After 이미지 URL |
| `sort_order` | INTEGER | DEFAULT 0 | 정렬 순서 |
| `is_featured` | BOOLEAN | DEFAULT FALSE | 메인 노출 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

**인덱스:**
- `idx_hp_portfolios_project` - project_id

**RLS 정책:**
- SELECT/INSERT/UPDATE/DELETE: 프로젝트 소유 워크스페이스 멤버만 접근 가능

---

## 4. homepage_reviews

> 고객 후기 - 수동 등록 또는 외부 임포트

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 후기 ID |
| `project_id` | UUID | NOT NULL, FK -> homepage_projects(id) ON DELETE CASCADE | 프로젝트 ID |
| `customer_name` | TEXT | NOT NULL | 고객명 |
| `rating` | INTEGER | NOT NULL, CHECK (1-5) | 평점 |
| `content` | TEXT | NOT NULL | 후기 내용 |
| `project_type` | TEXT | - | 시공 유형 |
| `source` | TEXT | DEFAULT 'manual', CHECK | 출처 |

**source CHECK 제약조건:**
```
'manual' | 'naver_place' | 'import'
```

| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |

**인덱스:**
- `idx_hp_reviews_project` - project_id

**RLS 정책:**
- SELECT/INSERT/UPDATE/DELETE: 프로젝트 소유 워크스페이스 멤버만 접근 가능

---

## 5. homepage_inquiries

> 상담 신청 - 홈페이지에서 접수된 문의

| 컬럼 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 상담 ID |
| `project_id` | UUID | NOT NULL, FK -> homepage_projects(id) ON DELETE CASCADE | 프로젝트 ID |
| `client_id` | UUID | FK -> clients(id) | 클라이언트 ID |
| `name` | TEXT | NOT NULL | 고객명 |
| `phone` | TEXT | NOT NULL | 연락처 |
| `area_pyeong` | INTEGER | - | 평수 |
| `space_type` | TEXT | - | 공간 유형 |
| `budget_range` | TEXT | - | 예산 범위 |
| `message` | TEXT | - | 추가 메시지 |
| `status` | TEXT | DEFAULT 'new', CHECK | 상담 상태 |
| `assigned_to` | UUID | - | 담당자 ID |
| `notes` | TEXT | - | 관리자 메모 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성일 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정일 |

**status CHECK 제약조건:**
```
'new' | 'contacted' | 'consulting' | 'contracted' | 'lost'
```

**인덱스:**
- `idx_hp_inquiries_project` - project_id
- `idx_hp_inquiries_status` - status

**RLS 정책:**
- SELECT/UPDATE/DELETE: 프로젝트 소유 워크스페이스 멤버만 접근 가능
- INSERT: 비인증 사용자(anon)도 상담 신청 가능 (홈페이지 상담 폼)

**트리거:**
- `homepage_inquiries_updated_at` - BEFORE UPDATE -> update_updated_at()

---

## 기존 테이블 확장

### contents 테이블

`content_type` CHECK 제약조건에 다음 값 추가:
- `hp_blog_info` - 홈페이지 정보성 블로그
- `hp_blog_review` - 홈페이지 후기성 블로그
- `hp_page` - 홈페이지 정적 페이지

### keywords 테이블

`metadata` JSONB 스키마에 홈페이지 블로그용 필드 추가:
```json
{
  "blog_type": "정보성 | 후기성 | AEO",
  "content_format": "비용 분석표 | 시공 후기 | Q&A",
  "region": "강남구",
  "last_published_at": "2026-03-01T00:00:00Z",
  "publish_count": 3,
  "generated_by": "homepage_auto | manual",
  "project_id": "UUID"
}
```

### publishing_accounts 테이블

`platform` CHECK 제약조건에 `homepage` 값 추가.

---

## Storage 버킷

| 버킷 ID | 이름 | 공개 | 용도 |
|---|---|---|---|
| `homepage-assets` | homepage-assets | O | 홈페이지 에셋 통합 (로고, 포트폴리오, 인증서) |
| `homepage-logos` | homepage-logos | O | 업체 로고 이미지 |
| `homepage-portfolios` | homepage-portfolios | O | 포트폴리오 시공 사례 이미지 |
| `homepage-certifications` | homepage-certifications | X | 자격증/인증서 이미지 (비공개) |

### Storage 접근 정책

**공개 버킷 (homepage-assets, homepage-logos, homepage-portfolios):**
- SELECT: 공개 읽기 (누구나)
- INSERT: 인증된 사용자만 업로드
- UPDATE: 인증된 사용자만 수정
- DELETE: 인증된 사용자만 삭제

**비공개 버킷 (homepage-certifications):**
- SELECT: 인증된 사용자만 읽기
- INSERT: 인증된 사용자만 업로드

---

## JSONB 스키마 상세

### theme_config

```json
{
  "primary_color": "#2563eb",
  "secondary_color": "#10b981",
  "font_heading": "Pretendard",
  "font_body": "Pretendard",
  "logo_url": "https://...",
  "favicon_url": "https://...",
  "og_image_url": "https://..."
}
```

### seo_config

```json
{
  "meta_title_template": "{company} - {keyword} | 전문 인테리어",
  "meta_description": "...",
  "keywords": ["강남 인테리어", "아파트 리모델링"],
  "json_ld_local_business": { "@context": "https://schema.org", ... },
  "sitemap_config": {},
  "robots_config": {}
}
```

### blog_config

```json
{
  "posts_per_month": 8,
  "info_ratio": 0.5,
  "review_ratio": 0.5,
  "auto_publish": true,
  "target_keywords": ["강남 인테리어", "아파트 리모델링"],
  "content_calendar": [
    {
      "week": 1,
      "keyword": "강남 인테리어 비용",
      "type": "정보성"
    }
  ]
}
```

### faq_items

```json
[
  {
    "q": "시공 기간은 얼마나 걸리나요?",
    "a": "보통 30평 기준 4~6주 정도 소요됩니다."
  }
]
```
