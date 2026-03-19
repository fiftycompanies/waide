import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 한글-영문 음절 매핑 테이블 (간이 로마자 표기)
 * 국립국어원 로마자 표기법을 간소화한 버전
 */
const INITIAL_CONSONANTS: Record<string, string> = {
  ㄱ: "g",
  ㄲ: "kk",
  ㄴ: "n",
  ㄷ: "d",
  ㄸ: "tt",
  ㄹ: "r",
  ㅁ: "m",
  ㅂ: "b",
  ㅃ: "pp",
  ㅅ: "s",
  ㅆ: "ss",
  ㅇ: "",
  ㅈ: "j",
  ㅉ: "jj",
  ㅊ: "ch",
  ㅋ: "k",
  ㅌ: "t",
  ㅍ: "p",
  ㅎ: "h",
};

const MEDIAL_VOWELS: Record<string, string> = {
  ㅏ: "a",
  ㅐ: "ae",
  ㅑ: "ya",
  ㅒ: "yae",
  ㅓ: "eo",
  ㅔ: "e",
  ㅕ: "yeo",
  ㅖ: "ye",
  ㅗ: "o",
  ㅘ: "wa",
  ㅙ: "wae",
  ㅚ: "oe",
  ㅛ: "yo",
  ㅜ: "u",
  ㅝ: "wo",
  ㅞ: "we",
  ㅟ: "wi",
  ㅠ: "yu",
  ㅡ: "eu",
  ㅢ: "ui",
  ㅣ: "i",
};

const FINAL_CONSONANTS: Record<string, string> = {
  "": "",
  ㄱ: "k",
  ㄲ: "k",
  ㄳ: "k",
  ㄴ: "n",
  ㄵ: "n",
  ㄶ: "n",
  ㄷ: "t",
  ㄹ: "l",
  ㄺ: "l",
  ㄻ: "l",
  ㄼ: "l",
  ㄽ: "l",
  ㄾ: "l",
  ㄿ: "l",
  ㅀ: "l",
  ㅁ: "m",
  ㅂ: "p",
  ㅄ: "p",
  ㅅ: "t",
  ㅆ: "t",
  ㅇ: "ng",
  ㅈ: "t",
  ㅊ: "t",
  ㅋ: "k",
  ㅌ: "t",
  ㅍ: "p",
  ㅎ: "t",
};

const INITIAL_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const MEDIAL_LIST = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ",
  "ㅣ",
];

const FINAL_LIST = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/**
 * 한글 한 글자를 로마자로 변환한다.
 */
function romanizeChar(char: string): string {
  const code = char.charCodeAt(0);

  // 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
  if (code < 0xac00 || code > 0xd7a3) {
    return char;
  }

  const offset = code - 0xac00;
  const initialIndex = Math.floor(offset / (21 * 28));
  const medialIndex = Math.floor((offset % (21 * 28)) / 28);
  const finalIndex = offset % 28;

  const initial = INITIAL_CONSONANTS[INITIAL_LIST[initialIndex]] || "";
  const medial = MEDIAL_VOWELS[MEDIAL_LIST[medialIndex]] || "";
  const final = FINAL_CONSONANTS[FINAL_LIST[finalIndex]] || "";

  return initial + medial + final;
}

/**
 * 한글 문자열을 로마자로 변환한다.
 *
 * @param text - 변환할 한글 문자열
 * @returns 로마자 변환 결과
 *
 * @example
 * ```ts
 * romanize("강남인테리어") // "gangnam-interieo"
 * ```
 */
function romanize(text: string): string {
  return text
    .split("")
    .map((char) => romanizeChar(char))
    .join("");
}

/**
 * 자주 쓰이는 인테리어 관련 한글 단어를 영문으로 매핑
 */
const COMMON_WORDS: Record<string, string> = {
  인테리어: "interior",
  디자인: "design",
  건설: "construction",
  건축: "architecture",
  리모델링: "remodeling",
  시공: "construction",
  홈페이지: "homepage",
  홈: "home",
  페이지: "page",
  하우스: "house",
  스튜디오: "studio",
  프리미엄: "premium",
  모던: "modern",
  클래식: "classic",
  럭셔리: "luxury",
  의원: "clinic",
  병원: "hospital",
  치과: "dental",
  한의원: "clinic",
  피부과: "derma",
  성형외과: "plastic",
};

/**
 * 회사명을 URL-safe 서브도메인으로 변환한다.
 *
 * 한글 회사명을 로마자 표기법 기반으로 영문 변환하고,
 * URL에 사용 가능한 형태로 정리한다.
 *
 * @param companyName - 한글 회사명
 * @returns URL-safe 서브도메인 문자열
 *
 * @example
 * ```ts
 * generateSubdomain("강남인테리어") // "gangnam-interior"
 * generateSubdomain("모던하우스 디자인") // "modeonhauseu-design"
 * ```
 */
export function generateSubdomain(companyName: string): string {
  let name = companyName.trim();

  // 1. 흔한 한글 단어를 영문으로 치환
  for (const [korean, english] of Object.entries(COMMON_WORDS)) {
    name = name.replace(new RegExp(korean, "g"), ` ${english} `);
  }

  // 2. 나머지 한글을 로마자로 변환
  const parts = name.split(/\s+/).filter(Boolean);
  const romanized = parts.map((part) => {
    // 이미 영문인 경우 그대로 사용
    if (/^[a-zA-Z0-9-]+$/.test(part)) {
      return part.toLowerCase();
    }
    return romanize(part).toLowerCase();
  });

  // 3. 하이픈으로 연결, 특수문자 제거
  let subdomain = romanized
    .join("-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // 4. 최대 길이 제한 (63자: DNS 라벨 제한)
  if (subdomain.length > 63) {
    subdomain = subdomain.substring(0, 63).replace(/-$/, "");
  }

  // 5. 빈 문자열인 경우 기본값
  if (!subdomain) {
    subdomain = `homepage-${Date.now().toString(36)}`;
  }

  return subdomain;
}

/**
 * 서브도메인 형식 유효성을 검증한다.
 *
 * DNS 라벨 규칙에 따라 서브도메인이 유효한지 확인한다:
 * - 영문 소문자, 숫자, 하이픈만 허용
 * - 시작/끝에 하이픈 불가
 * - 1~63자 이내
 * - 예약어 불가
 *
 * @param subdomain - 검증할 서브도메인
 * @returns 유효 여부
 */
export function validateSubdomain(subdomain: string): boolean {
  // DNS 라벨 규칙
  if (!subdomain || subdomain.length > 63) {
    return false;
  }

  // 영문 소문자, 숫자, 하이픈만 허용
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return false;
  }

  // 예약어 목록
  const reserved = [
    "www",
    "api",
    "admin",
    "dashboard",
    "app",
    "mail",
    "ftp",
    "ns1",
    "ns2",
    "test",
    "staging",
    "dev",
    "ops",
    "status",
    "blog",
    "docs",
    "help",
    "support",
    "cdn",
    "static",
    "assets",
    "media",
  ];

  if (reserved.includes(subdomain)) {
    return false;
  }

  return true;
}

/**
 * 서브도메인이 아직 사용되지 않았는지 확인한다.
 *
 * homepage_projects 테이블에서 동일 서브도메인이 이미 존재하는지 조회한다.
 *
 * @param subdomain - 확인할 서브도메인
 * @param supabase - Supabase 클라이언트
 * @returns 사용 가능 여부
 */
export async function isSubdomainAvailable(
  subdomain: string,
  supabase: SupabaseClient
): Promise<boolean> {
  if (!validateSubdomain(subdomain)) {
    return false;
  }

  const { data, error } = await supabase
    .from("homepage_projects")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (error) {
    throw new Error(`서브도메인 조회 실패: ${error.message}`);
  }

  return data === null;
}

/**
 * 고유한 서브도메인을 생성한다.
 *
 * 중복 시 숫자 접미사를 추가하여 고유성을 보장한다.
 *
 * @param companyName - 한글 회사명
 * @param supabase - Supabase 클라이언트
 * @returns 고유한 서브도메인 문자열
 */
export async function generateUniqueSubdomain(
  companyName: string,
  supabase: SupabaseClient
): Promise<string> {
  const base = generateSubdomain(companyName);
  let candidate = base;
  let suffix = 1;

  while (!(await isSubdomainAvailable(candidate, supabase))) {
    candidate = `${base}-${suffix}`;
    suffix++;

    // 무한루프 방지 (최대 100번 시도)
    if (suffix > 100) {
      candidate = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }

  return candidate;
}
