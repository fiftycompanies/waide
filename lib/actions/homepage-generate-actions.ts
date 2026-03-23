"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/auth/admin-session";
import { revalidatePath } from "next/cache";
import {
  HomepageGenerator,
  type GenerateInput,
  type GenerateResult,
} from "@/lib/homepage/generate/homepage-generator";
import { HomepageScreenshotGenerator } from "@/lib/homepage/generate/homepage-screenshot-generator";

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * AI 홈페이지 생성 파이프라인 실행
 * super_admin 또는 admin만 접근 가능
 */
export async function generateHomepage(
  input: GenerateInput
): Promise<ActionResult<GenerateResult>> {
  // 권한 체크: super_admin 또는 admin
  let session;
  try {
    session = await getAdminSession();
  } catch (authErr) {
    console.error("[homepage-generate] getAdminSession 에러:", authErr);
    return { success: false, error: `[AUTH_EXCEPTION] 인증 확인 중 에러: ${authErr instanceof Error ? authErr.message : "unknown"}` };
  }

  if (!session) {
    return { success: false, error: "[AUTH_NULL] 세션이 없습니다. 다시 로그인해주세요. (HMAC 쿠키 또는 Supabase Auth 세션 필요)" };
  }
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: `[AUTH_ROLE] 권한 부족: 현재 역할(${session.role})로는 홈페이지를 생성할 수 없습니다.` };
  }

  // 환경변수 사전 체크
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "[ENV] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." };
  }
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_TEAM_ID) {
    return { success: false, error: "[ENV] VERCEL_TOKEN 또는 VERCEL_TEAM_ID가 설정되지 않았습니다. Vercel Dashboard에서 환경변수를 추가해주세요." };
  }

  try {
    // referenceUrl → referenceUrls 하위 호환 정규화
    const normalizedInput: GenerateInput = {
      ...input,
      referenceUrls: input.referenceUrls?.length
        ? input.referenceUrls
        : input.referenceUrl
          ? [input.referenceUrl]
          : [],
    };

    const supabase = createAdminClient();

    let result: GenerateResult;

    if (normalizedInput.generationMethod === "screenshot-to-code" && normalizedInput.referenceUrls.length > 0) {
      // Screenshot-to-Code: Vision AI가 스크린샷 기반으로 새 HTML 생성
      const screenshotGenerator = new HomepageScreenshotGenerator(supabase);
      result = await screenshotGenerator.generate(normalizedInput);
    } else {
      // 기존 분기: 템플릿 기반 생성 vs DOM 복제
      const generator = new HomepageGenerator(supabase);
      result = normalizedInput.templateName
        ? await generator.generateFromTemplate(normalizedInput)
        : await generator.generate(normalizedInput);
    }

    revalidatePath("/homepage");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[homepage-generate] generateHomepage error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "홈페이지 생성에 실패했습니다.",
    };
  }
}
