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
  try {
    // 권한 체크: super_admin 또는 admin
    const session = await getAdminSession();
    if (!session || !["super_admin", "admin"].includes(session.role)) {
      return { success: false, error: "어드민만 홈페이지를 생성할 수 있습니다." };
    }

    const supabase = createAdminClient();
    const generator = new HomepageGenerator(supabase);
    const result = await generator.generate(input);

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
