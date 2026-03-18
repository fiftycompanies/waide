# Phase 3: 자동 키워드 생성

## 개요
- **목적:** 인테리어 업체의 서비스 지역, 서비스 유형, 브랜드 분석 결과를 기반으로 홈페이지 SEO 키워드와 블로그 타겟 키워드를 자동으로 생성하여 keywords 테이블에 INSERT한다.
- **예상 기간:** 1일
- **선행 조건:** Phase 1 (DB 스키마), Phase 2 (어드민 UI — 자료 수집 폼)
- **산출물:** generateHomepageKeywords() Server Action, SEO 키워드 매트릭스 데이터, 키워드 생성 UI 컴포넌트

---

## 상세 작업 목록

### 3.1 SEO 키워드 매트릭스 데이터 구축

#### 설명
인테리어 업종에 특화된 키워드 매트릭스를 정의한다. 지역(132개) x 키워드 패턴(124개)의 조합으로 자동 키워드를 생성한다.

#### 기술 스펙
- 지역 데이터: 서울 25개구 + 경기 31개시 + 기타 광역시/도 = 약 132개 지역
- 키워드 패턴 카테고리:
  - **기본 서비스 (20개):** {지역} 인테리어, {지역} 인테리어 업체, {지역} 인테리어 추천 등
  - **공간별 (15개):** {지역} 거실 인테리어, {지역} 주방 리모델링 등
  - **유형별 (20개):** {지역} 아파트 인테리어, {지역} 빌라 인테리어 등
  - **비용 관련 (15개):** {지역} 인테리어 비용, {지역} 인테리어 견적 등
  - **후기 관련 (10개):** {지역} 인테리어 후기, {지역} 인테리어 추천 후기 등
  - **트렌드 (15개):** {지역} 모던 인테리어, {지역} 미니멀 인테리어 등
  - **질문형/AEO (15개):** {지역} 인테리어 비용 얼마, 인테리어 업체 고르는 방법 등
  - **비교형 (14개):** {지역} 인테리어 vs 셀프, 인테리어 업체 비교 등

#### 파일 구조
```
lib/homepage/
├── seo-keyword-matrix.ts     ← 키워드 매트릭스 데이터
├── regions.ts                ← 지역 데이터 (132개)
└── keyword-patterns.ts       ← 키워드 패턴 (124개)
```

#### 코드 예시
```typescript
// lib/homepage/seo-keyword-matrix.ts

export const KEYWORD_CATEGORIES = {
  BASIC_SERVICE: {
    label: '기본 서비스',
    patterns: [
      { template: '{region} 인테리어', priority: 'critical', source: 'homepage_seo' },
      { template: '{region} 인테리어 업체', priority: 'high', source: 'homepage_seo' },
      { template: '{region} 인테리어 추천', priority: 'high', source: 'blog_target' },
      { template: '{region} 인테리어 잘하는 곳', priority: 'medium', source: 'blog_target' },
    ],
  },
  COST: {
    label: '비용 관련',
    patterns: [
      {
        template: '{region} 인테리어 비용',
        priority: 'high',
        source: 'blog_target',
        metadata: { blog_type: '정보성', content_format: '비용 분석표' },
      },
      {
        template: '{region} 인테리어 견적',
        priority: 'high',
        source: 'blog_target',
        metadata: { blog_type: '후기성', content_format: '견적 공개' },
      },
    ],
  },
  REVIEW: {
    label: '후기 관련',
    patterns: [
      {
        template: '{region} 인테리어 후기',
        priority: 'high',
        source: 'blog_target',
        metadata: { blog_type: '후기성', content_format: '시공 후기' },
      },
    ],
  },
  AEO: {
    label: '질문형 (AEO)',
    patterns: [
      {
        template: '{region} 인테리어 비용 얼마',
        priority: 'medium',
        source: 'blog_target',
        metadata: { blog_type: 'AEO', content_format: 'Q&A' },
      },
      {
        template: '인테리어 업체 어떻게 고르나요',
        priority: 'medium',
        source: 'blog_target',
        metadata: { blog_type: 'AEO', content_format: '체크리스트' },
      },
    ],
  },
} as const;

// 지역 데이터
export const REGIONS = {
  서울: ['강남구','서초구','송파구','마포구','용산구','강서구','영등포구','성동구',
         '광진구','동작구','관악구','서대문구','은평구','중구','종로구','강동구',
         '노원구','도봉구','강북구','성북구','중랑구','동대문구','금천구','구로구','양천구'],
  경기: ['성남시','수원시','용인시','고양시','부천시','안양시','남양주시','화성시',
         '평택시','의정부시','시흥시','파주시','광명시','김포시','군포시','광주시',
         '이천시','양주시','오산시','구리시','안산시','하남시','의왕시','포천시',
         '양평군','여주시','동두천시','가평군','과천시','연천군','안성시'],
  // ... 기타 지역
};
```

### 3.2 generateHomepageKeywords() Server Action 구현

#### 설명
프로젝트의 서비스 지역과 서비스 유형을 기반으로 키워드 매트릭스를 자동 생성하여 keywords 테이블에 일괄 INSERT하는 Server Action.

#### 기술 스펙
- 입력: projectId (UUID)
- 처리 흐름:
  1. homepage_materials에서 service_regions, service_types 조회
  2. clients.brand_persona에서 interior_profile 조회
  3. KEYWORD_CATEGORIES 매트릭스와 지역/서비스를 매핑하여 키워드 생성
  4. 중복 체크 (동일 client_id + keyword 조합)
  5. keywords 테이블에 일괄 INSERT
  6. 대표 키워드 1개 is_primary = true 설정
  7. 검색량 조회 크론잡 트리거
- 출력: 생성된 키워드 수, 카테고리별 키워드 수

#### 파일 구조
```
lib/homepage/
├── actions/
│   └── generate-keywords.ts   ← Server Action
├── seo-keyword-matrix.ts
├── regions.ts
└── keyword-patterns.ts
```

#### 코드 예시
```typescript
// lib/homepage/actions/generate-keywords.ts
'use server'

import { KEYWORD_CATEGORIES } from '../seo-keyword-matrix';

interface KeywordGenerationResult {
  totalGenerated: number;
  categories: Record<string, number>;
  duplicatesSkipped: number;
  primaryKeyword: string;
}

export async function generateHomepageKeywords(
  projectId: string
): Promise<KeywordGenerationResult> {
  const supabase = await createServerClient();

  // 1. 프로젝트 + 자료 조회
  const { data: project } = await supabase
    .from('homepage_projects')
    .select('client_id, client:clients(brand_persona)')
    .eq('id', projectId)
    .single();

  const { data: materials } = await supabase
    .from('homepage_materials')
    .select('service_regions, service_types')
    .eq('project_id', projectId)
    .single();

  const regions = materials?.service_regions ?? [];
  const serviceTypes = materials?.service_types ?? [];

  // 2. 기존 키워드 조회 (중복 체크용)
  const { data: existingKeywords } = await supabase
    .from('keywords')
    .select('keyword')
    .eq('client_id', project!.client_id);

  const existingSet = new Set(existingKeywords?.map(k => k.keyword) ?? []);

  // 3. 키워드 생성
  const newKeywords: Array<{
    client_id: string;
    keyword: string;
    source: string;
    priority: string;
    status: string;
    is_primary: boolean;
    metadata: Record<string, unknown>;
  }> = [];
  const categoryStats: Record<string, number> = {};
  let duplicatesSkipped = 0;

  for (const [catKey, category] of Object.entries(KEYWORD_CATEGORIES)) {
    categoryStats[category.label] = 0;

    for (const pattern of category.patterns) {
      for (const region of regions) {
        const keyword = pattern.template.replace('{region}', region);

        if (existingSet.has(keyword)) {
          duplicatesSkipped++;
          continue;
        }

        newKeywords.push({
          client_id: project!.client_id,
          keyword,
          source: pattern.source,
          priority: pattern.priority,
          status: 'active',
          is_primary: false,
          metadata: {
            ...pattern.metadata,
            region,
            generated_by: 'homepage_keyword_generator',
            project_id: projectId,
          },
        });

        categoryStats[category.label]++;
        existingSet.add(keyword);
      }
    }
  }

  // 4. 대표 키워드 설정 (첫 번째 critical 키워드)
  const primaryIndex = newKeywords.findIndex(k => k.priority === 'critical');
  if (primaryIndex >= 0) {
    newKeywords[primaryIndex].is_primary = true;
  }

  // 5. 일괄 INSERT (배치 처리)
  const BATCH_SIZE = 100;
  for (let i = 0; i < newKeywords.length; i += BATCH_SIZE) {
    const batch = newKeywords.slice(i, i + BATCH_SIZE);
    await supabase.from('keywords').insert(batch);
  }

  return {
    totalGenerated: newKeywords.length,
    categories: categoryStats,
    duplicatesSkipped,
    primaryKeyword: newKeywords[primaryIndex]?.keyword ?? '',
  };
}
```

### 3.3 브랜드 분석 → 키워드 자동 INSERT 훅

#### 설명
자료 수집 폼 완료 시 또는 프로젝트 상세에서 "키워드 생성" 버튼 클릭 시 자동으로 키워드를 생성하는 훅과 UI를 구현한다.

#### 기술 스펙
- **자동 트리거:** 자료 수집 폼 STEP 2(서비스 정보) 완료 후 자동 실행
- **수동 트리거:** 프로젝트 상세 → "키워드 재생성" 버튼
- **진행률 표시:** 생성 중 프로그레스 바 + 카테고리별 실시간 카운트
- **결과 표시:** 생성된 키워드 수, 카테고리별 분포, 중복 스킵 수
- **키워드 미리보기:** 생성 전 예상 키워드 리스트 표시 (선택적)

#### 파일 구조
```
app/(dashboard)/dashboard/homepage/[id]/
├── _components/
│   ├── keyword-generator.tsx  ← 키워드 생성 UI (Client Component)
│   ├── keyword-preview.tsx    ← 생성 전 미리보기
│   └── keyword-result.tsx     ← 생성 결과 표시
```

#### 코드 예시
```typescript
// keyword-generator.tsx
'use client'

import { generateHomepageKeywords } from '@/lib/homepage/actions/generate-keywords';

export function KeywordGenerator({ projectId }: { projectId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<KeywordGenerationResult | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateHomepageKeywords(projectId);
      setResult(res);
      toast.success(`${res.totalGenerated}개 키워드가 생성되었습니다.`);
    } catch (error) {
      toast.error('키워드 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin mr-2" />
            키워드 생성 중...
          </>
        ) : (
          '키워드 자동 생성'
        )}
      </Button>

      {result && (
        <KeywordResult
          total={result.totalGenerated}
          categories={result.categories}
          duplicatesSkipped={result.duplicatesSkipped}
          primaryKeyword={result.primaryKeyword}
        />
      )}
    </div>
  );
}
```

### 3.4 키워드 관리 UI 연동

#### 설명
생성된 키워드를 기존 waide-mkt 키워드 관리 페이지에서도 볼 수 있도록 필터를 확장한다.

#### 기술 스펙
- 기존 `/dashboard/keywords` 페이지에 source 필터 추가: `homepage_seo`, `blog_target`
- 키워드 테이블에 `blog_type` 컬럼 표시 (정보성/후기성/AEO)
- 키워드 클릭 시 연관 블로그 글 목록 표시

#### 코드 예시
```typescript
// 기존 키워드 필터에 추가
const sourceFilters = [
  { label: '전체', value: 'all' },
  { label: '수동', value: 'manual' },
  { label: 'CSV 임포트', value: 'csv_import' },
  { label: '홈페이지 SEO', value: 'homepage_seo' },    // 신규
  { label: '블로그 타겟', value: 'blog_target' },       // 신규
  { label: '니치 확장', value: 'niche_expansion' },
];
```

---

## 테스트 계획
- [ ] 키워드 매트릭스 데이터 완전성 확인 (132지역, 124패턴)
- [ ] generateHomepageKeywords() — 정상 생성, 카테고리별 카운트 정확성
- [ ] 중복 키워드 스킵 로직 검증 (동일 키워드 재생성 시 0개 생성)
- [ ] 대표 키워드(is_primary) 설정 정확성
- [ ] 배치 INSERT 성능 테스트 (500개 이상 키워드)
- [ ] 자료 수집 완료 시 자동 트리거 동작 확인
- [ ] 수동 재생성 버튼 동작 확인
- [ ] 키워드 관리 페이지에서 source 필터 정상 동작
- [ ] metadata.blog_type 필드 정상 저장/조회

## 완료 기준
- [ ] SEO 키워드 매트릭스 데이터 파일 작성 완료
- [ ] generateHomepageKeywords() Server Action 구현 완료
- [ ] 자동/수동 키워드 생성 트리거 동작 확인
- [ ] 기존 키워드 관리 페이지 필터 확장 완료
- [ ] 키워드 생성 UI (진행률, 결과 표시) 구현 완료
