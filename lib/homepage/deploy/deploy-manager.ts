import { SupabaseClient } from "@supabase/supabase-js";
import { VercelClient, type DeployFile } from "./vercel-client";
import { generateUniqueSubdomain } from "./subdomain-manager";
import { generateHomepageHtml } from "./html-generator";

/**
 * 배포 결과
 */
export interface DeployResult {
  /** 배포된 URL */
  deploymentUrl: string;
  /** 서브도메인 (예: "gangnam-interior") */
  subdomain: string;
  /** Vercel 배포 ID */
  deploymentId: string;
  /** Vercel 프로젝트 ID */
  vercelProjectId: string;
}

/**
 * 프로젝트 상태 값
 */
export type ProjectStatus =
  | "collecting"
  | "building"
  | "preview"
  | "live"
  | "build_failed"
  | "suspended";

/**
 * 홈페이지 배포를 위한 필수 환경변수 목록
 */
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PROJECT_ID",
  "CLIENT_ID",
  "SUBDOMAIN",
] as const;

/**
 * 홈페이지 프로젝트의 빌드/배포를 관리하는 상위 오케스트레이터.
 *
 * Vercel API 클라이언트와 Supabase를 결합하여
 * 프로젝트 생성, 배포 트리거, 서브도메인 설정,
 * 환경변수 주입, 재배포 등을 수행한다.
 *
 * @example
 * ```ts
 * const manager = new DeployManager(vercelClient, supabaseClient);
 * const result = await manager.deployProject("project-uuid");
 * console.log(result.deploymentUrl); // https://gangnam-interior.waide.kr
 * ```
 */
export class DeployManager {
  constructor(
    private vercel: VercelClient,
    private supabase: SupabaseClient
  ) {}

  /**
   * 프로젝트의 전체 배포 플로우를 실행한다.
   *
   * 1. Supabase에서 프로젝트 데이터 조회
   * 2. Vercel 프로젝트 생성 (미존재 시)
   * 3. 환경변수 설정
   * 4. 배포 생성
   * 5. 서브도메인 도메인 연결
   * 6. homepage_projects 테이블 업데이트
   *
   * @param projectId - 배포할 홈페이지 프로젝트 ID
   * @returns 배포 결과 (URL, 서브도메인, 배포 ID)
   */
  async deployProject(projectId: string): Promise<DeployResult> {
    // 1. 프로젝트 데이터 조회
    const { data: project, error: projectError } = await this.supabase
      .from("homepage_projects")
      .select("*, client:clients(*)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(
        `프로젝트 조회 실패: ${projectError?.message || "프로젝트를 찾을 수 없습니다"}`
      );
    }

    // 자료 수집 정보 조회
    const { data: materials } = await this.supabase
      .from("homepage_materials")
      .select("*")
      .eq("project_id", projectId)
      .single();

    // 상태 업데이트: building
    await this.updateStatus(projectId, "building");

    try {
      // 2. 서브도메인 결정
      let subdomain = project.subdomain;
      if (!subdomain) {
        const companyName =
          materials?.company_name || project.project_name || "homepage";
        subdomain = await generateUniqueSubdomain(companyName, this.supabase);
      }

      // 3. Vercel 프로젝트 생성 (미존재 시) — 이미 존재하면 재사용
      let vercelProjectId = project.vercel_project_id;
      if (!vercelProjectId) {
        const projectName = `waide-hp-${subdomain}`;
        try {
          const vercelProject = await this.vercel.createProject({
            name: projectName,
            framework: "nextjs",
            gitRepository: project.git_repository
              ? {
                  repo: project.git_repository,
                  type: "github",
                }
              : undefined,
          });
          vercelProjectId = vercelProject.id;
        } catch (err) {
          // 이미 존재하는 프로젝트면 조회하여 재사용
          const isAlreadyExists =
            err instanceof Error && err.message.includes("already exists");
          if (isAlreadyExists) {
            const existing = await this.vercel.getProject(projectName);
            if (existing) {
              vercelProjectId = existing.id;
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }

      // 4. 환경변수 설정
      const envVars = this.buildEnvVars(project, subdomain);
      await this.vercel.setEnvVars(vercelProjectId, envVars);

      // 5. 서브도메인 도메인 연결
      const domain = `${subdomain}.waide.kr`;
      try {
        await this.vercel.addDomain(vercelProjectId, domain);
      } catch (error) {
        // 이미 연결된 도메인인 경우 무시
        const vercelError = error as { code?: string };
        if (vercelError.code !== "domain_already_in_use") {
          console.warn(`도메인 설정 경고: ${(error as Error).message}`);
        }
      }

      // 6. 배포 생성
      let deployFiles: DeployFile[] | undefined;
      if (!project.git_repository) {
        // Git 저장소 없으면 HTML 파일 업로드 방식
        const clientName =
          (project.client as Record<string, unknown>)?.name as string ||
          materials?.company_name ||
          project.project_name ||
          "홈페이지";
        const clientPhone = (project.client as Record<string, unknown>)?.phone as string | undefined;
        const clientAddress = (project.client as Record<string, unknown>)?.address as string | undefined;

        const html = generateHomepageHtml({
          projectName: project.project_name || "홈페이지",
          clientName,
          phone: clientPhone,
          address: clientAddress,
          themeConfig: (project.theme_config || {}) as Record<string, unknown>,
          seoConfig: (project.seo_config || {}) as Record<string, unknown>,
        });

        deployFiles = [{ file: "index.html", data: html }];
      }

      const deployment = await this.vercel.createDeployment({
        projectId: vercelProjectId,
        target: "production",
        gitSource: project.git_repository
          ? {
              ref: "main",
              repoId: project.git_repo_id || "",
            }
          : undefined,
        files: deployFiles,
      });

      // 7. homepage_projects 테이블 업데이트
      const { error: updateError } = await this.supabase
        .from("homepage_projects")
        .update({
          subdomain,
          vercel_project_id: vercelProjectId,
          vercel_deployment_url: `https://${deployment.url}`,
          status: "building",
          last_deployed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (updateError) {
        console.error(`프로젝트 업데이트 실패: ${updateError.message}`);
      }

      return {
        deploymentUrl: `https://${domain}`,
        subdomain,
        deploymentId: deployment.id,
        vercelProjectId,
      };
    } catch (error) {
      // 빌드 실패 시 상태 업데이트
      await this.updateStatus(projectId, "build_failed");
      throw error;
    }
  }

  /**
   * 데이터 변경 시 재배포를 트리거한다.
   *
   * 포트폴리오 추가, 후기 수정, 블로그 발행 등
   * 데이터 변경이 발생했을 때 호출하여 홈페이지를 갱신한다.
   *
   * @param projectId - 재배포할 프로젝트 ID
   */
  async redeployOnChange(projectId: string): Promise<void> {
    const { data: project, error } = await this.supabase
      .from("homepage_projects")
      .select("vercel_project_id, vercel_deployment_url, status")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      throw new Error(
        `프로젝트 조회 실패: ${error?.message || "프로젝트를 찾을 수 없습니다"}`
      );
    }

    // 라이브 상태가 아닌 프로젝트는 재배포 불필요
    if (project.status !== "live" && project.status !== "preview") {
      return;
    }

    if (!project.vercel_project_id) {
      throw new Error("Vercel 프로젝트가 아직 생성되지 않았습니다");
    }

    // 최신 배포 조회
    const deployments = await this.vercel.listDeployments(
      project.vercel_project_id,
      1
    );

    if (deployments.length === 0) {
      throw new Error("기존 배포를 찾을 수 없습니다");
    }

    // 재배포 트리거
    const redeployment = await this.vercel.redeploy(deployments[0].id);

    // DB 업데이트
    await this.supabase
      .from("homepage_projects")
      .update({
        vercel_deployment_url: `https://${redeployment.url}`,
        last_deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  }

  /**
   * 특정 배포로 롤백한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param deploymentId - 롤백 대상 배포 ID
   */
  async rollbackToDeployment(
    projectId: string,
    deploymentId: string
  ): Promise<void> {
    const { data: project, error } = await this.supabase
      .from("homepage_projects")
      .select("vercel_project_id")
      .eq("id", projectId)
      .single();

    if (error || !project?.vercel_project_id) {
      throw new Error(
        `프로젝트 조회 실패: ${error?.message || "Vercel 프로젝트 ID가 없습니다"}`
      );
    }

    // 해당 배포를 프로덕션으로 프로모트
    await this.vercel.promoteToProduction(
      project.vercel_project_id,
      deploymentId
    );

    // 배포 정보 조회하여 URL 업데이트
    const deployment = await this.vercel.getDeployment(deploymentId);

    await this.supabase
      .from("homepage_projects")
      .update({
        vercel_deployment_url: `https://${deployment.url}`,
        last_deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  }

  /**
   * 프로젝트 상태를 업데이트한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param status - 변경할 상태
   */
  async updateStatus(
    projectId: string,
    status: ProjectStatus
  ): Promise<void> {
    const { error } = await this.supabase
      .from("homepage_projects")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (error) {
      throw new Error(`상태 업데이트 실패: ${error.message}`);
    }
  }

  /**
   * 배포 이력을 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param limit - 조회할 이력 수 (기본값: 10)
   * @returns 배포 이력 목록
   */
  async getDeploymentHistory(
    projectId: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      url: string;
      readyState: string;
      createdAt: number;
    }>
  > {
    const { data: project, error } = await this.supabase
      .from("homepage_projects")
      .select("vercel_project_id")
      .eq("id", projectId)
      .single();

    if (error || !project?.vercel_project_id) {
      return [];
    }

    return this.vercel.listDeployments(project.vercel_project_id, limit);
  }

  /**
   * Vercel 프로젝트를 삭제하고 DB를 정리한다.
   *
   * @param projectId - 삭제할 프로젝트 ID
   */
  async destroyProject(projectId: string): Promise<void> {
    const { data: project } = await this.supabase
      .from("homepage_projects")
      .select("vercel_project_id")
      .eq("id", projectId)
      .single();

    if (project?.vercel_project_id) {
      try {
        await this.vercel.deleteProject(project.vercel_project_id);
      } catch (error) {
        console.warn(`Vercel 프로젝트 삭제 실패: ${(error as Error).message}`);
      }
    }

    await this.supabase
      .from("homepage_projects")
      .update({
        vercel_project_id: null,
        vercel_deployment_url: null,
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  }

  /**
   * 홈페이지 배포에 필요한 환경변수 목록을 생성한다.
   */
  private buildEnvVars(
    project: Record<string, unknown>,
    subdomain: string
  ): Array<{ key: string; value: string; target: string[] }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    const targets = ["production", "preview", "development"];

    return [
      {
        key: "NEXT_PUBLIC_SUPABASE_URL",
        value: supabaseUrl,
        target: targets,
      },
      {
        key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        value: supabaseAnonKey,
        target: targets,
      },
      {
        key: "SUPABASE_SERVICE_ROLE_KEY",
        value: supabaseServiceKey,
        target: targets,
      },
      {
        key: "PROJECT_ID",
        value: project.id as string,
        target: targets,
      },
      {
        key: "CLIENT_ID",
        value: project.client_id as string,
        target: targets,
      },
      {
        key: "SUBDOMAIN",
        value: subdomain,
        target: targets,
      },
    ];
  }
}
