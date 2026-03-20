/**
 * 홈페이지 프로젝트 배포 스크립트
 * Usage: npx tsx scripts/deploy-homepage.ts <projectId>
 */
import { createClient } from "@supabase/supabase-js";
import { VercelClient } from "../lib/homepage/deploy/vercel-client";
import { DeployManager } from "../lib/homepage/deploy/deploy-manager";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function main() {
  const projectId = process.argv[2] || "89676246-f6ba-4296-89a9-051f339fd98c";

  console.log("=== 홈페이지 배포 시작 ===");
  console.log(`프로젝트 ID: ${projectId}`);

  // 환경변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE 환경변수 누락");
    process.exit(1);
  }
  if (!vercelToken || !vercelTeamId) {
    console.error("VERCEL_TOKEN 또는 VERCEL_TEAM_ID 누락");
    process.exit(1);
  }

  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Vercel Team: ${vercelTeamId}`);

  // 1. Supabase 클라이언트
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 2. 프로젝트 확인
  const { data: project, error: projError } = await supabase
    .from("homepage_projects")
    .select("id, project_name, client_id, status, subdomain, vercel_project_id, theme_config")
    .eq("id", projectId)
    .single();

  if (projError || !project) {
    console.error("프로젝트 조회 실패:", projError?.message);
    process.exit(1);
  }

  console.log(`프로젝트명: ${project.project_name}`);
  console.log(`현재 상태: ${project.status}`);
  console.log(`기존 서브도메인: ${project.subdomain || "(없음)"}`);
  console.log(`기존 Vercel ID: ${project.vercel_project_id || "(없음)"}`);

  const tc = project.theme_config as Record<string, unknown> | null;
  const hasHtml = !!(tc?.generated_html);
  console.log(`generated_html 존재: ${hasHtml}`);

  if (!hasHtml) {
    console.error("generated_html이 없습니다. 먼저 홈페이지를 생성하세요.");
    process.exit(1);
  }

  // 3. Vercel 클라이언트 + DeployManager
  const vercel = new VercelClient({ token: vercelToken, teamId: vercelTeamId });
  const deployManager = new DeployManager(vercel, supabase);

  // 4. 배포 실행
  console.log("\n배포 진행 중...");
  try {
    const result = await deployManager.deployProject(projectId);
    console.log("\n=== 배포 완료 ===");
    console.log(`배포 URL: ${result.deploymentUrl}`);
    console.log(`서브도메인: ${result.subdomain}`);
    console.log(`Deployment ID: ${result.deploymentId}`);
    console.log(`Vercel Project ID: ${result.vercelProjectId}`);
  } catch (error) {
    console.error("\n배포 실패:", (error as Error).message);

    // 상세 에러 출력
    if (error instanceof Error && error.stack) {
      console.error("\nStack:", error.stack);
    }
    process.exit(1);
  }
}

main();
