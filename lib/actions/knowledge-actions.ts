"use server";

/**
 * knowledge-actions.ts
 * Phase 7-10: 진화지식 학습 실행 + 조회
 *
 * 콘텐츠 성과 + AEO Score + SERP 순위 데이터를 분석하여
 * 패턴을 자동 추출하고 evolving_knowledge 테이블에 저장
 */

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export interface KnowledgeLearningResult {
  success: boolean;
  patternsFound: number;
  error?: string;
}

/**
 * AI 학습 실행 — 성과 데이터 기반 패턴 분석
 */
export async function runKnowledgeLearning(
  clientId?: string,
): Promise<KnowledgeLearningResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, patternsFound: 0, error: "ANTHROPIC_API_KEY 미설정" };
  }

  const db = createAdminClient();

  try {
    // 1. 발행된 콘텐츠 + 메타데이터 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contentsQuery = (db as any)
      .from("contents")
      .select("id, title, keyword, content_type, publish_status, metadata, published_url, created_at")
      .in("publish_status", ["published", "approved"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (clientId) {
      contentsQuery = contentsQuery.eq("client_id", clientId);
    }

    const { data: contents } = await contentsQuery;

    // 2. AEO 점수 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aeoQuery = (db as any)
      .from("aeo_scores")
      .select("client_id, score, model_scores, period_start, period_end")
      .order("period_end", { ascending: false })
      .limit(20);

    if (clientId) {
      aeoQuery = aeoQuery.eq("client_id", clientId);
    }

    const { data: aeoScores } = await aeoQuery;

    // 3. 멘션 데이터
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mentionsQuery = (db as any)
      .from("mentions")
      .select("brand, is_target, position, sentiment, ai_model, created_at")
      .eq("is_target", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (clientId) {
      mentionsQuery = mentionsQuery.eq("client_id", clientId);
    }

    const { data: mentions } = await mentionsQuery;

    // 4. SERP 순위
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let serpQuery = (db as any)
      .from("keyword_visibility")
      .select("keyword_id, rank_pc, rank_mo, rank_google, visibility_score, measured_at")
      .order("measured_at", { ascending: false })
      .limit(100);

    if (clientId) {
      serpQuery = serpQuery.eq("client_id", clientId);
    }

    const { data: serpData } = await serpQuery;

    // 데이터 부족하면 skip
    const totalDataPoints = (contents?.length || 0) + (aeoScores?.length || 0) + (mentions?.length || 0) + (serpData?.length || 0);
    if (totalDataPoints < 5) {
      return { success: true, patternsFound: 0, error: "데이터가 부족합니다 (최소 5건 이상 필요)" };
    }

    // 5. AI 패턴 분석
    const prompt = `다음 마케팅 성과 데이터를 분석하여 재사용 가능한 패턴/인사이트를 추출해.

## 콘텐츠 (${contents?.length || 0}건)
${JSON.stringify((contents || []).slice(0, 20).map((c: { title: string; keyword: string; content_type: string; publish_status: string; metadata: { qc_score?: number } }) => ({
  title: c.title,
  keyword: c.keyword,
  type: c.content_type,
  status: c.publish_status,
  qc_score: c.metadata?.qc_score,
})), null, 2)}

## AEO 점수 (${aeoScores?.length || 0}건)
${JSON.stringify((aeoScores || []).slice(0, 10), null, 2)}

## 멘션 (${mentions?.length || 0}건)
${JSON.stringify((mentions || []).slice(0, 20).map((m: { ai_model: string; position: number | null; sentiment: string }) => ({
  model: m.ai_model,
  position: m.position,
  sentiment: m.sentiment,
})), null, 2)}

## SERP 순위 (${serpData?.length || 0}건)
${JSON.stringify((serpData || []).slice(0, 20).map((s: { rank_pc: number | null; rank_google: number | null; visibility_score: number | null }) => ({
  rank_naver: s.rank_pc,
  rank_google: s.rank_google,
  visibility: s.visibility_score,
})), null, 2)}

다음 유형의 패턴을 찾아:
1. content_pattern: 콘텐츠 유형/구조와 성과 관계
2. keyword_insight: 키워드 특성과 순위 관계
3. aeo_pattern: AEO 성과 패턴 (모델별, 콘텐츠 유형별)
4. style_transfer: 스타일/톤과 성과 관계
5. general: 기타 종합 인사이트

JSON 배열로만 출력 (최대 5개):
[{
  "title": "패턴 제목",
  "description": "패턴 설명 (2-3줄)",
  "knowledge_type": "content_pattern|keyword_insight|aeo_pattern|style_transfer|general",
  "confidence": 0.5~1.0,
  "evidence": {"근거 데이터": "값"}
}]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return { success: false, patternsFound: 0, error: `AI API 오류: ${response.status}` };
    }

    const result = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (result as any).content?.[0]?.text || "[]";

    // JSON 파싱
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: false, patternsFound: 0, error: "AI 응답 파싱 실패" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patterns: any[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return { success: true, patternsFound: 0 };
    }

    // 6. evolving_knowledge INSERT
    let insertCount = 0;
    for (const p of patterns.slice(0, 5)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any)
        .from("evolving_knowledge")
        .insert({
          client_id: clientId || null,
          agent_type: "SYSTEM",
          hypothesis: p.title || "패턴",
          action: p.description || "",
          outcome: null,
          verdict: "pending",
          tags: [p.knowledge_type || "general"],
          // Phase 7-10 확장 컬럼
          knowledge_type: p.knowledge_type || "general",
          title: p.title || "패턴",
          description: p.description || "",
          evidence: p.evidence || {},
          confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
          is_active: true,
          learned_at: new Date().toISOString(),
        });

      if (!error) insertCount++;
    }

    revalidatePath("/ops/agent-settings");
    revalidatePath("/dashboard");
    return { success: true, patternsFound: insertCount };
  } catch (err) {
    console.error("[knowledge-actions] runKnowledgeLearning error:", err);
    return {
      success: false,
      patternsFound: 0,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    };
  }
}

/**
 * 진화지식 통계 (대시보드용)
 */
export async function getKnowledgeStats(clientId?: string): Promise<{
  total: number;
  byType: Record<string, number>;
  lastLearned: string | null;
  styleTransferCount: number;
}> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from("evolving_knowledge")
    .select("id, knowledge_type, tags, learned_at, created_at")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data } = await query;
  const records = (data || []) as { id: string; knowledge_type?: string; tags?: string[]; learned_at?: string; created_at: string }[];

  const byType: Record<string, number> = {};
  for (const r of records) {
    const type = r.knowledge_type || "general";
    byType[type] = (byType[type] || 0) + 1;
  }

  return {
    total: records.length,
    byType,
    lastLearned: records.length > 0 ? records[0].created_at : null,
    styleTransferCount: byType["style_transfer"] || 0,
  };
}
