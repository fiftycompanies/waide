/** @deprecated 수동 제작 플로우 전환으로 미사용 (2026-03) */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 블로그 메뉴/페이지를 생성된 홈페이지에 주입한다.
 *
 * 1. 네비게이션에 "블로그" 메뉴 (경로: /blog) 삽입
 * 2. blog_config에 blog_enabled: true 설정
 * 3. 블로그 글 목록 페이지 기본 레이아웃 정보 저장
 */

export interface BlogInjectionResult {
  blogEnabled: boolean;
  blogPath: string;
  menuLabel: string;
}

/**
 * 홈페이지 프로젝트에 블로그 메뉴를 강제 삽입한다.
 */
export async function injectBlogMenu(
  supabase: SupabaseClient,
  projectId: string
): Promise<BlogInjectionResult> {
  // 프로젝트 조회
  const { data: project, error } = await supabase
    .from("homepage_projects")
    .select("blog_config, theme_config")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    throw new Error(`프로젝트 조회 실패: ${error?.message || "not found"}`);
  }

  // blog_config 업데이트
  const currentBlogConfig = (project.blog_config ?? {}) as Record<string, unknown>;
  const updatedBlogConfig = {
    ...currentBlogConfig,
    blog_enabled: true,
    blog_path: "/blog",
    menu_label: "블로그",
    posts_per_month: currentBlogConfig.posts_per_month ?? 8,
    info_review_ratio: currentBlogConfig.info_review_ratio ?? "5:3",
    initial_posts_count: 8,
  };

  // theme_config의 navigation에 블로그 메뉴 추가
  const currentThemeConfig = (project.theme_config ?? {}) as Record<string, unknown>;
  const navigation = (currentThemeConfig.navigation ?? []) as Array<{ label: string; path: string }>;

  // 이미 블로그 메뉴가 있는지 확인
  const hasBlogMenu = navigation.some(
    (item) => item.path === "/blog" || item.label === "블로그"
  );

  if (!hasBlogMenu) {
    navigation.push({ label: "블로그", path: "/blog" });
  }

  const updatedThemeConfig = {
    ...currentThemeConfig,
    navigation,
  };

  // DB 업데이트
  const { error: updateError } = await supabase
    .from("homepage_projects")
    .update({
      blog_config: updatedBlogConfig,
      theme_config: updatedThemeConfig,
    })
    .eq("id", projectId);

  if (updateError) {
    throw new Error(`블로그 설정 업데이트 실패: ${updateError.message}`);
  }

  return {
    blogEnabled: true,
    blogPath: "/blog",
    menuLabel: "블로그",
  };
}
