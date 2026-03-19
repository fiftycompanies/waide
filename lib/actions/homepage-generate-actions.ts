"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/auth/admin-session";
import { revalidatePath } from "next/cache";
import {
  HomepageGenerator,
  type GenerateInput,
  type GenerateResult,
} from "@/lib/homepage/generate/homepage-generator";

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * AI 홈페이지 생성 파이프라인 실행
 * super_admin만 접근 가능
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
    return { success: false, error: `인증 확인 실패: ${authErr instanceof Error ? authErr.message : "unknown"}` };
  }

  if (!session) {
    return { success: false, error: "로그인이 필요합니다. 다시 로그인해주세요." };
  }
  if (!["super_admin", "admin"].includes(session.role)) {
    return { success: false, error: `권한 부족: 현재 역할(${session.role})로는 홈페이지를 생성할 수 없습니다.` };
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
    const generator = new HomepageGenerator(supabase);
    const result = await generator.generate(normalizedInput);

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
