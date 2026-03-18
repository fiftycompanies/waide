// ============================================================
// SEO 키워드 매트릭스 데이터
// 인테리어 업종 특화 지역 x 키워드 패턴 조합
// ============================================================

// ----------------------------------------------------------------
// 지역 데이터 (132개 시/군/구)
// ----------------------------------------------------------------

export const REGIONS: Record<string, string[]> = {
  서울: [
    '강남구', '서초구', '송파구', '강동구', '마포구',
    '용산구', '성동구', '광진구', '동대문구', '중랑구',
    '성북구', '강북구', '도봉구', '노원구', '은평구',
    '서대문구', '종로구', '중구', '영등포구', '동작구',
    '관악구', '구로구', '금천구', '양천구', '강서구',
  ],
  경기: [
    '성남시', '용인시', '수원시', '고양시', '화성시',
    '부천시', '안양시', '남양주시', '안산시', '평택시',
    '의정부시', '파주시', '시흥시', '김포시', '광명시',
    '광주시', '군포시', '하남시', '오산시', '이천시',
    '안성시', '양주시', '의왕시', '여주시', '동두천시',
    '과천시', '구리시', '포천시', '양평군', '가평군',
    '연천군',
  ],
  인천: [
    '미추홀구', '연수구', '남동구', '부평구', '계양구',
    '서구', '중구', '동구', '강화군', '옹진군',
  ],
  부산: [
    '해운대구', '수영구', '남구', '동래구', '연제구',
    '부산진구', '사하구', '북구', '사상구', '금정구',
    '강서구', '기장군',
  ],
  대구: [
    '수성구', '달서구', '북구', '중구', '동구',
    '서구', '남구', '달성군',
  ],
  대전: [
    '유성구', '서구', '중구', '동구', '대덕구',
  ],
  광주: [
    '서구', '북구', '남구', '동구', '광산구',
  ],
  울산: [
    '남구', '중구', '동구', '북구', '울주군',
  ],
  세종: [
    '세종시',
  ],
  강원: [
    '춘천시', '원주시', '강릉시', '속초시', '동해시',
  ],
  충북: [
    '청주시', '충주시', '제천시',
  ],
  충남: [
    '천안시', '아산시', '서산시', '당진시', '논산시',
  ],
  전북: [
    '전주시', '익산시', '군산시',
  ],
  전남: [
    '여수시', '순천시', '목포시',
  ],
  경북: [
    '포항시', '구미시', '경산시', '경주시',
  ],
  경남: [
    '창원시', '김해시', '양산시', '거제시', '진주시',
  ],
  제주: [
    '제주시', '서귀포시',
  ],
};

// 전체 지역 수 검증용
export function getTotalRegionCount(): number {
  return Object.values(REGIONS).reduce((sum, districts) => sum + districts.length, 0);
}

// ----------------------------------------------------------------
// 서비스 유형
// ----------------------------------------------------------------

export const SERVICE_TYPES = [
  '아파트 인테리어',
  '리모델링',
  '빌라 인테리어',
  '오피스 인테리어',
  '상가 인테리어',
  '원룸 인테리어',
  '주방 리모델링',
  '욕실 리모델링',
  '부분 인테리어',
] as const;

export type ServiceType = typeof SERVICE_TYPES[number];

// ----------------------------------------------------------------
// 키워드 패턴 카테고리
// ----------------------------------------------------------------

export type KeywordCategory =
  | 'basic_service'
  | 'space_specific'
  | 'type_specific'
  | 'cost_related'
  | 'review_related'
  | 'trend_related'
  | 'question_aeo'
  | 'comparison';

export type PatternSource = 'homepage_seo' | 'blog_target';
export type PatternPriority = 'critical' | 'high' | 'medium' | 'low';
export type PatternBlogType = '정보성' | '후기성' | 'AEO';

export interface KeywordPattern {
  template: string;
  category: KeywordCategory;
  source: PatternSource;
  priority: PatternPriority;
  metadata?: {
    blog_type?: PatternBlogType;
    content_format?: string;
  };
  requiresRegion: boolean;
  requiresServiceType: boolean;
}

// ----------------------------------------------------------------
// 키워드 패턴 정의 (124개)
// ----------------------------------------------------------------

export const KEYWORD_PATTERNS: KeywordPattern[] = [
  // ============================================================
  // 1. 기본 서비스 키워드 (20개)
  // ============================================================
  { template: '{region} 인테리어', category: 'basic_service', source: 'homepage_seo', priority: 'critical', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 업체', category: 'basic_service', source: 'homepage_seo', priority: 'critical', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 추천', category: 'basic_service', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 잘하는곳', category: 'basic_service', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 전문', category: 'basic_service', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 견적', category: 'basic_service', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 상담', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 회사', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 시공', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 디자인', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 실내 인테리어', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 집 인테리어', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 홈 인테리어', category: 'basic_service', source: 'homepage_seo', priority: 'low', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 사무소', category: 'basic_service', source: 'homepage_seo', priority: 'low', requiresRegion: true, requiresServiceType: false },
  { template: '{region} {service_type}', category: 'basic_service', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: true },
  { template: '{region} {service_type} 업체', category: 'basic_service', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: true },
  { template: '{region} {service_type} 전문', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: true },
  { template: '{region} {service_type} 추천', category: 'basic_service', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: true },
  { template: '{region} {service_type} 비용', category: 'basic_service', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비용 분석표' }, requiresRegion: true, requiresServiceType: true },
  { template: '{region} {service_type} 후기', category: 'basic_service', source: 'blog_target', priority: 'high', metadata: { blog_type: '후기성', content_format: '시공 후기' }, requiresRegion: true, requiresServiceType: true },

  // ============================================================
  // 2. 공간별 키워드 (15개)
  // ============================================================
  { template: '{region} 거실 인테리어', category: 'space_specific', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 주방 인테리어', category: 'space_specific', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 침실 인테리어', category: 'space_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 욕실 인테리어', category: 'space_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 현관 인테리어', category: 'space_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 드레스룸 인테리어', category: 'space_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 베란다 인테리어', category: 'space_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 서재 인테리어', category: 'space_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 아이방 인테리어', category: 'space_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 신혼집 인테리어', category: 'space_specific', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '라이프스타일' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 오피스텔 인테리어', category: 'space_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 복층 인테리어', category: 'space_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '공간별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 아파트 거실 확장', category: 'space_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '시공 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 주방 리모델링', category: 'space_specific', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 욕실 리모델링', category: 'space_specific', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },

  // ============================================================
  // 3. 유형별 키워드 (20개)
  // ============================================================
  { template: '{region} 아파트 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'critical', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 빌라 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 오피스 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 상가 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 사무실 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 원룸 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 전원주택 인테리어', category: 'type_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '주거 유형별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 단독주택 인테리어', category: 'type_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '주거 유형별 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 신축 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 구축 리모델링', category: 'type_specific', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 올수리', category: 'type_specific', source: 'homepage_seo', priority: 'high', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 부분 인테리어', category: 'type_specific', source: 'homepage_seo', priority: 'medium', requiresRegion: true, requiresServiceType: false },
  { template: '{region} 셀프 인테리어', category: 'type_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: 'DIY 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 모던 인테리어', category: 'type_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 북유럽 인테리어', category: 'type_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 미니멀 인테리어', category: 'type_specific', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 클래식 인테리어', category: 'type_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 럭셔리 인테리어', category: 'type_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 빈티지 인테리어', category: 'type_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 내추럴 인테리어', category: 'type_specific', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: true, requiresServiceType: false },

  // ============================================================
  // 4. 비용 관련 키워드 (15개)
  // ============================================================
  { template: '{region} 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'critical', metadata: { blog_type: '정보성', content_format: '비용 분석표' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 가격', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비용 분석표' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 평당 가격', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비용 분석표' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 견적 비용', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '견적 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 20평 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '평수별 비용' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 25평 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '평수별 비용' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 30평 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'critical', metadata: { blog_type: '정보성', content_format: '평수별 비용' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 34평 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '평수별 비용' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 40평 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '평수별 비용' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 50평 인테리어 비용', category: 'cost_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '평수별 비용' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 저렴한 곳', category: 'cost_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '가성비 가이드' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 할인', category: 'cost_related', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '프로모션' }, requiresRegion: true, requiresServiceType: false },
  { template: '인테리어 비용 절약 팁', category: 'cost_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '절약 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 견적 받는 법', category: 'cost_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '견적 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 비용 항목별 정리', category: 'cost_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비용 분석표' }, requiresRegion: false, requiresServiceType: false },

  // ============================================================
  // 5. 후기 관련 키워드 (10개)
  // ============================================================
  { template: '{region} 인테리어 후기', category: 'review_related', source: 'blog_target', priority: 'critical', metadata: { blog_type: '후기성', content_format: '시공 후기' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 아파트 인테리어 후기', category: 'review_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '후기성', content_format: 'Before/After' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 견적 후기', category: 'review_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '후기성', content_format: '견적 공개' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 시공 후기', category: 'review_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '후기성', content_format: '시공 후기' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 입주 후기', category: 'review_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '후기성', content_format: '입주 후기' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 리모델링 후기', category: 'review_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '후기성', content_format: '리모델링 후기' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 Before After', category: 'review_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '후기성', content_format: 'Before/After' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 올수리 후기', category: 'review_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '후기성', content_format: '올수리 후기' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 부분 인테리어 후기', category: 'review_related', source: 'blog_target', priority: 'low', metadata: { blog_type: '후기성', content_format: '부분 시공 후기' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 주방 리모델링 후기', category: 'review_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '후기성', content_format: '주방 리모델링 후기' }, requiresRegion: true, requiresServiceType: false },

  // ============================================================
  // 6. 트렌드 관련 키워드 (15개)
  // ============================================================
  { template: '{region} 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '트렌드 리포트' }, requiresRegion: true, requiresServiceType: false },
  { template: '2026 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '트렌드 리포트' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 트렌드 컬러', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '트렌드 리포트' }, requiresRegion: false, requiresServiceType: false },
  { template: '모던 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '미니멀 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '북유럽 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '스타일 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '주방 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '공간별 트렌드' }, requiresRegion: false, requiresServiceType: false },
  { template: '욕실 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '공간별 트렌드' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 자재 트렌드', category: 'trend_related', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '자재 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '아파트 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '트렌드 리포트' }, requiresRegion: false, requiresServiceType: false },
  { template: '신혼집 인테리어 트렌드', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '라이프스타일' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 조명 추천', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '아이템 추천' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 벽지 추천', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '아이템 추천' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 바닥재 추천', category: 'trend_related', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '아이템 추천' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 타일 추천', category: 'trend_related', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '아이템 추천' }, requiresRegion: false, requiresServiceType: false },

  // ============================================================
  // 7. 질문형/AEO 키워드 (15개)
  // ============================================================
  { template: '{region} 인테리어 비용 얼마', category: 'question_aeo', source: 'blog_target', priority: 'high', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: true, requiresServiceType: false },
  { template: '인테리어 업체 어떻게 고르나요', category: 'question_aeo', source: 'blog_target', priority: 'high', metadata: { blog_type: 'AEO', content_format: '체크리스트' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 견적 어떻게 받나요', category: 'question_aeo', source: 'blog_target', priority: 'high', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 기간 얼마나 걸리나요', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 계약 시 주의사항', category: 'question_aeo', source: 'blog_target', priority: 'high', metadata: { blog_type: 'AEO', content_format: '체크리스트' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 AS 기간', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 올수리 뜻', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 반올수리 뜻', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 시공 순서', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: '프로세스 가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 자재 선택 방법', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: '가이드' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 철거 비용', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 입주 청소 비용', category: 'question_aeo', source: 'blog_target', priority: 'low', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 하자 보수 방법', category: 'question_aeo', source: 'blog_target', priority: 'medium', metadata: { blog_type: 'AEO', content_format: 'Q&A' }, requiresRegion: false, requiresServiceType: false },
  { template: '{region} 인테리어 어디가 좋나요', category: 'question_aeo', source: 'blog_target', priority: 'high', metadata: { blog_type: 'AEO', content_format: '추천 리스트' }, requiresRegion: true, requiresServiceType: false },
  { template: '{region} 인테리어 추천 업체', category: 'question_aeo', source: 'blog_target', priority: 'high', metadata: { blog_type: 'AEO', content_format: '추천 리스트' }, requiresRegion: true, requiresServiceType: false },

  // ============================================================
  // 8. 비교형 키워드 (14개)
  // ============================================================
  { template: '인테리어 업체 비교', category: 'comparison', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 견적 비교', category: 'comparison', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '{region} 인테리어 업체 비교', category: 'comparison', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: true, requiresServiceType: false },
  { template: '인테리어 대기업 vs 중소업체', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '한샘 인테리어 vs 개인 업체', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 패키지 vs 맞춤', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '올수리 vs 반올수리 차이', category: 'comparison', source: 'blog_target', priority: 'high', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 마루 종류 비교', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '자재 비교' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 페인트 vs 벽지', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '자재 비교' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 타일 종류 비교', category: 'comparison', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '자재 비교' }, requiresRegion: false, requiresServiceType: false },
  { template: '시스템 에어컨 vs 벽걸이', category: 'comparison', source: 'blog_target', priority: 'low', metadata: { blog_type: '정보성', content_format: '설비 비교' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 직영 vs 하도급', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '업체 구조 분석' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 플랫폼 비교', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '플랫폼 비교' }, requiresRegion: false, requiresServiceType: false },
  { template: '인테리어 온라인 견적 vs 방문 견적', category: 'comparison', source: 'blog_target', priority: 'medium', metadata: { blog_type: '정보성', content_format: '비교 분석' }, requiresRegion: false, requiresServiceType: false },
];

// 전체 패턴 수 검증용
export function getTotalPatternCount(): number {
  return KEYWORD_PATTERNS.length;
}
