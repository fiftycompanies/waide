import { describe, test, expect } from "vitest";
import {
  convertMarkdownToHtml,
  generateArticleSchema,
  generateFaqSchema,
  generateCanonicalTag,
  generateLocalBusinessSchema,
  generateSchemaMarkup,
} from "@/lib/publishers/markdown-to-html";

describe("markdown-to-html", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // TC1: convertMarkdownToHtml handles heading, list, emphasis
  // ─────────────────────────────────────────────────────────────────────────
  test("TC1: converts headings, lists, and emphasis correctly", () => {
    const markdown = `# Main Title

## Section 1

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3

### Subsection

1. First
2. Second
3. Third
`;

    const html = convertMarkdownToHtml(markdown);

    // Headings
    expect(html).toContain("<h1");
    expect(html).toContain("Main Title");
    expect(html).toContain("<h2");
    expect(html).toContain("Section 1");
    expect(html).toContain("<h3");
    expect(html).toContain("Subsection");

    // Emphasis
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");

    // Unordered list
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Item 1</li>");

    // Ordered list
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>First</li>");
  });

  test("TC1b: handles GFM tables", () => {
    const markdown = `| Name | Score |
|------|-------|
| A    | 90    |
| B    | 85    |
`;

    const html = convertMarkdownToHtml(markdown);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>A</td>");
    expect(html).toContain("<td>90</td>");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC2: Schema.org JSON-LD is valid JSON in script tag
  // ─────────────────────────────────────────────────────────────────────────
  test("TC2: generateArticleSchema produces valid JSON-LD", () => {
    const schema = generateArticleSchema({
      title: "강남 맛집 TOP 10",
      description: "강남에서 맛있는 곳을 소개합니다.",
      url: "https://blog.example.com/gangnam-food",
      datePublished: "2026-03-01",
      keywords: ["강남", "맛집", "추천"],
    });

    // Should be wrapped in script tag
    expect(schema).toContain('<script type="application/ld+json">');
    expect(schema).toContain("</script>");

    // Extract JSON from script tag
    const jsonStr = schema
      .replace('<script type="application/ld+json">', "")
      .replace("</script>", "");

    const parsed = JSON.parse(jsonStr);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe("강남 맛집 TOP 10");
    expect(parsed.description).toBe("강남에서 맛있는 곳을 소개합니다.");
    expect(parsed.url).toBe("https://blog.example.com/gangnam-food");
    expect(parsed.keywords).toContain("강남");
  });

  test("TC2b: generateFaqSchema produces valid FAQ JSON-LD", () => {
    const schema = generateFaqSchema([
      { question: "강남 맛집 어디?", answer: "레스토랑 A를 추천합니다." },
      { question: "강남 카페 추천?", answer: "카페 B가 좋습니다." },
    ]);

    const jsonStr = schema
      .replace('<script type="application/ld+json">', "")
      .replace("</script>", "");

    const parsed = JSON.parse(jsonStr);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity).toHaveLength(2);
    expect(parsed.mainEntity[0]["@type"]).toBe("Question");
    expect(parsed.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
  });

  test("TC2c: generateLocalBusinessSchema produces valid LocalBusiness JSON-LD", () => {
    const schema = generateLocalBusinessSchema({
      name: "캠핏 카페",
      description: "강남의 인기 카페",
      url: "https://example.com",
    });

    const jsonStr = schema
      .replace('<script type="application/ld+json">', "")
      .replace("</script>", "");

    const parsed = JSON.parse(jsonStr);
    expect(parsed["@type"]).toBe("LocalBusiness");
    expect(parsed.name).toBe("캠핏 카페");
  });

  test("TC2d: generateSchemaMarkup routes by contentType", () => {
    const entitySchema = generateSchemaMarkup({
      contentType: "aeo_entity",
      title: "캠핏 카페",
    });
    expect(entitySchema).toContain("LocalBusiness");

    const articleSchema = generateSchemaMarkup({
      contentType: "blog_list",
      title: "맛집 리스트",
    });
    expect(articleSchema).toContain("Article");
  });

  test("TC2e: generateFaqSchema returns empty string for empty items", () => {
    const schema = generateFaqSchema([]);
    expect(schema).toBe("");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC3: generateCanonicalTag generates correct link tag
  // ─────────────────────────────────────────────────────────────────────────
  test("TC3: generateCanonicalTag generates correct link tag", () => {
    const url = "https://blog.example.com/post-1";
    const tag = generateCanonicalTag(url);

    expect(tag).toBe(`<link rel="canonical" href="${url}" />`);
    expect(tag).toContain("rel=\"canonical\"");
    expect(tag).toContain(url);
  });

  test("TC3b: generateCanonicalTag handles URLs with query params", () => {
    const url = "https://blog.example.com/post-1?utm_source=test";
    const tag = generateCanonicalTag(url);
    expect(tag).toContain(url);
  });
});
