'use server';

import { createAdminClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import {
  generateHomepageKeywords,
  deduplicateKeywords,
  batchKeywords,
  ensurePrimaryKeyword,
  getKeywordSummary,
  type KeywordEntry,
} from './generate-keywords';

// ----------------------------------------------------------------
// 타입 정의
// ----------------------------------------------------------------

interface GenerateResult {
  success: boolean;
  data?: {
    totalGenerated: number;
    duplicatesSkipped: number;
    totalInserted: number;
    primaryKeyword: string | null;
    categoryBreakdown: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
  error?: string;
}

// ----------------------------------------------------------------
// 메인 Server Action: 키워드 자동 생성 및 DB INSERT
// ----------------------------------------------------------------

/**
 * 프로젝트의 서비스 지역/유형을 기반으로 키워드를 자동 생성하고
 * keywords 테이블에 일괄 INSERT합니다.
 *
 * @param projectId - 홈페이지 프로젝트 ID
 * @param clientId - 클라이언트 ID
 * @param serviceRegions - 서비스 지역 배열
 * @param serviceTypes - 서비스 유형 배열
 */
export async function generateAndInsertKeywords(
  projectId: string,
  clientId: string,
  serviceRegions: string[],
  serviceTypes: string[]
): Promise<GenerateResult> {
  try {
    const supabase = createAdminClient();

    // 1. 키워드 매트릭스에서 키워드 생성
    const result = generateHomepageKeywords(serviceRegions, serviceTypes, projectId);

    // 대표 키워드 보장
    const keywordsWithPrimary = ensurePrimaryKeyword(result.keywords);

    // 2. 기존 키워드 조회 (중복 체크용)
    const { data: existingKeywords, error: fetchError } = await supabase
      .from('keywords')
      .select('keyword')
      .eq('client_id', clientId);

    if (fetchError) throw fetchError;

    const existingKeywordStrings = (existingKeywords ?? []).map(
      (k: { keyword: string }) => k.keyword
    );

    // 3. 중복 제거
    const { unique, duplicatesSkipped } = deduplicateKeywords(
      keywordsWithPrimary,
      existingKeywordStrings
    );

    if (unique.length === 0) {
      return {
        success: true,
        data: {
          totalGenerated: result.totalGenerated,
          duplicatesSkipped,
          totalInserted: 0,
          primaryKeyword: keywordsWithPrimary.find(k => k.is_primary)?.keyword ?? null,
          categoryBreakdown: result.categoryBreakdown,
          sourceBreakdown: result.sourceBreakdown,
          priorityBreakdown: result.priorityBreakdown,
        },
      };
    }

    // 4. 배치 INSERT (100개 단위)
    const batches = batchKeywords(unique, 100);
    let totalInserted = 0;

    for (const batch of batches) {
      const rows = batch.map((entry: KeywordEntry) => ({
        client_id: clientId,
        keyword: entry.keyword,
        source: entry.source,
        priority: entry.priority,
        status: 'active',
        is_primary: entry.is_primary,
        metadata: {
          blog_type: entry.metadata.blog_type ?? null,
          content_format: entry.metadata.content_format ?? null,
          region: entry.metadata.region ?? null,
          last_published_at: null,
          publish_count: 0,
          generated_by: 'homepage_auto',
          project_id: projectId,
          category: entry.metadata.category ?? null,
        },
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('keywords')
        .insert(rows)
        .select('id');

      if (insertError) {
        console.error(`배치 INSERT 실패 (${batch.length}개):`, insertError);
        throw insertError;
      }

      totalInserted += (inserted?.length ?? 0);
    }

    // 5. 요약 정보 생성
    const summary = getKeywordSummary(unique);

    // 6. 캐시 무효화
    revalidatePath('/keywords');
    revalidatePath(`/homepage/${projectId}`);

    return {
      success: true,
      data: {
        totalGenerated: result.totalGenerated,
        duplicatesSkipped,
        totalInserted,
        primaryKeyword: summary.primary,
        categoryBreakdown: result.categoryBreakdown,
        sourceBreakdown: result.sourceBreakdown,
        priorityBreakdown: result.priorityBreakdown,
      },
    };
  } catch (error) {
    console.error('키워드 생성 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '키워드 생성에 실패했습니다.',
    };
  }
}

// ----------------------------------------------------------------
// 프로젝트 기반 키워드 자동 생성
// (자료 수집 완료 후 자동 트리거)
// ----------------------------------------------------------------

/**
 * 프로젝트 ID만으로 키워드를 자동 생성합니다.
 * 프로젝트의 materials에서 서비스 지역/유형을 자동으로 읽어옵니다.
 */
export async function generateKeywordsForProject(
  projectId: string
): Promise<GenerateResult> {
  try {
    const supabase = createAdminClient();

    // 1. 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from('homepage_projects')
      .select('id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 2. 자료(materials) 정보 조회
    const { data: material, error: materialError } = await supabase
      .from('homepage_materials')
      .select('service_regions, service_types')
      .eq('project_id', projectId)
      .single();

    if (materialError || !material) {
      return { success: false, error: '자료 수집 정보를 찾을 수 없습니다. 먼저 자료를 수집해주세요.' };
    }

    if (!material.service_regions || material.service_regions.length === 0) {
      return { success: false, error: '서비스 지역이 설정되지 않았습니다.' };
    }

    if (!material.service_types || material.service_types.length === 0) {
      return { success: false, error: '서비스 유형이 설정되지 않았습니다.' };
    }

    // 3. 키워드 생성 실행
    return generateAndInsertKeywords(
      projectId,
      project.client_id,
      material.service_regions,
      material.service_types
    );
  } catch (error) {
    console.error('프로젝트 키워드 생성 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '키워드 생성에 실패했습니다.',
    };
  }
}

// ----------------------------------------------------------------
// 키워드 재생성 (기존 키워드 삭제 후 재생성)
// ----------------------------------------------------------------

/**
 * 프로젝트의 자동 생성 키워드를 모두 삭제하고 재생성합니다.
 * 수동으로 추가한 키워드(source='manual')는 유지됩니다.
 */
export async function regenerateKeywordsForProject(
  projectId: string
): Promise<GenerateResult> {
  try {
    const supabase = createAdminClient();

    // 1. 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from('homepage_projects')
      .select('id, client_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 2. 기존 자동 생성 키워드 삭제 (수동 키워드는 유지)
    const { error: deleteError } = await supabase
      .from('keywords')
      .delete()
      .eq('client_id', project.client_id)
      .in('source', ['homepage_seo', 'blog_target'])
      .contains('metadata', { project_id: projectId });

    if (deleteError) {
      console.error('기존 키워드 삭제 실패:', deleteError);
      // 삭제 실패해도 계속 진행 (metadata 필터가 지원되지 않을 수 있음)
      // fallback: source 기반으로만 삭제
      await supabase
        .from('keywords')
        .delete()
        .eq('client_id', project.client_id)
        .in('source', ['homepage_seo', 'blog_target']);
    }

    // 3. 새로 생성
    return generateKeywordsForProject(projectId);
  } catch (error) {
    console.error('키워드 재생성 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '키워드 재생성에 실패했습니다.',
    };
  }
}

// ----------------------------------------------------------------
// 프리뷰: 키워드 생성 시뮬레이션 (DB 저장 없이)
// ----------------------------------------------------------------

/**
 * 키워드가 어떻게 생성될지 미리보기를 제공합니다.
 * DB에 저장하지 않고 생성될 키워드 목록만 반환합니다.
 */
export async function previewKeywords(
  serviceRegions: string[],
  serviceTypes: string[],
  projectId?: string
): Promise<{
  success: boolean;
  data?: {
    keywords: Array<{
      keyword: string;
      source: string;
      priority: string;
      is_primary: boolean;
      blog_type?: string;
    }>;
    summary: ReturnType<typeof getKeywordSummary>;
  };
  error?: string;
}> {
  try {
    const result = generateHomepageKeywords(serviceRegions, serviceTypes, projectId);
    const keywordsWithPrimary = ensurePrimaryKeyword(result.keywords);
    const summary = getKeywordSummary(keywordsWithPrimary);

    return {
      success: true,
      data: {
        keywords: keywordsWithPrimary.map(k => ({
          keyword: k.keyword,
          source: k.source,
          priority: k.priority,
          is_primary: k.is_primary,
          blog_type: k.metadata.blog_type,
        })),
        summary,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '키워드 프리뷰 생성에 실패했습니다.',
    };
  }
}
