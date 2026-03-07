"use server";

/**
 * question-actions.ts
 * Phase 3: Question Engine 서버 액션
 *
 * - generateQuestions: 키워드 → 질문 20~30개 자동 생성 (3소스 병렬)
 * - getQuestions: 질문 목록 조회
 * - addManualQuestion: 질문 직접 추가
 * - updateQuestion: 질문 수정
 * - deleteQuestion: 질문 삭제
 * - regenerateQuestions: 키워드 질문 재생성
 * - generateAEOContents: 선별 질문 → AEO 콘텐츠 생성
 */

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { spendPoints, canGenerateContent } from "./point-actions";
import { loadPromptTemplate, fillPromptTemplate } from "@/lib/prompt-loader";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface Question {
  id: string;
  keyword_id: string;
  keyword_text?: string;
  client_id: string;
  question: string;
  intent: string | null;
  source: "llm" | "paa" | "naver" | "manual";
  language: string;
  is_selected: boolean;
  content_id: string | null;
  content_status?: string | null;
  created_at: string;
}

interface GeneratedQuestion {
  question: string;
  intent: string;
}

// ═══════════════════════════════════════════
// 소스 1: Claude API (15~20개)
// ═══════════════════════════════════════════

async function generateQuestionsFromLLM(
  keyword: string,
  category: string,
  location: string
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const template = await loadPromptTemplate("question_engine");
    const prompt = fillPromptTemplate(template, {
      keyword,
      category: category || "로컬 비즈니스",
      location: location || "",
    });

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

    if (!response.ok) return [];

    const result = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (result as any).content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]) as GeneratedQuestion[];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// 소스 2: Google PAA (Serper API)
// ═══════════════════════════════════════════

async function getGooglePAA(keyword: string): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        gl: "kr",
        hl: "ko",
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paa = (data as any).peopleAlsoAsk || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return paa.map((item: any) => ({
      question: item.question || item.title || "",
      intent: "general",
    })).filter((q: GeneratedQuestion) => q.question);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// 소스 3: 네이버 자동완성
// ═══════════════════════════════════════════

async function getNaverAutocomplete(
  keyword: string
): Promise<GeneratedQuestion[]> {
  try {
    const encoded = encodeURIComponent(keyword);
    const response = await fetch(
      `https://ac.search.naver.com/nx/ac?q=${encoded}&con=1&frm=nv&ans=2`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: string[] = ((data as any).items || [])
      .flat()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((item: any) => typeof item === "string" || Array.isArray(item))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => (Array.isArray(item) ? item[0] : item))
      .filter((s: string) => s && s.length > 2);

    // 자동완성 키워드를 질문형으로 변환
    return items.slice(0, 7).map((item: string) => {
      let question = item;
      // 이미 질문형이면 그대로
      if (!question.endsWith("?") && !question.includes("추천") && !question.includes("어디")) {
        question = `${item} 추천해줘`;
      } else if (question.includes("추천") && !question.endsWith("?") && !question.endsWith("줘")) {
        question = `${item} 알려줘`;
      }
      return { question, intent: "general" };
    });
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════
// 중복 제거
// ═══════════════════════════════════════════

function deduplicateQuestions(
  questions: Array<{ question: string; intent: string; source: string }>
): Array<{ question: string; intent: string; source: string }> {
  const seen = new Set<string>();
  const result: Array<{ question: string; intent: string; source: string }> = [];

  for (const q of questions) {
    const normalized = q.question
      .toLowerCase()
      .replace(/[?？！!~\s]/g, "")
      .trim();

    if (normalized.length < 3) continue;
    if (seen.has(normalized)) continue;

    // 포함 관계 체크
    let isDuplicate = false;
    for (const existing of seen) {
      if (
        normalized.includes(existing) && normalized.length - existing.length < 5 ||
        existing.includes(normalized) && existing.length - normalized.length < 5
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      result.push(q);
    }
  }

  return result;
}

// ═══════════════════════════════════════════
// 5-1. 질문 생성 메인 함수
// ═══════════════════════════════════════════

export async function generateQuestions(
  keywordId: string,
  clientId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const db = createAdminClient();

    // 키워드 데이터 로드
    const { data: keyword } = await db
      .from("keywords")
      .select("keyword, metadata")
      .eq("id", keywordId)
      .single();

    if (!keyword) {
      return { success: false, count: 0, error: "키워드를 찾을 수 없습니다" };
    }

    // 클라이언트 데이터 로드 (업종, 지역)
    const { data: client } = await db
      .from("clients")
      .select("name, brand_persona")
      .eq("id", clientId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persona = (client?.brand_persona as any) || {};
    const category = persona.category || "";
    const location = persona.region || "";

    // 이미 질문이 있는지 확인
    const { count: existingCount } = await db
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("keyword_id", keywordId)
      .eq("client_id", clientId);

    if ((existingCount ?? 0) > 0) {
      return { success: true, count: 0 }; // skip
    }

    // 3개 소스 병렬 호출
    const [llmQuestions, paaQuestions, naverQuestions] = await Promise.allSettled([
      generateQuestionsFromLLM(keyword.keyword, category, location),
      getGooglePAA(keyword.keyword),
      getNaverAutocomplete(keyword.keyword),
    ]);

    // 결과 합침
    const allQuestions: Array<{ question: string; intent: string; source: string }> = [];

    if (llmQuestions.status === "fulfilled") {
      for (const q of llmQuestions.value) {
        allQuestions.push({ ...q, source: "llm" });
      }
    }
    if (paaQuestions.status === "fulfilled") {
      for (const q of paaQuestions.value) {
        allQuestions.push({ ...q, source: "paa" });
      }
    }
    if (naverQuestions.status === "fulfilled") {
      for (const q of naverQuestions.value) {
        allQuestions.push({ ...q, source: "naver" });
      }
    }

    // 중복 제거
    const uniqueQuestions = deduplicateQuestions(allQuestions);

    if (uniqueQuestions.length === 0) {
      return { success: true, count: 0 };
    }

    // questions 테이블에 INSERT
    const now = new Date().toISOString();
    const rows = uniqueQuestions.map((q) => ({
      keyword_id: keywordId,
      client_id: clientId,
      question: q.question,
      intent: q.intent || "general",
      source: q.source as "llm" | "paa" | "naver" | "manual",
      language: "ko",
      is_selected: false,
      created_at: now,
      updated_at: now,
    }));

    const { error } = await db.from("questions").insert(rows);

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    revalidatePath("/keywords");
    return { success: true, count: rows.length };
  } catch (e) {
    return { success: false, count: 0, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// 질문 목록 조회
// ═══════════════════════════════════════════

export async function getQuestions(
  clientId: string,
  filters?: {
    keywordId?: string;
    source?: string;
  }
): Promise<Question[]> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = db
    .from("questions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (filters?.keywordId) {
    query = query.eq("keyword_id", filters.keywordId);
  }
  if (filters?.source) {
    query = query.eq("source", filters.source);
  }

  const { data } = await query;
  if (!data || data.length === 0) return [];

  // 키워드 텍스트 조회
  const keywordIds = [...new Set((data as Array<{ keyword_id: string }>).map((q) => q.keyword_id))];
  const { data: keywords } = await db
    .from("keywords")
    .select("id, keyword")
    .in("id", keywordIds);

  const kwMap: Record<string, string> = {};
  for (const kw of (keywords ?? []) as Array<{ id: string; keyword: string }>) {
    kwMap[kw.id] = kw.keyword;
  }

  // 콘텐츠 상태 조회
  const contentIds = (data as Array<{ content_id: string | null }>)
    .map((q) => q.content_id)
    .filter(Boolean) as string[];
  const contentStatusMap: Record<string, string> = {};
  if (contentIds.length > 0) {
    const { data: contents } = await db
      .from("contents")
      .select("id, publish_status")
      .in("id", contentIds);
    for (const c of (contents ?? []) as Array<{ id: string; publish_status: string }>) {
      contentStatusMap[c.id] = c.publish_status;
    }
  }

  return (data as Array<{
    id: string;
    keyword_id: string;
    client_id: string;
    question: string;
    intent: string | null;
    source: "llm" | "paa" | "naver" | "manual";
    language: string;
    is_selected: boolean;
    content_id: string | null;
    created_at: string;
  }>).map((q) => ({
    ...q,
    keyword_text: kwMap[q.keyword_id] || "",
    content_status: q.content_id ? contentStatusMap[q.content_id] || null : null,
  }));
}

// ═══════════════════════════════════════════
// 질문 직접 추가
// ═══════════════════════════════════════════

export async function addManualQuestion(
  keywordId: string,
  clientId: string,
  questionText: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  // AI로 intent 태깅
  let intent = "general";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 50,
          messages: [{
            role: "user",
            content: `다음 질문의 의도를 한 단어로 분류해. 선택지: recommendation, comparison, price, review, timing, feature, general\n질문: ${questionText}\n답: `,
          }],
        }),
      });
      if (resp.ok) {
        const r = await resp.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = ((r as any).content?.[0]?.text || "").trim().toLowerCase();
        if (["recommendation", "comparison", "price", "review", "timing", "feature", "general"].includes(t)) {
          intent = t;
        }
      }
    } catch {
      // ignore
    }
  }

  const { error } = await db.from("questions").insert({
    keyword_id: keywordId,
    client_id: clientId,
    question: questionText.trim(),
    intent,
    source: "manual",
    language: "ko",
    is_selected: false,
    created_at: now,
    updated_at: now,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/keywords");
  return { success: true };
}

// ═══════════════════════════════════════════
// 질문 수정
// ═══════════════════════════════════════════

export async function updateQuestion(
  questionId: string,
  updates: { question?: string; intent?: string }
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await db
    .from("questions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/keywords");
  return { success: true };
}

// ═══════════════════════════════════════════
// 질문 삭제
// ═══════════════════════════════════════════

export async function deleteQuestion(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  // content_id 연결된 질문은 삭제 불가
  const { data: q } = await db
    .from("questions")
    .select("content_id")
    .eq("id", questionId)
    .single();

  if (q?.content_id) {
    return { success: false, error: "콘텐츠가 연결된 질문은 삭제할 수 없습니다" };
  }

  const { error } = await db.from("questions").delete().eq("id", questionId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/keywords");
  return { success: true };
}

// ═══════════════════════════════════════════
// 질문 재생성
// ═══════════════════════════════════════════

export async function regenerateQuestions(
  keywordId: string,
  clientId: string,
  mode: "append" | "replace"
): Promise<{ success: boolean; count: number; error?: string }> {
  const db = createAdminClient();

  if (mode === "replace") {
    // content_id 연결된 질문은 유지
    await db
      .from("questions")
      .delete()
      .eq("keyword_id", keywordId)
      .eq("client_id", clientId)
      .is("content_id", null);
  }

  // 기존 질문 삭제 후 재생성할 수 있도록 count 무시
  const { data: existing } = await db
    .from("questions")
    .select("question")
    .eq("keyword_id", keywordId)
    .eq("client_id", clientId);

  // 기존 질문이 없으면 바로 생성
  if (!existing || existing.length === 0 || mode === "replace") {
    // replace 모드면 이미 삭제했으므로 바로 생성
    return generateQuestionsForce(keywordId, clientId);
  }

  // append 모드: 기존 유지 + 추가 생성
  return generateQuestionsForce(keywordId, clientId);
}

async function generateQuestionsForce(
  keywordId: string,
  clientId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const db = createAdminClient();

  const { data: keyword } = await db
    .from("keywords")
    .select("keyword")
    .eq("id", keywordId)
    .single();

  if (!keyword) return { success: false, count: 0, error: "키워드를 찾을 수 없습니다" };

  const { data: client } = await db
    .from("clients")
    .select("name, brand_persona")
    .eq("id", clientId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persona = (client?.brand_persona as any) || {};

  const [llmQ, paaQ, naverQ] = await Promise.allSettled([
    generateQuestionsFromLLM(keyword.keyword, persona.category || "", persona.region || ""),
    getGooglePAA(keyword.keyword),
    getNaverAutocomplete(keyword.keyword),
  ]);

  const all: Array<{ question: string; intent: string; source: string }> = [];
  if (llmQ.status === "fulfilled") llmQ.value.forEach((q) => all.push({ ...q, source: "llm" }));
  if (paaQ.status === "fulfilled") paaQ.value.forEach((q) => all.push({ ...q, source: "paa" }));
  if (naverQ.status === "fulfilled") naverQ.value.forEach((q) => all.push({ ...q, source: "naver" }));

  // 기존 질문과도 중복 제거
  const { data: existingQ } = await db
    .from("questions")
    .select("question")
    .eq("keyword_id", keywordId)
    .eq("client_id", clientId);

  const existingSet = new Set(
    ((existingQ ?? []) as Array<{ question: string }>).map((q) =>
      q.question.toLowerCase().replace(/[?？！!~\s]/g, "")
    )
  );

  const unique = deduplicateQuestions(all).filter(
    (q) => !existingSet.has(q.question.toLowerCase().replace(/[?？！!~\s]/g, ""))
  );

  if (unique.length === 0) return { success: true, count: 0 };

  const now = new Date().toISOString();
  const rows = unique.map((q) => ({
    keyword_id: keywordId,
    client_id: clientId,
    question: q.question,
    intent: q.intent || "general",
    source: q.source as "llm" | "paa" | "naver" | "manual",
    language: "ko",
    is_selected: false,
    created_at: now,
    updated_at: now,
  }));

  await db.from("questions").insert(rows);

  revalidatePath("/keywords");
  return { success: true, count: rows.length };
}

// ═══════════════════════════════════════════
// 7-2. AEO 콘텐츠 자동 생성
// ═══════════════════════════════════════════

export async function generateAEOContents(
  questionIds: string[],
  clientId: string,
  role: string
): Promise<{ success: boolean; generated: number; error?: string }> {
  try {
    const db = createAdminClient();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, generated: 0, error: "ANTHROPIC_API_KEY 미설정" };
    }

    // 역할별 포인트 체크
    if (role !== "super_admin" && role !== "admin") {
      const check = await canGenerateContent(role, clientId);
      if (!check.allowed) {
        return { success: false, generated: 0, error: check.error };
      }
    }

    // 질문 데이터 로드
    const { data: questions } = await db
      .from("questions")
      .select("id, question, intent, keyword_id")
      .in("id", questionIds);

    if (!questions || questions.length === 0) {
      return { success: false, generated: 0, error: "선택된 질문이 없습니다" };
    }

    // 클라이언트 데이터
    const { data: client } = await db
      .from("clients")
      .select("name, brand_persona")
      .eq("id", clientId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persona = (client?.brand_persona as any) || {};
    const brandName = client?.name || "";
    const strengths = Array.isArray(persona.strengths) ? persona.strengths.join(", ") : "";
    const target = persona.target_customer || persona.target_audience || "";
    const location = persona.region || "";

    let generated = 0;

    for (const q of questions as Array<{
      id: string;
      question: string;
      intent: string | null;
      keyword_id: string;
    }>) {
      // 포인트 차감 (admin 제외)
      if (role !== "super_admin" && role !== "admin") {
        const spendResult = await spendPoints(clientId, null);
        if (!spendResult.success) {
          // 잔액 소진 — 여기서 중단
          break;
        }
      }

      try {
        // AI 유형 판단
        const contentType = await determineContentType(apiKey, q.question, q.intent || "general");

        // 콘텐츠 생성
        const body = await generateAEOContent(
          apiKey,
          q.question,
          contentType,
          brandName,
          strengths,
          target,
          location
        );

        if (!body) continue;

        // 제목 추출 (첫 번째 H1 또는 질문)
        const titleMatch = body.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1] : q.question;

        // contents INSERT
        const now = new Date().toISOString();
        const { data: content } = await db
          .from("contents")
          .insert({
            client_id: clientId,
            keyword_id: q.keyword_id,
            title,
            body,
            publish_status: "draft",
            generated_by: "ai",
            content_type: contentType,
            question_id: q.id,
            word_count: body.length,
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();

        if (content) {
          // questions UPDATE
          await db
            .from("questions")
            .update({
              is_selected: true,
              content_id: content.id,
              updated_at: now,
            })
            .eq("id", q.id);

          // 포인트 기록에 content_id 연결
          if (role !== "super_admin" && role !== "admin") {
            await db
              .from("point_transactions")
              .update({ content_id: content.id })
              .eq("client_id", clientId)
              .eq("type", "spend")
              .is("content_id", null)
              .order("created_at", { ascending: false })
              .limit(1);
          }

          generated++;
        }
      } catch (err) {
        console.error(`[generateAEOContents] 질문 "${q.question}" 생성 실패:`, err);
        continue;
      }
    }

    revalidatePath("/keywords");
    revalidatePath("/contents");
    return { success: true, generated };
  } catch (e) {
    return { success: false, generated: 0, error: String(e) };
  }
}

// ═══════════════════════════════════════════
// AI 유형 판단
// ═══════════════════════════════════════════

async function determineContentType(
  apiKey: string,
  question: string,
  intent: string
): Promise<"aeo_qa" | "aeo_list"> {
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: fillPromptTemplate(await loadPromptTemplate("aeo_type_judge"), {
            question,
            intent,
          }),
        }],
      }),
    });

    if (resp.ok) {
      const r = await resp.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = ((r as any).content?.[0]?.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.type === "aeo_list") return "aeo_list";
      }
    }
  } catch {
    // fallback
  }

  // fallback: intent 기반 판단
  if (intent === "recommendation" || intent === "comparison") return "aeo_list";
  return "aeo_qa";
}

// ═══════════════════════════════════════════
// AEO 콘텐츠 생성
// ═══════════════════════════════════════════

async function generateAEOContent(
  apiKey: string,
  question: string,
  contentType: "aeo_qa" | "aeo_list",
  brandName: string,
  strengths: string,
  target: string,
  location: string
): Promise<string | null> {
  const templateKey = contentType === "aeo_qa" ? "aeo_qa_writer" : "aeo_list_writer";
  const template = await loadPromptTemplate(templateKey);
  const prompt = fillPromptTemplate(template, {
    question,
    brand_name: brandName,
    strengths,
    target,
    location,
  });

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) return null;

    const r = await resp.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((r as any).content?.[0]?.text || "").trim() || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// 포털용: 질문 현황 조회
// ═══════════════════════════════════════════

export async function getPortalQuestions(
  clientId: string
): Promise<Question[]> {
  return getQuestions(clientId);
}
