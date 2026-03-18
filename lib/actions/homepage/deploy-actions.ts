'use server';

import { createAdminClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { DeployManager, VercelClient } from '@/lib/homepage/deploy';

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

function getDeployManager() {
  const supabase = createAdminClient();
  const vercel = new VercelClient({
    token: process.env.VERCEL_TOKEN!,
    teamId: process.env.VERCEL_TEAM_ID!,
  });
  return new DeployManager(vercel, supabase);
}

/**
 * 프로젝트 배포 트리거
 */
export async function deployProject(
  projectId: string
): Promise<ActionResult<{
  deploymentUrl: string;
  subdomain: string;
  deploymentId: string;
  vercelProjectId: string;
}>> {
  try {
    const manager = getDeployManager();
    const result = await manager.deployProject(projectId);

    revalidatePath('/homepage');
    revalidatePath(`/homepage/${projectId}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '배포에 실패했습니다.',
    };
  }
}

/**
 * 프로젝트 재배포
 */
export async function redeployProject(
  projectId: string
): Promise<ActionResult> {
  try {
    const manager = getDeployManager();
    await manager.redeployOnChange(projectId);

    revalidatePath('/homepage');
    revalidatePath(`/homepage/${projectId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '재배포에 실패했습니다.',
    };
  }
}

/**
 * 특정 배포로 롤백
 */
export async function rollbackDeployment(
  projectId: string,
  deploymentId: string
): Promise<ActionResult> {
  try {
    const manager = getDeployManager();
    await manager.rollbackToDeployment(projectId, deploymentId);

    revalidatePath('/homepage');
    revalidatePath(`/homepage/${projectId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '롤백에 실패했습니다.',
    };
  }
}

/**
 * 배포 이력 조회
 */
export async function getDeploymentHistory(
  projectId: string
): Promise<
  ActionResult<
    Array<{
      id: string;
      url: string;
      readyState: string;
      createdAt: number;
    }>
  >
> {
  try {
    const manager = getDeployManager();
    const history = await manager.getDeploymentHistory(projectId);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '배포 이력 조회에 실패했습니다.',
    };
  }
}

/**
 * 프로젝트 상태 조회
 */
export async function getProjectStatus(
  projectId: string
): Promise<
  ActionResult<{
    status: string;
    subdomain: string | null;
    vercelDeploymentUrl: string | null;
    lastDeployedAt: string | null;
  }>
> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('homepage_projects')
      .select('status, subdomain, vercel_deployment_url, last_deployed_at')
      .eq('id', projectId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        status: data.status,
        subdomain: data.subdomain,
        vercelDeploymentUrl: data.vercel_deployment_url,
        lastDeployedAt: data.last_deployed_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프로젝트 상태 조회에 실패했습니다.',
    };
  }
}

/**
 * 프로젝트 삭제 (Vercel 프로젝트 포함)
 */
export async function destroyProject(
  projectId: string
): Promise<ActionResult> {
  try {
    const manager = getDeployManager();
    await manager.destroyProject(projectId);

    revalidatePath('/homepage');
    revalidatePath(`/homepage/${projectId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '프로젝트 삭제에 실패했습니다.',
    };
  }
}
