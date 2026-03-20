/**
 * unsplash-images.ts
 * 업종별 Unsplash CDN 이미지 URL 상수 맵.
 * Unsplash 라이선스: 무료 사용, 핫링크 필수 (images.unsplash.com CDN).
 */

export interface UnsplashImageSet {
  hero: string[];     // 히어로 배경 (1600x900)
  section: string[];  // 서비스/섹션 (800x600)
  about: string[];    // 소개 (600x800)
  gallery: string[];  // 포트폴리오 (800x600)
  blog: string[];     // 블로그 (800x600)
}

const INDUSTRY_IMAGES: Record<string, UnsplashImageSet> = {
  "의료": {
    hero: [
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1600&h=900&fit=crop",
    ],
    section: [
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&h=600&fit=crop",
    ],
    about: [
      "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=800&fit=crop",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop",
    ],
    blog: [
      "https://images.unsplash.com/photo-1576091160291-258e81c9f7e4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
    ],
  },

  "요식업": {
    hero: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop",
    ],
    section: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&h=600&fit=crop",
    ],
    about: [
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=800&fit=crop",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1432139509613-5c4255a78e0f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=600&fit=crop",
    ],
    blog: [
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop",
    ],
  },

  "뷰티": {
    hero: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&h=900&fit=crop",
    ],
    section: [
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522338242992-e1a54571a5a7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=800&h=600&fit=crop",
    ],
    about: [
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=800&fit=crop",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1521590832167-7228fcb0ed0f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=600&fit=crop",
    ],
    blog: [
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&h=600&fit=crop",
    ],
  },

  "인테리어": {
    hero: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&h=900&fit=crop",
    ],
    section: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&h=600&fit=crop",
    ],
    about: [
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=800&fit=crop",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&h=600&fit=crop",
    ],
    blog: [
      "https://images.unsplash.com/photo-1618219944342-824e40a13285?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1597218868981-1b68e15f0065?w=800&h=600&fit=crop",
    ],
  },

  "숙박": {
    hero: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&h=900&fit=crop",
    ],
    section: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1618773928121-c32f218380de?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=600&fit=crop",
    ],
    about: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&h=800&fit=crop",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&h=600&fit=crop",
    ],
    blog: [
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1587213811864-46e59f6873b1?w=800&h=600&fit=crop",
    ],
  },

  "default": {
    hero: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1600&h=900&fit=crop",
    ],
    section: [
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
    ],
    about: [
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=800&fit=crop",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
    ],
    blog: [
      "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&h=600&fit=crop",
    ],
  },
};

const INDUSTRY_MAP: Record<string, string> = {
  "피부과": "의료",
  "의원": "의료",
  "클리닉": "의료",
  "치과": "의료",
  "병원": "의료",
  "한의원": "의료",
  "약국": "의료",
  "카페": "요식업",
  "음식점": "요식업",
  "맛집": "요식업",
  "베이커리": "요식업",
  "레스토랑": "요식업",
  "헤어": "뷰티",
  "미용": "뷰티",
  "네일": "뷰티",
  "에스테틱": "뷰티",
  "스파": "뷰티",
  "인테리어": "인테리어",
  "도배": "인테리어",
  "리모델링": "인테리어",
  "시공": "인테리어",
  "호텔": "숙박",
  "펜션": "숙박",
  "숙박": "숙박",
  "리조트": "숙박",
  "모텔": "숙박",
  "게스트하우스": "숙박",
};

/**
 * 업종명으로 Unsplash 이미지 세트를 반환한다.
 * 업종명에서 키워드를 매칭하여 카테고리를 찾고, 없으면 default 반환.
 */
export function getUnsplashImages(industry: string): UnsplashImageSet {
  // 직접 매칭
  if (INDUSTRY_IMAGES[industry]) {
    return INDUSTRY_IMAGES[industry];
  }

  // 키워드 매핑
  for (const [keyword, category] of Object.entries(INDUSTRY_MAP)) {
    if (industry.includes(keyword)) {
      return INDUSTRY_IMAGES[category] || INDUSTRY_IMAGES["default"];
    }
  }

  return INDUSTRY_IMAGES["default"];
}
