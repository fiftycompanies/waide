/**
 * Vercel API 인증 설정
 */
export interface VercelConfig {
  /** Vercel API Bearer Token */
  token: string;
  /** Vercel 팀 ID (팀 계정 사용 시) */
  teamId: string;
}

/**
 * Vercel 프로젝트 생성 파라미터
 */
export interface CreateProjectParams {
  /** 프로젝트 이름 */
  name: string;
  /** 프레임워크 (현재 nextjs만 지원) */
  framework: "nextjs";
  /** Git 저장소 연결 정보 */
  gitRepository?: { repo: string; type: "github" };
  /** 환경변수 목록 */
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: string[];
  }>;
}

/**
 * Vercel 배포용 파일
 */
export interface DeployFile {
  /** 파일 경로 (예: "index.html", "styles/main.css") */
  file: string;
  /** 파일 내용 (UTF-8 문자열, base64 인코딩은 내부에서 처리) */
  data: string;
}

/**
 * Vercel 배포 생성 파라미터
 */
export interface CreateDeploymentParams {
  /** 대상 Vercel 프로젝트 ID */
  projectId: string;
  /** 배포 대상 환경 */
  target: "production" | "preview";
  /** Git 소스 (브랜치 및 레포 ID) */
  gitSource?: { ref: string; repoId: string };
  /** 파일 업로드 기반 배포 (gitSource 없을 때 사용) */
  files?: DeployFile[];
}

/**
 * 환경변수 설정 항목
 */
export interface EnvVar {
  key: string;
  value: string;
  /** 적용 대상 환경: production, preview, development */
  target: string[];
}

/**
 * Vercel 배포 상태 정보
 */
export interface DeploymentInfo {
  /** 배포 ID */
  id: string;
  /** 배포 URL */
  url: string;
  /** 배포 상태: QUEUED, BUILDING, READY, ERROR, CANCELED */
  readyState: string;
  /** 배포 생성 시각 (Unix timestamp ms) */
  createdAt: number;
}

/**
 * Vercel API 에러
 */
export class VercelApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

/**
 * Vercel REST API 클라이언트
 *
 * Bearer Token 인증, 팀 계정 지원, 프로젝트 CRUD,
 * 배포 트리거, 도메인 관리, 환경변수 관리를 제공한다.
 * 에러 시 exponential backoff 재시도 로직을 포함한다.
 *
 * @example
 * ```ts
 * const client = new VercelClient({
 *   token: process.env.VERCEL_TOKEN!,
 *   teamId: process.env.VERCEL_TEAM_ID!,
 * });
 * const project = await client.createProject({
 *   name: "my-homepage",
 *   framework: "nextjs",
 * });
 * ```
 */
export class VercelClient {
  private baseUrl = "https://api.vercel.com";
  private maxRetries = 3;
  private baseDelay = 1000; // 1초

  constructor(private config: VercelConfig) {}

  /**
   * Vercel API 공통 요청 메서드
   * Exponential backoff 재시도 로직 포함
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (this.config.teamId) {
      url.searchParams.set("teamId", this.config.teamId);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * delay * 0.1;
        await this.sleep(delay + jitter);
      }

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        };

        const options: RequestInit = {
          method,
          headers,
        };

        if (body && method !== "GET" && method !== "DELETE") {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url.toString(), options);

        if (response.status === 429) {
          // Rate limit: 재시도
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.baseDelay * Math.pow(2, attempt);
          await this.sleep(waitTime);
          continue;
        }

        if (response.status === 204) {
          return {} as T;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new VercelApiError(
            data.error?.message || `Vercel API 오류: ${response.status}`,
            response.status,
            data.error?.code
          );
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // VercelApiError 중 재시도 불가능한 에러는 바로 throw
        if (error instanceof VercelApiError) {
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
        }

        if (attempt === this.maxRetries) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error("알 수 없는 Vercel API 오류");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 새 Vercel 프로젝트를 생성한다.
   *
   * @param params - 프로젝트 생성 파라미터
   * @returns 생성된 프로젝트의 ID와 이름
   */
  async createProject(
    params: CreateProjectParams
  ): Promise<{ id: string; name: string }> {
    const body: Record<string, unknown> = {
      name: params.name,
      framework: params.framework,
    };

    if (params.gitRepository) {
      body.gitRepository = params.gitRepository;
    }

    if (params.environmentVariables && params.environmentVariables.length > 0) {
      body.environmentVariables = params.environmentVariables.map((env) => ({
        key: env.key,
        value: env.value,
        target: env.target,
        type: "encrypted",
      }));
    }

    const result = await this.request<{ id: string; name: string }>(
      "POST",
      "/v10/projects",
      body
    );

    return { id: result.id, name: result.name };
  }

  /**
   * Git 소스 기반 배포를 생성한다.
   *
   * @param params - 배포 생성 파라미터
   * @returns 배포 ID, URL, 상태
   */
  async createDeployment(
    params: CreateDeploymentParams
  ): Promise<{ id: string; url: string; readyState: string }> {
    const body: Record<string, unknown> = {
      name: params.projectId,
      target: params.target,
    };

    if (params.gitSource) {
      body.gitSource = {
        ref: params.gitSource.ref,
        repoId: params.gitSource.repoId,
        type: "github",
      };
    } else if (params.files && params.files.length > 0) {
      // 파일 업로드 기반 배포 (Git 저장소 없을 때)
      body.files = params.files.map((f) => ({
        file: f.file,
        data: Buffer.from(f.data, "utf-8").toString("base64"),
        encoding: "base64",
      }));
      // 정적 사이트 빌드 설정
      body.projectSettings = {
        framework: null,
        buildCommand: "",
        outputDirectory: ".",
      };
    }

    const result = await this.request<{
      id: string;
      url: string;
      readyState: string;
    }>("POST", "/v13/deployments", body);

    return {
      id: result.id,
      url: result.url,
      readyState: result.readyState,
    };
  }

  /**
   * 배포에 서브도메인 별칭(alias)을 설정한다.
   *
   * @param deploymentId - 대상 배포 ID
   * @param alias - 설정할 별칭 도메인 (예: "gangnam-interior.waide.kr")
   */
  async setAlias(deploymentId: string, alias: string): Promise<void> {
    await this.request<unknown>("POST", `/v2/deployments/${deploymentId}/aliases`, {
      alias,
    });
  }

  /**
   * 프로젝트에 도메인을 추가한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param domain - 추가할 도메인 (예: "gangnam-interior.waide.kr")
   */
  async addDomain(
    projectId: string,
    domain: string
  ): Promise<{ name: string; verified: boolean }> {
    const result = await this.request<{ name: string; verified: boolean }>(
      "POST",
      `/v10/projects/${projectId}/domains`,
      { name: domain }
    );
    return result;
  }

  /**
   * 프로젝트의 도메인을 삭제한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param domain - 삭제할 도메인
   */
  async removeDomain(projectId: string, domain: string): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/v9/projects/${projectId}/domains/${domain}`
    );
  }

  /**
   * 프로젝트에 환경변수를 설정한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param vars - 환경변수 목록
   */
  async setEnvVars(projectId: string, vars: EnvVar[]): Promise<void> {
    // 기존 환경변수 조회
    const existing = await this.request<{
      envs: Array<{ id: string; key: string }>;
    }>("GET", `/v9/projects/${projectId}/env`);

    for (const envVar of vars) {
      const existingVar = existing.envs.find((e) => e.key === envVar.key);

      if (existingVar) {
        // 기존 변수 업데이트
        await this.request<unknown>(
          "PATCH",
          `/v9/projects/${projectId}/env/${existingVar.id}`,
          {
            value: envVar.value,
            target: envVar.target,
            type: "encrypted",
          }
        );
      } else {
        // 새 변수 생성
        await this.request<unknown>(
          "POST",
          `/v10/projects/${projectId}/env`,
          {
            key: envVar.key,
            value: envVar.value,
            target: envVar.target,
            type: "encrypted",
          }
        );
      }
    }
  }

  /**
   * 배포 상태를 조회한다.
   *
   * @param deploymentId - 조회할 배포 ID
   * @returns 배포 상태, URL, 생성 시각
   */
  async getDeployment(deploymentId: string): Promise<DeploymentInfo> {
    const result = await this.request<{
      id: string;
      url: string;
      readyState: string;
      createdAt: number;
    }>("GET", `/v13/deployments/${deploymentId}`);

    return {
      id: result.id,
      url: result.url,
      readyState: result.readyState,
      createdAt: result.createdAt,
    };
  }

  /**
   * 프로젝트의 배포 목록을 조회한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param limit - 조회할 배포 수 (기본값: 10)
   * @returns 배포 목록
   */
  async listDeployments(
    projectId: string,
    limit: number = 10
  ): Promise<DeploymentInfo[]> {
    const result = await this.request<{
      deployments: Array<{
        uid: string;
        url: string;
        readyState: string;
        createdAt: number;
      }>;
    }>("GET", `/v6/deployments?projectId=${projectId}&limit=${limit}`);

    return result.deployments.map((d) => ({
      id: d.uid,
      url: d.url,
      readyState: d.readyState,
      createdAt: d.createdAt,
    }));
  }

  /**
   * 기존 배포를 재배포한다.
   *
   * @param deploymentId - 재배포할 배포 ID
   * @returns 새 배포 ID와 URL
   */
  async redeploy(
    deploymentId: string
  ): Promise<{ id: string; url: string }> {
    const result = await this.request<{ id: string; url: string }>(
      "POST",
      `/v13/deployments`,
      {
        deploymentId,
        target: "production",
      }
    );

    return { id: result.id, url: result.url };
  }

  /**
   * 특정 배포를 프로덕션으로 프로모트한다.
   *
   * @param projectId - 대상 프로젝트 ID
   * @param deploymentId - 프로모트할 배포 ID
   */
  async promoteToProduction(
    projectId: string,
    deploymentId: string
  ): Promise<void> {
    // 프로덕션 프로모트: 해당 배포의 URL을 프로젝트 도메인에 연결
    const deployment = await this.getDeployment(deploymentId);
    await this.request<unknown>(
      "POST",
      `/v2/deployments/${deploymentId}/aliases`,
      { alias: deployment.url }
    );
  }

  /**
   * 빌드 로그를 조회한다.
   *
   * @param deploymentId - 대상 배포 ID
   * @returns 빌드 로그 라인 배열
   */
  async getBuildLogs(
    deploymentId: string
  ): Promise<Array<{ timestamp: number; text: string }>> {
    const result = await this.request<
      Array<{ id: string; created: number; text: string }>
    >("GET", `/v2/deployments/${deploymentId}/events`);

    if (!Array.isArray(result)) {
      return [];
    }

    return result.map((log) => ({
      timestamp: log.created,
      text: log.text,
    }));
  }

  /**
   * Vercel 프로젝트를 삭제한다.
   *
   * @param projectId - 삭제할 프로젝트 ID
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.request<unknown>("DELETE", `/v9/projects/${projectId}`);
  }
}
