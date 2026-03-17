/**
 * fk-chains.test.ts
 * FK 관계 체인 문서화 검증 (8 TC)
 *
 * DB 호출 없이, 데이터 모델의 FK 관계를 논리적으로 문서화/검증.
 * CLAUDE.md 섹션 1.1 "모든 데이터는 client_id FK로 연결. clients가 최상위 부모."
 * CLAUDE.md 섹션 1.5 "contents.account_id FK -> blog_accounts(id) (accounts 아님!)"
 */
import { describe, test, expect } from "vitest";

/**
 * FK 관계를 표현하는 인터페이스.
 * source: 참조하는 테이블
 * target: 참조 대상 테이블
 * fk_column: source 테이블의 FK 컬럼명
 * target_column: target 테이블의 PK 컬럼명
 * nullable: FK가 NULL 허용인지
 */
interface FKRelation {
  source: string;
  target: string;
  fk_column: string;
  target_column: string;
  nullable: boolean;
}

/**
 * 프로젝트 데이터 모델의 핵심 FK 관계.
 * CLAUDE.md 및 마이그레이션 SQL 기반으로 정의.
 */
const FK_RELATIONS: FKRelation[] = [
  // clients -> keywords
  { source: "keywords", target: "clients", fk_column: "client_id", target_column: "id", nullable: false },
  // keywords -> contents
  { source: "contents", target: "keywords", fk_column: "keyword_id", target_column: "id", nullable: false },
  // contents -> publications
  { source: "publications", target: "contents", fk_column: "content_id", target_column: "id", nullable: false },
  // clients -> subscriptions
  { source: "subscriptions", target: "clients", fk_column: "client_id", target_column: "id", nullable: false },
  // clients -> users
  { source: "users", target: "clients", fk_column: "client_id", target_column: "id", nullable: true },
  // keywords -> questions
  { source: "questions", target: "keywords", fk_column: "keyword_id", target_column: "id", nullable: false },
  // contents -> blog_accounts (NOT accounts!)
  { source: "contents", target: "blog_accounts", fk_column: "account_id", target_column: "id", nullable: true },
  // brand_analyses -> clients (nullable)
  { source: "brand_analyses", target: "clients", fk_column: "client_id", target_column: "id", nullable: true },
];

describe("FK relationship chains", () => {
  test("clients -> keywords (client_id FK)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "keywords" && r.target === "clients"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("client_id");
    expect(rel!.target_column).toBe("id");
    expect(rel!.nullable).toBe(false);
  });

  test("keywords -> contents (keyword_id FK)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "contents" && r.target === "keywords"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("keyword_id");
    expect(rel!.target_column).toBe("id");
    expect(rel!.nullable).toBe(false);
  });

  test("contents -> publications (content_id FK)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "publications" && r.target === "contents"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("content_id");
    expect(rel!.target_column).toBe("id");
    expect(rel!.nullable).toBe(false);
  });

  test("clients -> subscriptions (client_id FK)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "subscriptions" && r.target === "clients"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("client_id");
    expect(rel!.target_column).toBe("id");
    expect(rel!.nullable).toBe(false);
  });

  test("clients -> users (client_id FK)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "users" && r.target === "clients"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("client_id");
    expect(rel!.target_column).toBe("id");
    // users.client_id is nullable (user may not be linked to a client yet)
    expect(rel!.nullable).toBe(true);
  });

  test("keywords -> questions (keyword_id FK)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "questions" && r.target === "keywords"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("keyword_id");
    expect(rel!.target_column).toBe("id");
    expect(rel!.nullable).toBe(false);
  });

  test("contents -> blog_accounts (account_id FK, NOT accounts!)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "contents" && r.fk_column === "account_id"
    );
    expect(rel).toBeDefined();
    // Critical: FK target is blog_accounts, NOT accounts
    expect(rel!.target).toBe("blog_accounts");
    expect(rel!.target).not.toBe("accounts");
    expect(rel!.nullable).toBe(true);
  });

  test("brand_analyses -> clients (client_id FK, nullable)", () => {
    const rel = FK_RELATIONS.find(
      (r) => r.source === "brand_analyses" && r.target === "clients"
    );
    expect(rel).toBeDefined();
    expect(rel!.fk_column).toBe("client_id");
    // brand_analyses.client_id is nullable (analysis may exist before client conversion)
    expect(rel!.nullable).toBe(true);
  });
});
