'use server';

import { createAdminClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { BlogScheduler, HomepagePublisher } from '@/lib/homepage/publishing';
import type { MonthlySchedule, PublicationStats } from '@/lib/homepage/publishing';

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * 월간 스케줄 생성
 */
export async function generateMonthlySchedule(
  projectId: string
): Promise<ActionResult<MonthlySchedule>> {
  try {
    const supabase = createAdminClient();
    const scheduler = new BlogScheduler(supabase);
    const schedule = await scheduler.generateMonthlySchedule(projectId);

    revalidatePath(`/homepage/${projectId}`);

    return {
      success: true,
      data: schedule,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '월간 스케줄 생성에 실패했습니다.',
    };
  }
}

/**
 * 스케줄된 포스트 실행
 */
export async function executeScheduledPosts(
  projectId: string
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();
    const scheduler = new BlogScheduler(supabase);
    await scheduler.executeSchedule(projectId);

    revalidatePath(`/homepage/${projectId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '스케줄 실행에 실패했습니다.',
    };
  }
}

/**
 * 수동 발행 (실패 시 최대 3회 재시도)
 */
export async function publishPost(
  projectId: string,
  contentId: string
): Promise<ActionResult<{ publicationId: string; blogUrl: string }>> {
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const supabase = createAdminClient();
      const publisher = new HomepagePublisher(supabase);
      const result = await publisher.publishToHomepage(contentId, projectId);

      revalidatePath(`/homepage/${projectId}`);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      lastError = error;
      console.warn(
        `[publishing-actions] publishPost 시도 ${attempt}/${MAX_RETRIES} 실패:`,
        error instanceof Error ? error.message : error
      );
      if (attempt < MAX_RETRIES) {
        // 재시도 전 대기 (1초, 2초)
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : '발행에 실패했습니다. (3회 재시도 후)',
  };
}

/**
 * 발행 취소
 */
export async function unpublishPost(
  contentId: string
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();
    const publisher = new HomepagePublisher(supabase);
    await publisher.unpublishFromHomepage(contentId);

    revalidatePath('/homepage');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '발행 취소에 실패했습니다.',
    };
  }
}

/**
 * 발행된 포스트 목록 조회
 */
export async function getPublishedPosts(
  projectId: string,
  page: number = 1,
  limit: number = 20
): Promise<
  ActionResult<{
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
  }>
> {
  try {
    const supabase = createAdminClient();
    const publisher = new HomepagePublisher(supabase);
    const offset = (page - 1) * limit;
    const result = await publisher.getPublishedPosts(projectId, limit, offset);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '포스트 목록 조회에 실패했습니다.',
    };
  }
}

/**
 * 초기 블로그 8개 생성
 */
export async function generateInitialBlogs(
  projectId: string
): Promise<ActionResult<{ contentIds: string[]; count: number }>> {
  try {
    const supabase = createAdminClient();
    const publisher = new HomepagePublisher(supabase);
    const contentIds = await publisher.generateInitialBlogs(projectId);

    revalidatePath(`/homepage/${projectId}`);

    return {
      success: true,
      data: {
        contentIds,
        count: contentIds.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '초기 블로그 생성에 실패했습니다.',
    };
  }
}

/**
 * 발행 통계 조회
 */
export async function getPublicationStats(
  projectId: string
): Promise<ActionResult<PublicationStats>> {
  try {
    const supabase = createAdminClient();
    const scheduler = new BlogScheduler(supabase);
    const stats = await scheduler.getPublicationStats(projectId);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '발행 통계 조회에 실패했습니다.',
    };
  }
}
