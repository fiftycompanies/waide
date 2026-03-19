import { SupabaseClient } from "@supabase/supabase-js";
import { generateSlug, ensureUniqueSlug } from "./slug-generator";

/**
 * 발행 결과
 */
export interface PublishResult {
  /** 발행 기록 ID (publications 테이블) */
  publicationId: string;
  /** 발행된 블로그 URL */
  blogUrl: string;
}

/**
 * 홈페이지 블로그 발행 관리자.
 *
 * publishing_accounts 테이블에 'homepage' 플랫폼을 등록하고,
 * contents 테이블의 콘텐츠를 홈페이지 블로그에 발행/해제한다.
 * 발행 시 contents.publish_status를 'published'로 변경하면
 * 홈페이지의 ISR이 자동으로 해당 콘텐츠를 반영한다.
 *
 * @example
 * ```ts
 * const publisher = new HomepagePublisher(supabase);
 * await publisher.registerHomepagePlatform("client-id", "project-id", "gangnam-interior");
 * const result = await publisher.publishToHomepage("content-id", "project-id");
 * console.log(result.blogUrl); // https://gangnam-interior.waide.kr/blog/post-slug
 * ```
 */
export class HomepagePublisher {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 홈페이지를 발행 플랫폼으로 등록한다.
   *
   * publishing_accounts 테이블에 platform='homepage' 레코드를 생성한다.
   * 이미 등록된 경우 기존 레코드를 업데이트한다.
   *
   * @param clientId - 클라이언트(업체) ID
   * @param projectId - 홈페이지 프로젝트 ID
   * @param subdomain - 서브도메인 (예: "gangnam-interior")
   */
  async registerHomepagePlatform(
    clientId: string,
    projectId: string,
    subdomain: string
  ): Promise<void> {
    const accountUrl = `https://${subdomain}.waide.kr/blog`;
    const accountName = "홈페이지 블로그";

    // 기존 등록 확인
    const { data: existing } = await this.supabase
      .from("publishing_accounts")
      .select("id")
      .eq("client_id", clientId)
      .eq("platform", "homepage")
      .maybeSingle();

    if (existing) {
      // 기존 레코드 업데이트
      const { error } = await this.supabase
        .from("publishing_accounts")
        .update({
          account_name: accountName,
          account_url: accountUrl,
          memo: JSON.stringify({ project_id: projectId, subdomain }),
        })
        .eq("id", existing.id);

      if (error) {
        throw new Error(`발행 계정 업데이트 실패: ${error.message}`);
      }
    } else {
      // 신규 등록
      const { error } = await this.supabase
        .from("publishing_accounts")
        .insert({
          client_id: clientId,
          platform: "homepage",
          account_name: accountName,
          account_url: accountUrl,
          is_default: true,
          memo: JSON.stringify({ project_id: projectId, subdomain }),
        });

      if (error) {
        throw new Error(`발행 계정 등록 실패: ${error.message}`);
      }
    }
  }

  /**
   * 콘텐츠를 홈페이지 블로그에 발행한다.
   *
   * 1. contents 테이블에서 콘텐츠 조회
   * 2. 슬러그가 없으면 자동 생성
   * 3. publish_status를 'published'로 업데이트
   * 4. publications 테이블에 발행 기록 저장
   * 5. 발행 URL 반환
   *
   * @param contentId - 발행할 콘텐츠 ID
   * @param projectId - 대상 홈페이지 프로젝트 ID
   * @returns 발행 기록 ID와 블로그 URL
   */
  async publishToHomepage(
    contentId: string,
    projectId: string
  ): Promise<PublishResult> {
    // 1. 콘텐츠 조회
    const { data: content, error: contentError } = await this.supabase
      .from("contents")
      .select("id, title, slug, client_id, content_type, quality_score")
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      throw new Error(
        `콘텐츠 조회 실패: ${contentError?.message || "콘텐츠를 찾을 수 없습니다"}`
      );
    }

    // 2. 프로젝트 정보 조회 (서브도메인)
    const { data: project, error: projectError } = await this.supabase
      .from("homepage_projects")
      .select("subdomain, client_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project?.subdomain) {
      throw new Error(
        `프로젝트 조회 실패: ${projectError?.message || "서브도메인이 설정되지 않았습니다"}`
      );
    }

    // 3. 슬러그 확인 및 생성
    let slug = content.slug;
    if (!slug) {
      // 기존 슬러그 조회
      const { data: existingPosts } = await this.supabase
        .from("contents")
        .select("slug")
        .eq("client_id", content.client_id)
        .in("content_type", ["hp_blog_info", "hp_blog_review"])
        .not("slug", "is", null);

      const existingSlugs = (existingPosts || []).map(
        (p: { slug: string }) => p.slug
      );

      slug = ensureUniqueSlug(
        generateSlug(content.title || "untitled"),
        existingSlugs
      );

      // 슬러그 업데이트
      await this.supabase
        .from("contents")
        .update({ slug })
        .eq("id", contentId);
    }

    // 4. 발행 상태 업데이트
    const { error: publishError } = await this.supabase
      .from("contents")
      .update({
        publish_status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", contentId);

    if (publishError) {
      throw new Error(`발행 상태 업데이트 실패: ${publishError.message}`);
    }

    // 5. 발행 URL 생성
    const blogUrl = `https://${project.subdomain}.waide.kr/blog/${slug}`;

    // 6. publications 테이블에 발행 기록 저장
    const { data: publication, error: pubError } = await this.supabase
      .from("publications")
      .insert({
        content_id: contentId,
        client_id: content.client_id,
        platform: "homepage",
        external_url: blogUrl,
        status: "published",
        published_at: new Date().toISOString(),
        metadata: {
          project_id: projectId,
          subdomain: project.subdomain,
          slug,
        },
      })
      .select("id")
      .single();

    if (pubError) {
      throw new Error(`발행 기록 저장 실패: ${pubError.message}`);
    }

    return {
      publicationId: publication.id,
      blogUrl,
    };
  }

  /**
   * 홈페이지 블로그에서 콘텐츠를 발행 해제한다.
   *
   * contents.publish_status를 'draft'로 변경하고,
   * publications 테이블의 기록을 'unpublished'로 업데이트한다.
   *
   * @param contentId - 발행 해제할 콘텐츠 ID
   */
  async unpublishFromHomepage(contentId: string): Promise<void> {
    // 1. 콘텐츠 상태 변경
    const { error: contentError } = await this.supabase
      .from("contents")
      .update({
        publish_status: "draft",
        published_at: null,
      })
      .eq("id", contentId);

    if (contentError) {
      throw new Error(`발행 해제 실패: ${contentError.message}`);
    }

    // 2. publications 기록 업데이트
    const { error: pubError } = await this.supabase
      .from("publications")
      .update({
        status: "unpublished",
        metadata: {
          unpublished_at: new Date().toISOString(),
        },
      })
      .eq("content_id", contentId)
      .eq("platform", "homepage");

    if (pubError) {
      console.warn(`발행 기록 업데이트 실패: ${pubError.message}`);
    }
  }

  /**
   * 프로젝트의 발행된 블로그 목록을 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param limit - 조회 수 (기본값: 20)
   * @param offset - 오프셋 (기본값: 0)
   * @returns 발행된 블로그 게시물 목록
   */
  async getPublishedPosts(
    projectId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    posts: Array<{
      id: string;
      title: string;
      slug: string;
      contentType: string;
      mainKeyword: string;
      publishedAt: string;
      qualityScore: number;
    }>;
    total: number;
  }> {
    const { data: project } = await this.supabase
      .from("homepage_projects")
      .select("client_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return { posts: [], total: 0 };
    }

    // 총 개수 조회
    const { count } = await this.supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", project.client_id)
      .in("content_type", ["hp_blog_info", "hp_blog_review"])
      .eq("publish_status", "published");

    // 목록 조회
    const { data: posts, error } = await this.supabase
      .from("contents")
      .select(
        "id, title, slug, content_type, main_keyword, published_at, quality_score"
      )
      .eq("client_id", project.client_id)
      .in("content_type", ["hp_blog_info", "hp_blog_review"])
      .eq("publish_status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`게시물 조회 실패: ${error.message}`);
    }

    return {
      posts: (posts || []).map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        contentType: post.content_type,
        mainKeyword: post.main_keyword,
        publishedAt: post.published_at,
        qualityScore: post.quality_score || 0,
      })),
      total: count || 0,
    };
  }

  /**
   * 초기 블로그 8개를 자동 생성한다.
   * 정보성 4개 + 후기성 4개를 생성하여 홈페이지 오픈 시
   * 기본 콘텐츠가 존재하도록 한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @returns 생성된 콘텐츠 ID 목록
   */
  async generateInitialBlogs(
    projectId: string
  ): Promise<string[]> {
    const { data: project, error: projectError } = await this.supabase
      .from("homepage_projects")
      .select("client_id, subdomain, blog_config")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(
        `프로젝트 조회 실패: ${projectError?.message || "프로젝트를 찾을 수 없습니다"}`
      );
    }

    // 타겟 키워드 조회
    const { data: keywords } = await this.supabase
      .from("keywords")
      .select("keyword, metadata")
      .eq("client_id", project.client_id)
      .eq("source", "blog_target")
      .eq("status", "active")
      .order("priority", { ascending: true })
      .limit(20);

    if (!keywords || keywords.length === 0) {
      throw new Error("블로그 생성에 사용할 키워드가 없습니다");
    }

    // 정보성/후기성 키워드 분류
    const infoKeywords = keywords.filter(
      (k) => k.metadata?.blog_type === "정보성" || k.metadata?.blog_type === "AEO"
    );
    const reviewKeywords = keywords.filter(
      (k) => k.metadata?.blog_type === "후기성"
    );

    // 키워드가 부족하면 전체에서 보충
    while (infoKeywords.length < 4 && keywords.length > infoKeywords.length) {
      const remaining = keywords.filter(
        (k) => !infoKeywords.includes(k) && !reviewKeywords.includes(k)
      );
      if (remaining.length === 0) break;
      infoKeywords.push(remaining[0]);
    }
    while (reviewKeywords.length < 4 && keywords.length > reviewKeywords.length) {
      const remaining = keywords.filter(
        (k) => !infoKeywords.includes(k) && !reviewKeywords.includes(k)
      );
      if (remaining.length === 0) break;
      reviewKeywords.push(remaining[0]);
    }

    const contentIds: string[] = [];
    const existingSlugs: string[] = [];

    // 정보성 블로그 4개 생성
    for (let i = 0; i < Math.min(4, infoKeywords.length); i++) {
      const keyword = infoKeywords[i].keyword;
      const title = this.generateInitialTitle(keyword, "정보성", i);
      const slug = ensureUniqueSlug(generateSlug(title), existingSlugs);
      existingSlugs.push(slug);

      const { data, error } = await this.supabase
        .from("contents")
        .insert({
          client_id: project.client_id,
          content_type: "hp_blog_info",
          title,
          slug,
          body: this.generateInitialBody(keyword, "정보성"),
          main_keyword: keyword,
          meta_description: `${keyword}에 대한 전문 가이드. 비용, 주의사항, 팁을 상세하게 안내합니다.`,
          schema_markup: this.buildArticleSchema(title),
          publish_status: "published",
          published_at: new Date().toISOString(),
          quality_score: 75,
        })
        .select("id")
        .single();

      if (!error && data) {
        contentIds.push(data.id);

        // 발행 기록 저장
        if (project.subdomain) {
          await this.supabase.from("publications").insert({
            content_id: data.id,
            client_id: project.client_id,
            platform: "homepage",
            external_url: `https://${project.subdomain}.waide.kr/blog/${slug}`,
            status: "published",
            published_at: new Date().toISOString(),
          });
        }
      }
    }

    // 후기성 블로그 4개 생성
    for (let i = 0; i < Math.min(4, reviewKeywords.length); i++) {
      const keyword = reviewKeywords[i].keyword;
      const title = this.generateInitialTitle(keyword, "후기성", i);
      const slug = ensureUniqueSlug(generateSlug(title), existingSlugs);
      existingSlugs.push(slug);

      const { data, error } = await this.supabase
        .from("contents")
        .insert({
          client_id: project.client_id,
          content_type: "hp_blog_review",
          title,
          slug,
          body: this.generateInitialBody(keyword, "후기성"),
          main_keyword: keyword,
          meta_description: `${keyword} 실제 사례를 공개합니다. Before/After와 상세 견적 정보를 확인하세요.`,
          schema_markup: this.buildArticleSchema(title),
          publish_status: "published",
          published_at: new Date().toISOString(),
          quality_score: 75,
        })
        .select("id")
        .single();

      if (!error && data) {
        contentIds.push(data.id);

        if (project.subdomain) {
          await this.supabase.from("publications").insert({
            content_id: data.id,
            client_id: project.client_id,
            platform: "homepage",
            external_url: `https://${project.subdomain}.waide.kr/blog/${slug}`,
            status: "published",
            published_at: new Date().toISOString(),
          });
        }
      }
    }

    return contentIds;
  }

  /**
   * 초기 블로그 제목을 생성한다.
   */
  private generateInitialTitle(
    keyword: string,
    blogType: "정보성" | "후기성",
    index: number
  ): string {
    const infoTemplates = [
      `${keyword} 완벽 가이드 - 전문가가 알려주는 A to Z`,
      `${keyword}, 이것만 알면 충분합니다`,
      `${keyword} 비용 총정리 (2026년 최신)`,
      `초보자를 위한 ${keyword} 체크리스트`,
    ];

    const reviewTemplates = [
      `${keyword} 실제 시공 사례 - Before & After 공개`,
      `${keyword} 3개월 후 솔직 리뷰`,
      `${keyword} 견적서 전격 공개 - 어디에 얼마가 들었나`,
      `${keyword} 고객 만족도 100% 비결`,
    ];

    const templates = blogType === "정보성" ? infoTemplates : reviewTemplates;
    return templates[index % templates.length];
  }

  /**
   * 초기 블로그 본문을 생성한다. (플레이스홀더)
   */
  private generateInitialBody(
    keyword: string,
    blogType: "정보성" | "후기성"
  ): string {
    if (blogType === "정보성") {
      return `
<h2>${keyword}이란?</h2>
<p>${keyword}에 대해 알아보기 전에, 기본 개념부터 정리해 보겠습니다. 인테리어는 단순한 꾸미기가 아닌 생활 공간의 가치를 높이는 전문적인 작업입니다.</p>

<h2>평균 비용은 얼마일까?</h2>
<p>일반적으로 ${keyword} 비용은 평당 200만~400만원 수준입니다. 다만 자재 등급, 시공 범위, 디자인 난이도에 따라 크게 달라질 수 있습니다.</p>

<table>
  <thead>
    <tr><th>항목</th><th>기본형</th><th>중급형</th><th>고급형</th></tr>
  </thead>
  <tbody>
    <tr><td>바닥</td><td>150만~</td><td>300만~</td><td>500만~</td></tr>
    <tr><td>도배/페인트</td><td>80만~</td><td>150만~</td><td>250만~</td></tr>
    <tr><td>주방</td><td>200만~</td><td>400만~</td><td>700만~</td></tr>
    <tr><td>욕실</td><td>150만~</td><td>300만~</td><td>500만~</td></tr>
    <tr><td>전기/조명</td><td>50만~</td><td>100만~</td><td>200만~</td></tr>
  </tbody>
</table>

<h2>업체 선택 시 주의사항</h2>
<ul>
  <li>포트폴리오와 실제 시공 사례 반드시 확인</li>
  <li>견적서 항목별 단가 비교</li>
  <li>AS 기간 및 보증 조건 확인</li>
  <li>계약서 필수 작성</li>
  <li>중간 정산이 아닌 단계별 정산 진행</li>
</ul>

<h2>자주 묻는 질문</h2>
<h3>시공 기간은 얼마나 걸리나요?</h3>
<p>보통 30평 기준 4~6주 정도 소요됩니다. 부분 시공의 경우 1~2주면 충분합니다.</p>

<h3>거주 중에도 시공이 가능한가요?</h3>
<p>부분 시공은 거주 중에도 가능하지만, 전체 리모델링의 경우 이사를 권장합니다.</p>

<h2>마무리</h2>
<p>${keyword}에 대해 더 궁금한 점이 있으시면 무료 상담을 신청해 주세요. 전문 컨설턴트가 맞춤형 견적을 안내해 드립니다.</p>
      `.trim();
    }

    return `
<h2>프로젝트 개요</h2>
<p>${keyword}의 실제 시공 사례를 공개합니다. 고객님의 요청사항과 예산에 맞춰 최적의 결과를 도출한 과정을 소개합니다.</p>

<h3>시공 정보</h3>
<ul>
  <li><strong>공간 유형</strong>: 아파트</li>
  <li><strong>평수</strong>: 30평</li>
  <li><strong>시공 범위</strong>: 전체 리모델링</li>
  <li><strong>시공 기간</strong>: 5주</li>
  <li><strong>스타일</strong>: 모던 미니멀</li>
</ul>

<h2>Before & After</h2>
<p>시공 전과 후를 비교해 보세요. 같은 공간이라고 믿기 어려울 정도로 변화했습니다.</p>

<h3>거실</h3>
<p>기존의 어두운 우드톤을 밝은 화이트+그레이 톤으로 변경하여 공간이 한층 넓어 보이는 효과를 얻었습니다.</p>

<h3>주방</h3>
<p>ㄱ자 형태의 주방을 아일랜드 형태로 변경하여 동선을 개선하고 수납 공간을 확보했습니다.</p>

<h2>상세 견적</h2>
<table>
  <thead>
    <tr><th>항목</th><th>금액</th><th>상세</th></tr>
  </thead>
  <tbody>
    <tr><td>철거</td><td>350만원</td><td>전체 철거</td></tr>
    <tr><td>바닥</td><td>450만원</td><td>강마루 시공</td></tr>
    <tr><td>도배</td><td>180만원</td><td>실크 도배</td></tr>
    <tr><td>주방</td><td>520만원</td><td>아일랜드 + 빌트인</td></tr>
    <tr><td>욕실</td><td>380만원</td><td>2곳 전면 교체</td></tr>
    <tr><td>전기/조명</td><td>220만원</td><td>매입등 + 간접조명</td></tr>
    <tr><td><strong>합계</strong></td><td><strong>2,100만원</strong></td><td></td></tr>
  </tbody>
</table>

<h2>고객 후기</h2>
<blockquote>
"처음에는 걱정이 많았는데, 상담부터 완공까지 매우 만족스러웠습니다. 특히 주방 변경이 생활의 질을 크게 높여주었습니다. 지인들에게도 적극 추천합니다."
</blockquote>

<h2>비슷한 공간을 고려하고 계신가요?</h2>
<p>무료 상담을 통해 맞춤형 견적과 디자인 제안을 받아보세요. 경험 풍부한 전문가가 최적의 솔루션을 제공해 드립니다.</p>
    `.trim();
  }

  /**
   * Article JSON-LD 구조화 데이터를 생성한다.
   */
  private buildArticleSchema(title: string): Record<string, unknown> {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      author: {
        "@type": "Organization",
        name: "와이드와일드",
      },
      publisher: {
        "@type": "Organization",
        name: "와이드와일드",
      },
    };
  }
}
