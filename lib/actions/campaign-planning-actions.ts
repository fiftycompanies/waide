"use server";

/**
 * campaign-planning-actions.ts
 * Phase PIPE-1: 캠페인 기획 화면용 서버 액션
 *
 * - AI 키워드 추천 (suggestKeywordsForClient)
 * - 수동 키워드 추가 (addManualKeyword)
 * - 활성 키워드 풀 조회 (getActiveKeywordPool)
 * - Suggested 키워드 목록 (getSuggestedKeywords)
 * - 콘텐츠 생성 지시 (triggerContentGeneration)
 *
 * ⚠️ createAdminClient() 사용
 * ⚠️ ANTHROPIC_API_KEY 없으면 graceful skip
 * ⚠️ 기존 액션(keyword-expansion-actions.ts 등)에 영향 없음
 */

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { canGenerateContent, spendPoints } from "./point-actions";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface SuggestedKeyword {
  id: string;
  keyword: string;
  status: string;
  reason: string | null;
  searchVolume: number | null;
  metadata: Record<string, unknown> | null;
}

export interface ActiveKeywordPoolItem {
  id: string;
  keyword: string;
  status: string;
  monthlySearchTotal: number | null;
  contentCount: number;
  currentRankNaver: number | null;
  currentRankGoogle: number | null;
  source: string | null;
}

// ═══════════════════════════════════════════
// AI 키워드 추천
// ═══════════════════════════════════════════

export async function suggestKeywordsForClient(
  clientId: string,
  count: number = 3
): Promise<{ success: boolean; keywords: SuggestedKeyword[]; error?: string }> {
  const db = createAdminClient();

  // 1. 클라이언트 + 브랜드 정보 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client, error: clientError } = await (db as any)
    .from("clients")
    .select("id, name, company_name, business_type, region, brand_persona, website_url")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { success: false, keywords: [], error: "클라이언트를 찾을 수 없습니다" };
  }

  // 2. 기존 키워드 조회 (중복 방지)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingKeywords } = await (db as any)
    .from("keywords")
    .select("keyword")
    .eq("client_id", clientId)
    .in("status", ["active", "suggested", "queued"]);

  const existingSet = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (existingKeywords ?? []).map((k: any) => k.keyword.toLowerCase())
  );

  // 3. ANTHROPIC_API_KEY 체크
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, keywords: [], error: "ANTHROPIC_API_KEY 미설정 — AI 추천 불가" };
  }

  // 4. AI 추천 요청
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persona = (client.brand_persona as Record<string, any>) || {};
    const businessType = persona.business_type || client.business_type || "로컬 비즈니스";
    const region = persona.region || client.region || "";
    const brandName = client.name || client.company_name || "";
    const targetAudience = persona.primary_target || persona.target_audience || "";
    const strengths = Array.isArray(persona.strengths) ? persona.strengths.join(", ") : "";
    const existingList = (existingKeywords ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((k: any) => k.keyword)
      .join(", ");

    const prompt = `당신은 SEO 키워드 전략가입니다. 아래 브랜드 정보를 기반으로 블로그 SEO 타겟 키워드 ${count}개를 추천해주세요.

브랜드명: ${brandName}
업종: ${businessType}
지역: ${region}
타겟 고객: ${targetAudience}
강점: ${strengths}

기존 키워드 (제외): ${existingList || "없음"}

다음 JSON 형식으로만 답해주세요:
{
  "keywords": [
    {
      "keyword": "키워드명",
      "reason": "추천 사유 한줄",
      "estimated_volume": null
    }
  ]
}

규칙:
- 롱테일 키워드 우선 (3~5단어)
- 지역명 + 업종 조합 포함
- 정보성/리뷰형 검색의도 키워드 포함
- 기존 키워드와 중복 금지
- estimated_volume은 추정 가능하면 숫자, 아니면 null`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return { success: false, keywords: [], error: `AI API 오류: ${response.status}` };
    }

    const aiResult = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (aiResult as any).content?.[0]?.text || "";

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, keywords: [], error: "AI 응답 파싱 실패" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suggestedKeywords: any[] = parsed.keywords || [];

    // 5. keywords 테이블에 INSERT (status='suggested')
    const inserted: SuggestedKeyword[] = [];
    const now = new Date().toISOString();

    for (const kw of suggestedKeywords) {
      if (!kw.keyword || existingSet.has(kw.keyword.toLowerCase())) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any)
        .from("keywords")
        .insert({
          client_id: clientId,
          keyword: kw.keyword,
          status: "suggested",
          source: "ai_suggestion",
          is_tracking: false,
          metadata: {
            suggestion_reason: kw.reason,
            estimated_volume: kw.estimated_volume,
            generated_by: "campaign_planning",
            generated_at: now,
          },
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (!error && data) {
        inserted.push({
          id: data.id,
          keyword: kw.keyword,
          status: "suggested",
          reason: kw.reason || null,
          searchVolume: kw.estimated_volume ? Number(kw.estimated_volume) : null,
          metadata: { suggestion_reason: kw.reason },
        });
        existingSet.add(kw.keyword.toLowerCase());
      }
    }

    revalidatePath("/campaigns");
    revalidatePath("/keywords");
    return { success: true, keywords: inserted };
  } catch (err) {
    return {
      success: false,
      keywords: [],
      error: err instanceof Error ? err.message : "AI 추천 실패",
    };
  }
}

// ═══════════════════════════════════════════
// 수동 키워드 추가
// ═══════════════════════════════════════════

export async function addManualKeyword(
  clientId: string,
  keyword: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = createAdminClient();
  const trimmed = keyword.trim();
  if (!trimmed) return { success: false, error: "키워드를 입력하세요" };

  // 중복 체크
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("keywords")
    .select("id, status")
    .eq("client_id", clientId)
    .ilike("keyword", trimmed)
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      success: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: `"${trimmed}" 키워드가 이미 등록되어 있습니다 (상태: ${(existing[0] as any).status})`,
    };
  }

  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from("keywords")
    .insert({
      client_id: clientId,
      keyword: trimmed,
      status: "active",
      source: "manual",
      is_tracking: true,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // 질문 자동 생성 트리거 (비동기, 실패해도 키워드 등록은 유지)
  if (data?.id) {
    import("./question-actions").then(({ generateQuestions }) => {
      generateQuestions(data.id, clientId).catch((err: unknown) => {
        console.warn("[addManualKeyword] 질문 생성 실패:", err);
      });
    });
  }

  revalidatePath("/campaigns");
  revalidatePath("/keywords");
  return { success: true, id: data.id };
}

// ═══════════════════════════════════════════
// 활성 키워드 풀 (통합)
// ═══════════════════════════════════════════

export async function getActiveKeywordPool(
  clientId: string
): Promise<ActiveKeywordPoolItem[]> {
  const db = createAdminClient();

  // 활성 키워드 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: keywords } = await (db as any)
    .from("keywords")
    .select("id, keyword, status, monthly_search_total, current_rank_naver_pc, current_rank_google, source")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("priority_score", { ascending: false, nullsFirst: false });

  if (!keywords || keywords.length === 0) return [];

  // 키워드별 콘텐츠 수 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordIds = (keywords as any[]).map((k) => k.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contentRows } = await (db as any)
    .from("contents")
    .select("keyword_id")
    .eq("client_id", clientId)
    .in("keyword_id", keywordIds);

  const countMap: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (contentRows ?? []) as any[]) {
    countMap[c.keyword_id] = (countMap[c.keyword_id] || 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (keywords as any[]).map((k) => ({
    id: k.id,
    keyword: k.keyword,
    status: k.status,
    monthlySearchTotal: k.monthly_search_total,
    contentCount: countMap[k.id] || 0,
    currentRankNaver: k.current_rank_naver_pc,
    currentRankGoogle: k.current_rank_google,
    source: k.source,
  }));
}

// ═══════════════════════════════════════════
// Suggested 키워드 목록
// ═══════════════════════════════════════════

export async function getSuggestedKeywords(
  clientId: string
): Promise<SuggestedKeyword[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("keywords")
    .select("id, keyword, status, monthly_search_total, metadata")
    .eq("client_id", clientId)
    .eq("status", "suggested")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((k) => ({
    id: k.id,
    keyword: k.keyword,
    status: k.status,
    reason: k.metadata?.suggestion_reason || k.metadata?.content_angle || null,
    searchVolume: k.monthly_search_total || (k.metadata?.estimated_volume ? Number(k.metadata.estimated_volume) : null),
    metadata: k.metadata,
  }));
}

// ═══════════════════════════════════════════
// 콘텐츠 생성 지시 (Jobs INSERT)
// ═══════════════════════════════════════════

export async function triggerContentGeneration(params: {
  clientId: string;
  keywordId: string;
  keywordText: string;
  referenceContentIds?: string[];
  additionalNotes?: string;
  contentType?: string;
  role?: string;
}): Promise<{ success: boolean; jobId?: string; error?: string; pointError?: boolean }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // 0. 역할별 포인트 체크
  const role = params.role || "admin";
  if (role !== "super_admin" && role !== "admin") {
    const pointCheck = await canGenerateContent(role, params.clientId);
    if (!pointCheck.allowed) {
      return { success: false, error: pointCheck.error, pointError: true };
    }
    // 포인트 차감
    const spendResult = await spendPoints(params.clientId, null);
    if (!spendResult.success) {
      return { success: false, error: spendResult.error, pointError: true };
    }
  }

  // 1. 키워드 검증 (해당 client의 활성 키워드인지)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: keyword, error: kwError } = await (db as any)
    .from("keywords")
    .select("id, keyword, client_id, status")
    .eq("id", params.keywordId)
    .eq("client_id", params.clientId)
    .single();

  if (kwError || !keyword) {
    return { success: false, error: "해당 키워드를 찾을 수 없습니다" };
  }

  if (keyword.status !== "active") {
    return { success: false, error: `키워드 상태가 '${keyword.status}'입니다. 활성(active) 상태여야 콘텐츠를 생성할 수 있습니다.` };
  }

  // 2. jobs INSERT (CONTENT_CREATE → processContentJobs()에서 처리)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job, error: jobError } = await (db as any)
    .from("jobs")
    .insert({
      client_id: params.clientId,
      assigned_agent: "COPYWRITER",
      job_type: "CONTENT_CREATE",
      status: "PENDING",
      title: `[콘텐츠 생성] ${params.keywordText}`,
      trigger_type: "USER",
      triggered_by: "SYSTEM",
      priority: "high",
      input_payload: {
        keyword: params.keywordText,
        keyword_id: params.keywordId,
        content_type: params.contentType || "list",
        style_ref_ids: params.referenceContentIds || [],
        additional_notes: params.additionalNotes || "",
      },
      retry_count: 0,
      updated_at: now,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { success: false, error: jobError?.message || "Job 생성 실패" };
  }

  revalidatePath("/ops/jobs");
  revalidatePath("/campaigns/plan");
  return { success: true, jobId: job.id };
}
