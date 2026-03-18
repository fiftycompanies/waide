/**
 * 한글-영문 음절 매핑 테이블 (간이 로마자 표기)
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
 * 인테리어 분야에서 자주 쓰이는 한글 단어를 영문으로 매핑
 */
const COMMON_WORDS: Record<string, string> = {
  인테리어: "interior",
  디자인: "design",
  리모델링: "remodeling",
  아파트: "apartment",
  빌라: "villa",
  오피스텔: "officetel",
  사무실: "office",
  상가: "commercial",
  주택: "house",
  거실: "living-room",
  주방: "kitchen",
  욕실: "bathroom",
  침실: "bedroom",
  평: "pyeong",
  비용: "cost",
  견적: "estimate",
  후기: "review",
  시공: "construction",
  트렌드: "trend",
  가이드: "guide",
  총정리: "summary",
  비교: "comparison",
  추천: "recommend",
  모던: "modern",
  미니멀: "minimal",
  클래식: "classic",
  북유럽: "scandinavian",
  빈티지: "vintage",
  내추럴: "natural",
};

/**
 * 한글 한 글자를 로마자로 변환한다.
 */
function romanizeChar(char: string): string {
  const code = char.charCodeAt(0);

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
 */
function romanize(text: string): string {
  return text
    .split("")
    .map((char) => romanizeChar(char))
    .join("");
}

/**
 * 한글 블로그 제목을 URL-friendly 슬러그로 변환한다.
 *
 * 한글 단어 중 자주 쓰이는 인테리어 용어는 영문 매핑을 사용하고,
 * 나머지 한글은 로마자 표기법으로 변환한다.
 * 숫자는 그대로 유지한다.
 *
 * @param title - 한글 블로그 제목
 * @returns URL-friendly 슬러그
 *
 * @example
 * ```ts
 * generateSlug("강남 30평 아파트 인테리어 비용 총정리")
 * // "gangnam-30pyeong-apartment-interior-cost-summary"
 *
 * generateSlug("2026년 인테리어 트렌드 TOP 5")
 * // "2026nyeon-interior-trend-top-5"
 * ```
 */
export function generateSlug(title: string): string {
  let text = title.trim();

  // 1. 흔한 한글 단어를 영문으로 치환 (긴 단어 우선)
  const sortedWords = Object.entries(COMMON_WORDS).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [korean, english] of sortedWords) {
    text = text.replace(new RegExp(korean, "g"), ` ${english} `);
  }

  // 2. 공백/특수문자 기준으로 토큰 분리
  const tokens = text
    .split(/[\s,.\-_!?|·]+/)
    .filter((t) => t.length > 0);

  // 3. 각 토큰 변환
  const slugParts = tokens.map((token) => {
    // 이미 영문/숫자인 경우 소문자로
    if (/^[a-zA-Z0-9]+$/.test(token)) {
      return token.toLowerCase();
    }

    // 숫자가 포함된 한글 토큰 처리
    const subParts: string[] = [];
    let current = "";
    let isKorean = false;

    for (const char of token) {
      const code = char.charCodeAt(0);
      const charIsKorean = code >= 0xac00 && code <= 0xd7a3;
      const charIsNumber = code >= 0x30 && code <= 0x39;
      const charIsAlpha =
        (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);

      if (charIsKorean) {
        if (!isKorean && current) {
          subParts.push(current);
          current = "";
        }
        current += romanizeChar(char);
        isKorean = true;
      } else if (charIsNumber || charIsAlpha) {
        if (isKorean && current) {
          subParts.push(current);
          current = "";
        }
        current += char.toLowerCase();
        isKorean = false;
      }
      // 그 외 문자는 무시
    }

    if (current) {
      subParts.push(current);
    }

    return subParts.join("");
  });

  // 4. 하이픈으로 결합, 정리
  let slug = slugParts
    .join("-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // 5. 최대 길이 제한 (200자)
  if (slug.length > 200) {
    slug = slug.substring(0, 200).replace(/-$/, "");
  }

  // 6. 빈 문자열인 경우 기본값
  if (!slug) {
    slug = `post-${Date.now().toString(36)}`;
  }

  return slug;
}

/**
 * 슬러그의 고유성을 보장한다.
 *
 * 동일 슬러그가 존재할 경우 숫자 접미사를 추가한다.
 *
 * @param slug - 기본 슬러그
 * @param existingSlugs - 이미 사용 중인 슬러그 목록
 * @returns 고유한 슬러그
 */
export function ensureUniqueSlug(
  slug: string,
  existingSlugs: string[]
): string {
  if (!existingSlugs.includes(slug)) {
    return slug;
  }

  let suffix = 2;
  let candidate = `${slug}-${suffix}`;

  while (existingSlugs.includes(candidate)) {
    suffix++;
    candidate = `${slug}-${suffix}`;
  }

  return candidate;
}
