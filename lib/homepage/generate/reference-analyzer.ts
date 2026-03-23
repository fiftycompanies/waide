/**
 * reference-analyzer.ts
 * Gemini API (URL Context 툴) 호출로 레퍼런스 URL 분석
 *
 * 동작 방식:
 * 1. Gemini API에 URL Context 툴 활성화하여 레퍼런스 사이트 전달
 * 2. 페이지 구조, 디자인 시스템, 네비게이션 구조를 JSON으로 추출
 * 3. ReferenceAnalysis 타입으로 반환
 *
 * 모델: gemini-2.5-flash (빠른 분석, URL Context 지원)
 * API 키: GEMINI_API_KEY 환경변수
 *
 * 기존 코드 변경 없음. 신규 파일.
 */

// ── 타입 정의 ────────────────────────────────────────────────────────────────

export interface SectionInfo {
  type: string;
  order: number;
  contentDescription: string;
  hasImage: boolean;
  layout: string;
}

export interface PageInfo {
  name: string;
  slug: string;
  sections: SectionInfo[];
  purpose: string;
}

export interface DesignSystem {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  style: string;
}

export interface NavigationStructure {
  items: { label: string; slug: string }[];
  style: string;
  hasDropdown: boolean;
}

export interface ReferenceAnalysis {
  pages: PageInfo[];
  designSystem: DesignSystem;
  navigation: NavigationStructure;
  businessType: string;
  rawAnalysis: string;
}

// ── 기본값 ──────────────────────────────────────────────────────────────────

const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  primaryColor: "#1a1a2e",
  accentColor: "#c8a882",
  backgroundColor: "#ffffff",
  textColor: "#333333",
  headingFont: "Noto Sans KR",
  bodyFont: "Noto Sans KR",
  style: "modern",
};

const DEFAULT_ANALYSIS: ReferenceAnalysis = {
  pages: [
    {
      name: "메인",
      slug: "index",
      sections: [
        { type: "hero", order: 1, contentDescription: "히어로 배너", hasImage: true, layout: "fullscreen" },
        { type: "about", order: 2, contentDescription: "소개 섹션", hasImage: true, layout: "split-left" },
        { type: "services", order: 3, contentDescription: "서비스 목록", hasImage: true, layout: "grid-3" },
        { type: "gallery", order: 4, contentDescription: "갤러리", hasImage: true, layout: "grid-3" },
        { type: "contact", order: 5, contentDescription: "연락처 및 상담", hasImage: false, layout: "form-split" },
        { type: "footer", order: 6, contentDescription: "푸터", hasImage: false, layout: "centered" },
      ],
      purpose: "브랜드 소개 및 서비스 안내",
    },
  ],
  designSystem: DEFAULT_DESIGN_SYSTEM,
  navigation: {
    items: [
      { label: "홈", slug: "index" },
      { label: "소개", slug: "about" },
      { label: "서비스", slug: "services" },
      { label: "갤러리", slug: "gallery" },
      { label: "문의", slug: "contact" },
    ],
    style: "fixed-top",
    hasDropdown: false,
  },
  businessType: "일반",
  rawAnalysis: "",
};

// ── 메인 함수 ────────────────────────────────────────────────────────────────

/**
 * Gemini API URL Context 툴로 레퍼런스 URL 분석
 *
 * @param url 분석할 레퍼런스 URL
 * @param apiKey Gemini API 키 (없으면 GEMINI_API_KEY 환경변수 사용)
 * @returns ReferenceAnalysis
 */
export async function analyzeReferenceUrl(
  url: string,
  apiKey?: string,
): Promise<ReferenceAnalysis> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("[ReferenceAnalyzer] GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  console.log(`[ReferenceAnalyzer] 레퍼런스 URL 분석 시작: ${url}`);

  const prompt = buildAnalysisPrompt(url);

  try {
    const responseText = await callGeminiWithUrlContext(key, prompt, url);
    console.log(`[ReferenceAnalyzer] Gemini 응답 수신 (${responseText.length}자)`);

    const analysis = parseAnalysisResponse(responseText);
    console.log(`[ReferenceAnalyzer] 분석 완료: ${analysis.pages.length}개 페이지, ${analysis.businessType} 업종`);

    return analysis;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[ReferenceAnalyzer] 분석 실패, 기본값 사용: ${msg}`);
    return { ...DEFAULT_ANALYSIS, rawAnalysis: `분석 실패: ${msg}` };
  }
}

// ── Gemini API 호출 ──────────────────────────────────────────────────────────

async function callGeminiWithUrlContext(
  apiKey: string,
  prompt: string,
  url: string,
): Promise<string> {
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `다음 웹사이트를 분석하세요: ${url}\n\n${prompt}`,
          },
        ],
      },
    ],
    tools: [
      {
        url_context: {},
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
    },
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`Gemini API HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json();

  // Gemini 응답에서 텍스트 추출
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini API 응답에 candidates가 없습니다.");
  }

  const parts = candidates[0].content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Gemini API 응답에 parts가 없습니다.");
  }

  // 텍스트 파트만 합침
  const textParts = parts.filter((p: { text?: string }) => p.text);
  if (textParts.length === 0) {
    throw new Error("Gemini API 응답에 텍스트가 없습니다.");
  }

  return textParts.map((p: { text: string }) => p.text).join("\n");
}

// ── 프롬프트 ─────────────────────────────────────────────────────────────────

function buildAnalysisPrompt(url: string): string {
  return `이 웹사이트(${url})를 분석하여 다음 정보를 JSON 형식으로만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요.

분석 항목:
1. 페이지 목록: 사이트의 모든 주요 페이지 (메인, 소개, 서비스, 갤러리, 문의 등)
2. 각 페이지의 섹션 구조 (hero, about, services, gallery, testimonials, contact, footer 등)
3. 디자인 시스템 (색상, 폰트, 스타일)
4. 네비게이션 구조 (메뉴 항목, 스타일)
5. 업종 (피부과, 숙박, 카페, 음식점, 인테리어 등)

JSON 형식:
{
  "pages": [
    {
      "name": "메인",
      "slug": "index",
      "sections": [
        {
          "type": "hero|about|services|gallery|testimonials|team|pricing|faq|contact|blog|footer|cta|stats|map",
          "order": 1,
          "contentDescription": "이 섹션이 하는 일을 한 문장으로",
          "hasImage": true,
          "layout": "fullscreen|split-left|split-right|grid-2|grid-3|grid-4|centered|form-split|tabs|slider"
        }
      ],
      "purpose": "이 페이지의 목적을 한 문장으로"
    }
  ],
  "designSystem": {
    "primaryColor": "#hex (메인 색상)",
    "accentColor": "#hex (강조색, CTA/버튼에 사용)",
    "backgroundColor": "#hex (배경색)",
    "textColor": "#hex (본문 텍스트)",
    "headingFont": "폰트명 (제목용)",
    "bodyFont": "폰트명 (본문용)",
    "style": "modern|minimal|luxury|warm|clean|bold (전체 디자인 스타일)"
  },
  "navigation": {
    "items": [
      { "label": "메뉴 라벨", "slug": "페이지 slug" }
    ],
    "style": "fixed-top|sticky|transparent|solid",
    "hasDropdown": false
  },
  "businessType": "업종명 (한국어, 예: 피부과, 숙박, 카페)"
}

중요:
- 실제로 사이트에 존재하는 페이지와 섹션만 포함하세요.
- 색상은 사이트에서 실제 사용되는 값을 정확히 추출하세요.
- 폰트가 확인되지 않으면 "Noto Sans KR"을 기본값으로 사용하세요.
- 반드시 유효한 JSON만 출력하세요.`;
}

// ── 응답 파싱 ────────────────────────────────────────────────────────────────

function parseAnalysisResponse(responseText: string): ReferenceAnalysis {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini 응답에서 JSON을 찾을 수 없습니다.");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // pages 검증/변환
  const pages: PageInfo[] = (parsed.pages || []).map((p: Record<string, unknown>) => ({
    name: String(p.name || "메인"),
    slug: String(p.slug || "index"),
    sections: Array.isArray(p.sections)
      ? (p.sections as Record<string, unknown>[]).map((s, idx) => ({
          type: String(s.type || "section"),
          order: Number(s.order || idx + 1),
          contentDescription: String(s.contentDescription || ""),
          hasImage: Boolean(s.hasImage),
          layout: String(s.layout || "centered"),
        }))
      : [],
    purpose: String(p.purpose || ""),
  }));

  if (pages.length === 0) {
    throw new Error("분석 결과에 페이지가 없습니다.");
  }

  // designSystem 검증/변환
  const ds = parsed.designSystem || {};
  const designSystem: DesignSystem = {
    primaryColor: String(ds.primaryColor || DEFAULT_DESIGN_SYSTEM.primaryColor),
    accentColor: String(ds.accentColor || DEFAULT_DESIGN_SYSTEM.accentColor),
    backgroundColor: String(ds.backgroundColor || DEFAULT_DESIGN_SYSTEM.backgroundColor),
    textColor: String(ds.textColor || DEFAULT_DESIGN_SYSTEM.textColor),
    headingFont: String(ds.headingFont || DEFAULT_DESIGN_SYSTEM.headingFont),
    bodyFont: String(ds.bodyFont || DEFAULT_DESIGN_SYSTEM.bodyFont),
    style: String(ds.style || DEFAULT_DESIGN_SYSTEM.style),
  };

  // navigation 검증/변환
  const nav = parsed.navigation || {};
  const navigation: NavigationStructure = {
    items: Array.isArray(nav.items)
      ? (nav.items as Record<string, unknown>[]).map((item) => ({
          label: String(item.label || ""),
          slug: String(item.slug || ""),
        }))
      : DEFAULT_ANALYSIS.navigation.items,
    style: String(nav.style || "fixed-top"),
    hasDropdown: Boolean(nav.hasDropdown),
  };

  return {
    pages,
    designSystem,
    navigation,
    businessType: String(parsed.businessType || "일반"),
    rawAnalysis: responseText,
  };
}
