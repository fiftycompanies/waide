"use server";

import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { z } from "zod";

// Input validation schema
const GenerateContentSchema = z.object({
  topic: z.string().min(1, "주제를 입력해주세요.").max(500, "주제는 500자 이내로 입력해주세요."),
  toneAdjustment: z.number().min(0).max(1).optional().default(0.5),
});

// Response types
export interface GeneratedContent {
  caption: string;
  imagePrompt: string;
  hashtags: string[];
}

interface GenerateContentResult {
  success: boolean;
  data?: GeneratedContent;
  error?: string;
}

// Persona type for this file
interface PersonaRecord {
  id: string;
  name: string;
  description: string | null;
  tone_voice_settings: Record<string, unknown>;
  brand_values: string[] | null;
  target_audience: string | null;
}

/**
 * Helper: Get authenticated user's workspace ID
 */
async function getAuthWorkspaceId(): Promise<{ userId: string | null; workspaceId: string | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { userId: null, workspaceId: null, error: "로그인이 필요합니다." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membershipRaw } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipRaw as { workspace_id: string } | null;

  if (!membership?.workspace_id) {
    return { userId: user.id, workspaceId: null, error: "워크스페이스를 찾을 수 없습니다. 먼저 브랜드 분석을 진행해주세요." };
  }

  return { userId: user.id, workspaceId: membership.workspace_id, error: null };
}

/**
 * Generate campaign content using the saved Brand Persona
 */
export async function generateCampaignContent(
  topic: string,
  toneAdjustment?: number
): Promise<GenerateContentResult> {
  try {
    // Validate input
    const validationResult = GenerateContentSchema.safeParse({ topic, toneAdjustment });
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "입력값 검증에 실패했습니다.",
      };
    }

    const { topic: validatedTopic, toneAdjustment: validatedTone } = validationResult.data;

    console.log("[Content Action] Starting content generation...");
    console.log("[Content Action] Topic:", validatedTopic);

    // Get authenticated user's workspace
    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    // Fetch the brand persona from DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: personaRaw, error: personaError } = await (supabase as any)
      .from("brand_personas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (personaError || !personaRaw) {
      console.error("[Content Action] Persona fetch error:", personaError);
      return {
        success: false,
        error: "브랜드 페르소나를 찾을 수 없습니다. 먼저 브랜드 분석을 진행해주세요.",
      };
    }

    const persona = personaRaw as PersonaRecord;

    console.log("[Content Action] Found persona:", persona.name);

    // Extract persona data
    interface ToneVoiceSettings {
      formality?: number;
      humor?: number;
      enthusiasm?: number;
      empathy?: number;
      toneVoice?: string[];
      keywords?: string[];
    }

    const toneSettings = persona.tone_voice_settings as ToneVoiceSettings;
    const toneVoice = toneSettings.toneVoice || [];
    const keywords = toneSettings.keywords || [];
    const brandValues = persona.brand_values || [];
    const targetAudience = persona.target_audience || "";

    // Adjust tone based on slider
    const toneDescription = validatedTone < 0.3
      ? "위트 있고 유머러스한"
      : validatedTone > 0.7
        ? "전문적이고 격식 있는"
        : "친근하면서도 신뢰감 있는";

    // Construct the prompt
    const systemPrompt = `당신은 "${persona.name}" 브랜드의 전문 소셜 미디어 마케터입니다.

## 브랜드 정보
- **브랜드명**: ${persona.name}
- **브랜드 설명**: ${persona.description || ""}
- **톤앤매너**: ${toneVoice.join(", ")}
- **핵심 키워드**: ${keywords.join(", ")}
- **브랜드 가치**: ${brandValues.join(", ")}
- **타겟 고객**: ${targetAudience}

## 작성 스타일
- ${toneDescription} 톤으로 작성하세요.
- 이모지를 적절히 사용하세요.
- 한국어로 작성하세요.
- Instagram 게시물에 적합한 길이로 작성하세요 (150-300자).

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "caption": "Instagram 캡션 내용",
  "imagePrompt": "이 게시물에 어울리는 이미지를 설명하는 영문 프롬프트 (DALL-E용)",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5"]
}`;

    const userPrompt = `다음 주제로 Instagram 게시물을 작성해주세요:

주제: ${validatedTopic}

브랜드의 톤앤매너와 키워드를 반영하여 매력적인 캡션과 이미지 설명을 생성해주세요.`;

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "OpenAI API 키가 설정되지 않았습니다.",
      };
    }

    const openai = new OpenAI({ apiKey });

    console.log("[Content Action] Calling OpenAI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return {
        success: false,
        error: "AI 응답이 비어있습니다.",
      };
    }

    console.log("[Content Action] OpenAI response received");

    // Parse the response
    const parsedResponse = JSON.parse(responseText) as GeneratedContent;

    if (!parsedResponse.caption || !parsedResponse.imagePrompt) {
      return {
        success: false,
        error: "AI 응답 형식이 올바르지 않습니다.",
      };
    }

    console.log("[Content Action] ✅ Content generated successfully");

    return {
      success: true,
      data: {
        caption: parsedResponse.caption,
        imagePrompt: parsedResponse.imagePrompt,
        hashtags: parsedResponse.hashtags || [],
      },
    };
  } catch (error) {
    console.error("[Content Action] ❌ Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "콘텐츠 생성 중 오류가 발생했습니다.",
    };
  }
}

/**
 * Save generated content to library
 */
export async function saveToLibrary(
  content: GeneratedContent & { topic?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log("[Content Action] Saving to library:", content.caption.substring(0, 50));

    // Get authenticated user's workspace
    const { workspaceId, error: authError } = await getAuthWorkspaceId();
    if (authError || !workspaceId) {
      return { success: false, error: authError || "워크스페이스를 찾을 수 없습니다." };
    }

    const supabase = await createClient();

    // Get persona ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: persona } = await (supabase as any)
      .from("brand_personas")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // Save to contents table
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("contents")
      .insert({
        workspace_id: workspaceId,
        persona_id: persona?.id || null,
        topic: content.topic || "생성된 콘텐츠",
        caption: content.caption,
        image_prompt: content.imagePrompt,
        hashtags: content.hashtags || [],
        status: "DRAFT",
        updated_at: now,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Content Action] Save error:", error);
      return { success: false, error: `저장 실패: ${error.message}` };
    }

    console.log("[Content Action] ✅ Saved to library:", data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("[Content Action] Save error:", error);
    return {
      success: false,
      error: "저장 중 오류가 발생했습니다.",
    };
  }
}
