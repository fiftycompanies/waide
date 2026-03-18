export const brand = {
  name: "벽지마스터",
  nameEn: "WALLPAPER MASTER",
  tagline: "우리집 인테리어 벽지마스터에서",
  description:
    "벽지마스터는 도배 및 바닥재 시공 전문 업체입니다. 숙련된 실무 전문가들이 직접 시공하여 깔끔하고 만족스러운 결과를 보장합니다.",
  phone: "1588-0000",
  address: "서울시 마포구 월드컵북로 56",
  businessNumber: "234-56-78901",
  ceo: "박도배",
  email: "info@wallpapermaster.kr",
  kakaoLink: "https://pf.kakao.com/_wallpapermaster",
  blogLink: "https://blog.naver.com/wallpapermaster",
  instagram: "https://instagram.com/wallpaper_master",
  operatingHours: "평일 08:00 - 20:00 (주말 상담 가능)",
  url: "https://wallpapermaster.kr",
};

export const navItems = [
  { label: "시공사례", href: "#projects" },
  { label: "도배안내", href: "#tips" },
  { label: "고객후기", href: "#reviews" },
  { label: "견적문의", href: "#estimate" },
];

export const heroSlides = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1920&q=80",
    title: "우리집 인테리어",
    subtitle: "벽지마스터에서",
    description: "전문 시공팀이 직접 방문하여 꼼꼼하게 시공합니다",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=1920&q=80",
    title: "깔끔한 도배",
    subtitle: "합리적인 가격으로",
    description: "실크, 합지, 방염 벽지까지 모든 도배를 한번에",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80",
    title: "새집처럼 변신",
    subtitle: "벽지마스터와 함께",
    description: "15년 이상의 경력, 3,000건 이상의 시공 실적",
  },
];

export const serviceCategories = [
  {
    id: "wallpaper-install",
    title: "도배시공",
    icon: "paintbrush" as const,
    href: "#service",
  },
  {
    id: "gallery",
    title: "시공사례",
    icon: "image" as const,
    href: "#projects",
  },
  {
    id: "contact",
    title: "문의방법",
    icon: "phone" as const,
    href: "#estimate",
  },
  {
    id: "status",
    title: "견적현황",
    icon: "filetext" as const,
    href: "#status",
  },
];

export const galleryProjects = [
  {
    id: "1",
    title: "강남 오피스텔 실크 도배",
    category: "실크 도배",
    area: "12평",
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
  },
  {
    id: "2",
    title: "마포 아파트 32평 전체 도배",
    category: "합지 도배",
    area: "32평",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  },
  {
    id: "3",
    title: "홍대 카페 방염 도배",
    category: "방염 도배",
    area: "25평",
    image: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
  },
  {
    id: "4",
    title: "송파 아파트 장판 교체",
    category: "바닥재",
    area: "28평",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
  },
  {
    id: "5",
    title: "서초 신혼집 도배",
    category: "실크 도배",
    area: "24평",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80",
  },
  {
    id: "6",
    title: "용산 빌라 전체 도배",
    category: "합지 도배",
    area: "18평",
    image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800&q=80",
  },
  {
    id: "7",
    title: "잠실 아파트 도배+장판",
    category: "실크 도배",
    area: "34평",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  },
  {
    id: "8",
    title: "성수동 사무실 방염 도배",
    category: "방염 도배",
    area: "40평",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  },
];

export const expertTips = [
  {
    id: "1",
    title: "실크 vs 합지, 어떤 벽지가 좋을까?",
    summary: "실크 벽지는 오염에 강하고 내구성이 좋아 거실이나 주방에 적합합니다.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  },
  {
    id: "2",
    title: "도배 시공 전 체크리스트",
    summary: "시공 전 가구 이동, 콘센트 커버 제거 등을 미리 준비하세요.",
    image: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80",
  },
  {
    id: "3",
    title: "장마철 도배, 괜찮을까?",
    summary: "습도가 높은 장마철에도 시공은 가능하지만 환기를 충분히 해야 합니다.",
    image: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=600&q=80",
  },
  {
    id: "4",
    title: "도배 후 관리 꿀팁",
    summary: "시공 후 2~3일간 환기하고 벽지 이음새에 물이 닿지 않도록 주의하세요.",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80",
  },
  {
    id: "5",
    title: "벽지 색상 선택 가이드",
    summary: "공간의 채광과 가구 색상에 맞춰 벽지를 선택하면 더 좋은 결과를 얻습니다.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  },
  {
    id: "6",
    title: "곰팡이 벽 처리 방법",
    summary: "곰팡이가 있는 벽은 반드시 방곰팡이 처리 후 도배를 진행해야 합니다.",
    image: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80",
  },
];

export const fireSafetyInfo = {
  heading: "상가 도배 시 꼭 확인해주세요!",
  subtitle: "다중이용시설은 소방법에 따라 방염 벽지를 의무적으로 사용해야 합니다.",
  left: {
    label: "합지벽지",
    description: "일반 가정용 벽지로, 화재 시 빠르게 연소됩니다.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  },
  right: {
    label: "방염실크벽지",
    description: "방염 처리된 벽지로, 화재 시 연소 확산을 늦춰줍니다.",
    image: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80",
  },
};

export const priceInfo = {
  heading: "왜 업체마다 금액이 다 다를까요?",
  subtitle: "도배 비용의 차이를 만드는 요소들을 투명하게 알려드립니다.",
  factors: [
    {
      label: "벽지 종류",
      description: "실크, 합지, 방염 등 벽지 종류에 따라 가격이 달라집니다.",
      percentage: 35,
    },
    {
      label: "시공 면적",
      description: "평수에 따라 자재비와 인건비가 비례하여 변동됩니다.",
      percentage: 25,
    },
    {
      label: "벽면 상태",
      description: "곰팡이, 균열 등 벽면 보수가 필요한 경우 추가 비용이 발생합니다.",
      percentage: 20,
    },
    {
      label: "인건비",
      description: "숙련도와 시공 범위에 따라 인건비가 달라질 수 있습니다.",
      percentage: 15,
    },
    {
      label: "기타",
      description: "철거, 폐기물 처리, 추가 마감 작업 등의 부대 비용입니다.",
      percentage: 5,
    },
  ],
};

export const ctaBackground =
  "https://images.unsplash.com/photo-1618219944342-824e40a13285?w=1920&q=80";

export const reviews = [
  {
    id: "1",
    name: "김** 고객님",
    rating: 5,
    area: "마포구 32평",
    content:
      "처음 도배 업체 찾을 때 걱정이 많았는데, 상담부터 시공까지 너무 친절하고 꼼꼼하게 해주셨어요. 특히 모서리 마감이 정말 깔끔해서 감동했습니다.",
    date: "2024.12",
  },
  {
    id: "2",
    name: "이** 고객님",
    rating: 5,
    area: "강남구 18평",
    content:
      "원룸 실크 도배 했는데 반나절 만에 끝내주셨어요. 시공 후 정리도 깔끔하게 해주시고, 가격도 합리적이었습니다. 다음에도 꼭 다시 부탁드릴게요!",
    date: "2024.11",
  },
  {
    id: "3",
    name: "박** 고객님",
    rating: 5,
    area: "송파구 28평",
    content:
      "장판이랑 도배 같이 했는데 완전 새집 된 느낌이에요. 색상 고르는 것도 도와주시고, 시공 일정도 정확하게 맞춰주셔서 좋았습니다.",
    date: "2024.11",
  },
  {
    id: "4",
    name: "최** 고객님",
    rating: 5,
    area: "종로구 카페 25평",
    content:
      "방염 도배 때문에 여기저기 알아봤는데 가격 대비 퀄리티가 가장 좋았어요. 카페 분위기에 맞게 색상 추천도 잘 해주셨습니다.",
    date: "2024.10",
  },
  {
    id: "5",
    name: "정** 고객님",
    rating: 5,
    area: "서초구 42평",
    content:
      "이사 전에 급하게 도배를 해야 했는데 빠르게 일정 잡아주시고, 시공도 하루 만에 완료해주셔서 정말 감사했습니다.",
    date: "2024.10",
  },
  {
    id: "6",
    name: "한** 고객님",
    rating: 5,
    area: "영등포구 24평",
    content:
      "합지 도배인데 실크처럼 깔끔하게 해주셨어요. 아이방은 예쁜 패턴 합지로 해주셔서 아이도 너무 좋아합니다.",
    date: "2024.09",
  },
];

export const partnerLogos = [
  { id: "1", name: "한솔", nameEn: "Hansol" },
  { id: "2", name: "한샘", nameEn: "HANSSEM" },
  { id: "3", name: "ZIN", nameEn: "ZIN" },
  { id: "4", name: "한스", nameEn: "Hans" },
];

export const footerNotices = [
  { id: "1", title: "2024년 연말 특별 할인 이벤트 안내", date: "2024.12.01" },
  { id: "2", title: "설 연휴 시공 일정 안내", date: "2024.12.15" },
  { id: "3", title: "신규 방염벽지 라인업 추가 안내", date: "2024.11.20" },
  { id: "4", title: "겨울철 도배 시공 시 주의사항", date: "2024.11.10" },
];

export const estimateStatus = [
  { id: "1", area: "마포구 32평", type: "실크 도배", status: "시공완료", date: "2024.12.18" },
  { id: "2", area: "강남구 18평", type: "합지 도배", status: "시공중", date: "2024.12.17" },
  { id: "3", area: "송파구 28평", type: "도배+장판", status: "견적완료", date: "2024.12.16" },
  { id: "4", area: "서초구 42평", type: "실크 도배", status: "상담예정", date: "2024.12.15" },
  { id: "5", area: "용산구 20평", type: "방염 도배", status: "시공완료", date: "2024.12.14" },
];

export const faqItems = [
  {
    q: "도배 비용은 얼마인가요?",
    a: "평수와 벽지 종류에 따라 달라집니다. 실크 도배 기준 평당 약 2~3만원, 합지 기준 평당 약 1.5~2만원 선입니다. 정확한 견적은 무료 방문 상담을 통해 안내드립니다.",
  },
  {
    q: "시공 기간은 얼마나 걸리나요?",
    a: "일반 가정집(30평 기준) 도배만 진행 시 1일, 장판까지 함께 하면 1~2일 정도 소요됩니다. 상업 시설은 면적에 따라 다릅니다.",
  },
  {
    q: "시공 후 바로 입주 가능한가요?",
    a: "도배 시공 후 충분한 환기(2~3일)를 권장합니다. 환기 후 입주하시면 벽지 접착력도 안정되고 쾌적한 환경에서 생활하실 수 있습니다.",
  },
  {
    q: "방염 도배는 꼭 해야 하나요?",
    a: "다중이용시설(카페, 식당, 학원 등)은 소방법에 따라 방염 벽지를 사용해야 합니다. 일반 가정집은 필수는 아니지만 안전을 위해 권장합니다.",
  },
  {
    q: "기존 벽지 위에 덧바를 수 있나요?",
    a: "권장하지 않습니다. 기존 벽지를 제거한 후 시공해야 접착력이 좋고 마감이 깔끔합니다. 벽지 제거 비용은 시공비에 포함되어 있습니다.",
  },
  {
    q: "주말이나 저녁 시간에도 시공 가능한가요?",
    a: "네, 고객님 일정에 맞춰 주말 및 저녁 시간 시공도 가능합니다. 다만 사전 예약이 필요하며, 추가 비용은 없습니다.",
  },
];
