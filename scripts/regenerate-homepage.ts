/**
 * 홈페이지 재생성 스크립트 (기존 프로젝트 삭제 후 재생성)
 * Usage: npx tsx scripts/regenerate-homepage.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// HomepageGenerator는 Next.js 모듈(@/lib 등)을 사용하므로 직접 import 불가
// 대신 핵심 로직을 인라인으로 구현

async function main() {
  const clientId = "7a0abbba-22d8-42c3-800e-c05c4a755bfb"; // 에버유의원
  const referenceUrl = "https://www.rest-clinic.com/";

  console.log("=== 홈페이지 재생성 ===");
  console.log(`Client ID: ${clientId}`);
  console.log(`Reference: ${referenceUrl}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE 환경변수 누락");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 기존 프로젝트 삭제
  console.log("\n1. 기존 프로젝트 삭제 중...");
  const { data: existing } = await supabase
    .from("homepage_projects")
    .select("id, project_name")
    .eq("client_id", clientId);

  if (existing && existing.length > 0) {
    for (const p of existing) {
      console.log(`  삭제: ${p.project_name} (${p.id})`);
      await supabase.from("homepage_projects").delete().eq("id", p.id);
    }
  } else {
    console.log("  기존 프로젝트 없음");
  }

  // 2. HomepageGenerator를 직접 호출할 수 없으므로 API 라우트를 통해 호출
  // 또는 서버 액션을 직접 사용
  console.log("\n2. 홈페이지 생성은 Next.js 서버에서 실행해야 합니다.");
  console.log("   다음 명령으로 dev 서버를 시작하고 UI에서 생성하세요:");
  console.log("   cd /Users/kk/Desktop/claude/waide-mkt/ai-marketer && npm run dev");
  console.log("\n   또는 API 엔드포인트를 통해 직접 호출:");
  console.log(`   curl -X POST http://localhost:3000/api/homepage/generate \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"clientId": "${clientId}", "referenceUrls": ["${referenceUrl}"]}'`);

  console.log("\n=== 기존 프로젝트 정리 완료 ===");
}

main();
