/**
 * prompt-loader.ts
 * Phase 7-10: 하드코딩된 프롬프트를 agent_prompts 테이블에서 동적 로딩
 *
 * - agent_key 기반 조회 (agent_type+task와 별도)
 * - DB에 값 있으면 DB 프롬프트 사용
 * - 없으면 DEFAULT_PROMPTS fallback
 * - [기본값 복원] = prompt_template → default_template 복사
 *
 * agent_prompts 테이블의 기존 구조(agent_type, task, prompt_section 등)와
 * 이 agent_key 기반 시스템은 공존. 기존 agent-runner.ts의 프롬프트 로딩은
 * agent_type+task 기반이고, 이 파일은 Phase 3-6의 하드코딩 프롬프트 전용.
 */

import { createAdminClient } from "@/lib/supabase/service";

// ── 기본 프롬프트 정의 ────────────────────────────────────────────

export const DEFAULT_PROMPTS: Record<string, {
  name: string;
  template: string;
  variables: string[];
}> = {
  question_engine: {
    name: "Question Engine",
    template: `다음 키워드에 대해 사람들이 AI 검색(ChatGPT, Perplexity 등)에서 실제로 물어볼 만한 자연어 질문을 20개 생성해.

키워드: {keyword}
업종: {category}
지역: {location}

규칙:
- 한국어 구어체 (~해줘, ~있어?, ~추천 등)
- 다양한 의도: 추천, 비교, 가격, 후기, 시기, 특징, 일반
- 구체적이고 실용적인 질문
- 중복 의도 제거

JSON 배열로만 출력:
[{"question": "...", "intent": "recommendation|comparison|price|review|timing|feature|general"}]`,
    variables: ["keyword", "category", "location"],
  },

  seo_writer: {
    name: "SEO Writer",
    template: `당신은 SEO 키워드 전략가입니다. 아래 브랜드 정보를 기반으로 블로그 SEO 타겟 키워드를 추천해주세요.

브랜드명: {brand_name}
업종: {category}
지역: {location}
타겟 고객: {target}
강점: {strengths}

기존 키워드 (제외): {existing_keywords}

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
- estimated_volume은 추정 가능하면 숫자, 아니면 null`,
    variables: ["brand_name", "category", "location", "target", "strengths", "existing_keywords"],
  },

  aeo_qa_writer: {
    name: "AEO Q&A Writer",
    template: `다음 질문에 대한 AEO 최적화 콘텐츠를 작성해.

질문: {question}
브랜드: {brand_name}
강점: {strengths}
타겟: {target}

구조:
1. H1: 질문형 제목
2. 요약: 2~3줄 핵심 답변 (AI가 그대로 인용할 수 있는 짧고 명확한 문장)
3. 상세 답변: 500~800자, 브랜드 자연 언급 1~2회
4. FAQ: 관련 질문 5~7개 (## FAQ 헤딩 아래 ### 질문 형식)

규칙: 요약이 가장 중요, 광고 금지, 해요체, 마크다운`,
    variables: ["question", "brand_name", "strengths", "target"],
  },

  aeo_list_writer: {
    name: "AEO 리스트 Writer",
    template: `다음 질문에 대한 AEO 최적화 리스트 콘텐츠를 작성해.

질문: {question}
브랜드: {brand_name}
강점: {strengths}
타겟: {target}
지역: {location}

구조:
1. H1: 지역+키워드+추천 TOP 7
2. 도입: 2~3줄 요약
3. 리스트 7개: 번호+이름+한줄설명+특징 2~3개 (우리 브랜드를 2~3위에 자연 배치)
4. 비교표: 마크다운 테이블
5. FAQ: 3~5개 (## FAQ 헤딩 아래 ### 질문 형식)

규칙: 1위에 넣지 말 것, 객관적 비교, 해요체, 마크다운`,
    variables: ["question", "brand_name", "strengths", "target", "location"],
  },

  aeo_entity_writer: {
    name: "AEO 엔티티 Writer",
    template: `다음 브랜드의 엔티티 정의 콘텐츠를 작성해.

브랜드: {brand_name}
업종: {category}
위치: {location}
강점: {strengths}
어필사항: {appeal}
타겟: {target}

구조:
1. 엔티티 정의 문장 (위키 스타일, 2~3줄)
   → '{brand_name}은(는) {location}에 위치한 {category} 전문 업체입니다.'
2. 상세 설명 (300~500자) — 특징, 시설, 서비스
3. 핵심 정보표 (마크다운 테이블) — 위치/영업시간/가격대/특징/추천대상
4. FAQ (5개) — 실용적 질문+답변

규칙:
- 백과사전+공식 소개 톤 (광고 아닌 정보 전달)
- 사실 기반, 과장 금지
- AI가 신뢰할 수 있는 객관적 톤
- 마크다운 형식
- 제목은 '{brand_name} — {category} 엔티티 정보' 형식`,
    variables: ["brand_name", "category", "location", "strengths", "appeal", "target"],
  },

  qc_agent: {
    name: "QC Agent",
    template: `콘텐츠 품질 검수를 실행해. agent-runner.ts의 qc_review_v2 프롬프트를 사용합니다.

이 프롬프트는 agent_prompts 테이블의 QC/qc_review_v2 태스크에 정의되어 있으므로
별도 편집이 필요하면 에이전트 프롬프트 탭에서 QC 에이전트를 수정하세요.`,
    variables: [],
  },

  cmo_strategy: {
    name: "CMO 전략",
    template: `캠페인 전략을 수립해. agent-runner.ts의 campaign_strategy 프롬프트를 사용합니다.

이 프롬프트는 agent_prompts 테이블의 CMO/campaign_strategy 태스크에 정의되어 있으므로
별도 편집이 필요하면 에이전트 프롬프트 탭에서 CMO 에이전트를 수정하세요.`,
    variables: [],
  },

  niche_keyword: {
    name: "니치 키워드 발굴",
    template: `다음 브랜드 정보를 기반으로 니치 키워드(틈새 키워드)를 10개 발굴해.

브랜드: {brand_name}
업종: {category}
지역: {location}
현재 키워드: {existing_keywords}
강점: {strengths}
타겟: {target}

니치 키워드 기준:
- 경쟁이 적지만 검색 의도가 명확한 키워드
- 현재 키워드와 관련되지만 아직 공략하지 않은 영역
- 시즌별, 타겟별, 특징별 세분화 키워드
- 인접 지역 확장 키워드
- 롱테일 키워드

JSON 배열로만 출력:
[{
  "keyword": "가평 바베큐 펜션",
  "difficulty": "low|medium|high",
  "opportunity": "low|medium|high",
  "reason": "추천 사유 한 줄"
}]`,
    variables: ["brand_name", "category", "location", "existing_keywords", "strengths", "target"],
  },

  mention_detection: {
    name: "Mention Detection",
    template: `다음 AI 답변에서 언급된 브랜드/가게/업체명을 모두 추출해.

답변:
{response_text}

추적 브랜드: {brand_name}
브랜드 별칭: {brand_aliases}

JSON 배열로만 출력 (다른 텍스트 없이):
[{
  "brand": "브랜드명",
  "is_target": true 또는 false,
  "position": 숫자(1부터 시작, 답변에서 언급 순서) 또는 null,
  "context": "언급된 문장 (50자 이내)",
  "sentiment": "positive" 또는 "neutral" 또는 "negative"
}]

규칙:
- is_target: 추적 브랜드 또는 별칭과 일치하면 true
- position: 답변에서 처음 언급되는 순서 (첫 번째=1, 두 번째=2...)
- 언급되지 않은 경우 빈 배열 [] 반환
- 일반 명사(호텔, 카페 등)는 제외, 고유명사만 추출`,
    variables: ["response_text", "brand_name", "brand_aliases"],
  },

  aeo_type_judge: {
    name: "AEO 유형 판단",
    template: `다음 질문에 가장 적합한 콘텐츠 유형을 판단해.

질문: {question}
의도: {intent}

유형: aeo_qa(질문-답변) 또는 aeo_list(리스트/랭킹)

판단 기준:
- 추천/TOP/BEST/어디/뭐가좋아 → aeo_list
- 얼마/가격/vs/방법/괜찮아/뭐야/어때 → aeo_qa

JSON만: {"type": "aeo_qa"}`,
    variables: ["question", "intent"],
  },
};

// ── DB 로딩 함수 ────────────────────────────────────────────────

/**
 * agent_key 기반으로 프롬프트 로딩 (DB 우선, fallback)
 */
export async function loadPromptTemplate(agentKey: string): Promise<string> {
  try {
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any)
      .from("agent_prompts")
      .select("content")
      .eq("agent_type", "PROMPT_REGISTRY")
      .eq("title", agentKey)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.content) {
      return data.content;
    }
  } catch {
    // DB 조회 실패 → fallback
  }

  return DEFAULT_PROMPTS[agentKey]?.template || "";
}

/**
 * 프롬프트 템플릿에 변수 치환
 */
export function fillPromptTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
    result = result.replaceAll(`{{${key}}}`, value); // agent-runner 호환
  }
  return result;
}

// ── 프롬프트 레지스트리 CRUD ─────────────────────────────────────

export interface PromptRegistryItem {
  id: string;
  agent_key: string;
  agent_name: string;
  prompt_template: string;
  default_template: string;
  variables: string[];
  updated_at: string;
}

/**
 * 레지스트리의 모든 프롬프트 조회
 */
export async function getPromptRegistry(): Promise<PromptRegistryItem[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any)
    .from("agent_prompts")
    .select("id, title, content, updated_at, version")
    .eq("agent_type", "PROMPT_REGISTRY")
    .eq("is_active", true)
    .order("title");

  // DB 레코드와 DEFAULT_PROMPTS를 머지
  const dbMap = new Map<string, { id: string; content: string; updated_at: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data ?? []).forEach((r: any) => {
    dbMap.set(r.title, { id: r.id, content: r.content, updated_at: r.updated_at });
  });

  const items: PromptRegistryItem[] = [];
  for (const [key, def] of Object.entries(DEFAULT_PROMPTS)) {
    const dbRecord = dbMap.get(key);
    items.push({
      id: dbRecord?.id || key,
      agent_key: key,
      agent_name: def.name,
      prompt_template: dbRecord?.content || def.template,
      default_template: def.template,
      variables: def.variables,
      updated_at: dbRecord?.updated_at || new Date().toISOString(),
    });
  }

  return items;
}

/**
 * 프롬프트 저장 (UPSERT)
 */
export async function savePromptRegistry(
  agentKey: string,
  promptTemplate: string,
): Promise<{ success: boolean; error?: string }> {
  const db = createAdminClient();
  const def = DEFAULT_PROMPTS[agentKey];
  if (!def) return { success: false, error: "알 수 없는 agent_key" };

  // 기존 레코드 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from("agent_prompts")
    .select("id, version")
    .eq("agent_type", "PROMPT_REGISTRY")
    .eq("title", agentKey)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    // 기존 비활성화 + 새 버전 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("agent_prompts")
      .update({ is_active: false })
      .eq("id", existing.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("agent_prompts")
      .insert({
        agent_type: "PROMPT_REGISTRY",
        prompt_section: "user",
        title: agentKey,
        content: promptTemplate,
        is_active: true,
        version: (existing.version || 1) + 1,
        updated_by: "admin",
      });

    if (error) return { success: false, error: error.message };
  } else {
    // 새로 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any)
      .from("agent_prompts")
      .insert({
        agent_type: "PROMPT_REGISTRY",
        prompt_section: "user",
        title: agentKey,
        content: promptTemplate,
        is_active: true,
        version: 1,
        updated_by: "admin",
      });

    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 기본값 복원
 */
export async function restorePromptDefault(
  agentKey: string,
): Promise<{ success: boolean; error?: string }> {
  const def = DEFAULT_PROMPTS[agentKey];
  if (!def) return { success: false, error: "알 수 없는 agent_key" };
  return savePromptRegistry(agentKey, def.template);
}
