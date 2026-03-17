import { describe, test, expect } from "vitest";
import {
  convertMarkdownToHtml,
  generateFaqSchema,
  generateArticleSchema,
  generateSchemaMarkup,
  generateCanonicalTag,
  generateLocalBusinessSchema,
} from "@/lib/publishers/markdown-to-html";

describe("lib/publishers/markdown-to-html", () => {
  // ── TC1: convertMarkdownToHtml - 기본 마크다운 변환 ──
  test("convertMarkdownToHtml converts basic markdown to HTML", () => {
    const markdown = "# Hello World\n\nThis is a **bold** paragraph.\n\n- item 1\n- item 2";
    const html = convertMarkdownToHtml(markdown);

    expect(html).toContain("<h1>");
    expect(html).toContain("Hello World");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>item 1</li>");
    expect(html).toContain("<li>item 2</li>");
  });

  // ── TC2: generateFaqSchema - 유효한 JSON-LD 생성 ──
  test("generateFaqSchema creates valid JSON-LD script tag", () => {
    const items = [
      { question: "What is AI?", answer: "AI is artificial intelligence." },
      { question: "What is SEO?", answer: "SEO is search engine optimization." },
    ];

    const result = generateFaqSchema(items);

    // script 태그 포함 확인
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain("</script>");

    // JSON-LD 파싱 검증
    const jsonStr = result.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const schema = JSON.parse(jsonStr);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]["@type"]).toBe("Question");
    expect(schema.mainEntity[0].name).toBe("What is AI?");
    expect(schema.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe("AI is artificial intelligence.");
    expect(schema.mainEntity[1].name).toBe("What is SEO?");

    // 빈 배열이면 빈 문자열
    expect(generateFaqSchema([])).toBe("");
  });

  // ── TC3: generateArticleSchema - Article JSON-LD ──
  test("generateArticleSchema creates Article JSON-LD with optional fields", () => {
    const result = generateArticleSchema({
      title: "SEO Guide 2026",
      description: "Complete SEO guide for beginners",
      url: "https://example.com/seo-guide",
      datePublished: "2026-03-17",
      keywords: ["SEO", "marketing", "AI"],
    });

    expect(result).toContain('<script type="application/ld+json">');
    const jsonStr = result.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const schema = JSON.parse(jsonStr);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe("SEO Guide 2026");
    expect(schema.description).toBe("Complete SEO guide for beginners");
    expect(schema.url).toBe("https://example.com/seo-guide");
    expect(schema.datePublished).toBe("2026-03-17");
    expect(schema.keywords).toBe("SEO, marketing, AI");

    // 선택 필드 생략 시 포함되지 않아야 함
    const minimalResult = generateArticleSchema({ title: "Minimal" });
    const minimalJson = minimalResult.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const minimalSchema = JSON.parse(minimalJson);

    expect(minimalSchema.headline).toBe("Minimal");
    expect(minimalSchema.description).toBeUndefined();
    expect(minimalSchema.url).toBeUndefined();
    expect(minimalSchema.datePublished).toBeUndefined();
    expect(minimalSchema.keywords).toBeUndefined();
  });

  // ── TC4: generateSchemaMarkup - contentType별 스키마 선택 ──
  test("generateSchemaMarkup selects correct schema by contentType", () => {
    // aeo_entity → LocalBusiness
    const entityResult = generateSchemaMarkup({
      contentType: "aeo_entity",
      title: "My Business",
      description: "A local business",
      url: "https://example.com",
    });
    const entityJson = entityResult.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const entitySchema = JSON.parse(entityJson);
    expect(entitySchema["@type"]).toBe("LocalBusiness");
    expect(entitySchema.name).toBe("My Business");

    // aeo_qa → Article (FAQ 폴백)
    const qaResult = generateSchemaMarkup({
      contentType: "aeo_qa",
      title: "Q&A Content",
    });
    const qaJson = qaResult.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const qaSchema = JSON.parse(qaJson);
    expect(qaSchema["@type"]).toBe("Article");
    expect(qaSchema.headline).toBe("Q&A Content");

    // 기본값 (blog 등) → Article
    const defaultResult = generateSchemaMarkup({
      contentType: "blog_list",
      title: "Blog Post",
    });
    const defaultJson = defaultResult.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const defaultSchema = JSON.parse(defaultJson);
    expect(defaultSchema["@type"]).toBe("Article");

    // contentType 미지정 → Article
    const noTypeResult = generateSchemaMarkup({ title: "No Type" });
    const noTypeJson = noTypeResult.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const noTypeSchema = JSON.parse(noTypeJson);
    expect(noTypeSchema["@type"]).toBe("Article");

    // generateCanonicalTag 보너스 검증
    expect(generateCanonicalTag("https://example.com/page")).toBe(
      '<link rel="canonical" href="https://example.com/page" />'
    );

    // generateLocalBusinessSchema 보너스 검증
    const lbResult = generateLocalBusinessSchema({ name: "Cafe", description: "Nice cafe" });
    const lbJson = lbResult.replace('<script type="application/ld+json">', "").replace("</script>", "");
    const lbSchema = JSON.parse(lbJson);
    expect(lbSchema["@type"]).toBe("LocalBusiness");
    expect(lbSchema.name).toBe("Cafe");
    expect(lbSchema.description).toBe("Nice cafe");
  });
});
