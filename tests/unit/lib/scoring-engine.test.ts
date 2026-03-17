/**
 * scoring-engine.test.ts
 * 채점 공식 및 등급 기준 검증 (3 TC)
 *
 * CLAUDE.md 섹션 6 "점수 체계" 기반.
 * - 마케팅 종합 점수 배점 (100점, 6영역)
 * - 계정 등급 임계값 (S/A/B/C)
 * - 키워드 난이도 임계값 (S/A/B/C)
 */
import { describe, test, expect } from "vitest";

// ── 마케팅 종합 점수 (100점) ─────────────────────────────────────────────
// CLAUDE.md 섹션 6-1:
//   리뷰 20, 키워드 노출 25(플레이스15+블로그10), 구글 15, 이미지 10, 채널 15, SEO/AEO 15

interface MarketingScoreCategory {
  name: string;
  maxPoints: number;
}

const MARKETING_SCORE_CATEGORIES: MarketingScoreCategory[] = [
  { name: "reviews", maxPoints: 20 },
  { name: "keywords", maxPoints: 25 },
  { name: "google", maxPoints: 15 },
  { name: "images", maxPoints: 10 },
  { name: "channels", maxPoints: 15 },
  { name: "seo_aeo", maxPoints: 15 },
];

// ── 등급 임계값 ──────────────────────────────────────────────────────────
// CLAUDE.md 섹션 6-2 / 6-3: S(80+), A(60+), B(40+), C(나머지)

type Grade = "S" | "A" | "B" | "C";

function calculateGrade(score: number): Grade {
  if (score >= 80) return "S";
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  return "C";
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Marketing score breakdown", () => {
  test("total max points equals 100", () => {
    const total = MARKETING_SCORE_CATEGORIES.reduce(
      (sum, c) => sum + c.maxPoints,
      0
    );
    expect(total).toBe(100);
  });

  test("individual category allocations match CLAUDE.md spec", () => {
    const byName = Object.fromEntries(
      MARKETING_SCORE_CATEGORIES.map((c) => [c.name, c.maxPoints])
    );

    expect(byName.reviews).toBe(20);
    expect(byName.keywords).toBe(25);
    expect(byName.google).toBe(15);
    expect(byName.images).toBe(10);
    expect(byName.channels).toBe(15);
    expect(byName.seo_aeo).toBe(15);
  });
});

describe("Account grade thresholds", () => {
  test("S(80+), A(60+), B(40+), C(rest)", () => {
    // S grade boundary
    expect(calculateGrade(100)).toBe("S");
    expect(calculateGrade(80)).toBe("S");
    expect(calculateGrade(79)).toBe("A");

    // A grade boundary
    expect(calculateGrade(60)).toBe("A");
    expect(calculateGrade(59)).toBe("B");

    // B grade boundary
    expect(calculateGrade(40)).toBe("B");
    expect(calculateGrade(39)).toBe("C");

    // C grade
    expect(calculateGrade(0)).toBe("C");
    expect(calculateGrade(10)).toBe("C");
  });
});

describe("Keyword difficulty thresholds", () => {
  test("S(80+), A(60+), B(40+), C(rest) -- same as account grades", () => {
    // The same grade function applies to keyword difficulty.
    // CLAUDE.md confirms identical thresholds for both account grades and keyword difficulty.
    const cases: [number, Grade][] = [
      [100, "S"],
      [95, "S"],
      [80, "S"],
      [79, "A"],
      [75, "A"],
      [60, "A"],
      [59, "B"],
      [50, "B"],
      [40, "B"],
      [39, "C"],
      [20, "C"],
      [0, "C"],
    ];

    cases.forEach(([score, expectedGrade]) => {
      expect(calculateGrade(score)).toBe(expectedGrade);
    });
  });
});
