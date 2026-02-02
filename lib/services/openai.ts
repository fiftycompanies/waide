import OpenAI from 'openai';
import { z } from 'zod';

// Schema for the extracted brand persona
export const BrandPersonaSchema = z.object({
  toneVoice: z.array(z.string()).describe('톤앤매너를 설명하는 형용사들'),
  keywords: z.array(z.string()).describe('브랜드의 핵심 키워드들'),
  summary: z.string().describe('브랜드를 한 문장으로 요약'),
  targetAudience: z.string().describe('추정되는 타겟 고객층'),
  brandValues: z.array(z.string()).describe('브랜드가 추구하는 가치들'),
  communicationStyle: z.object({
    formality: z.number().min(0).max(1).describe('0: 캐주얼, 1: 포멀'),
    enthusiasm: z.number().min(0).max(1).describe('0: 차분함, 1: 열정적'),
    humor: z.number().min(0).max(1).describe('0: 진지함, 1: 유머러스'),
    empathy: z.number().min(0).max(1).describe('0: 중립적, 1: 공감적'),
  }).describe('커뮤니케이션 스타일 점수'),
});

export type BrandPersona = z.infer<typeof BrandPersonaSchema>;

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
  }
  
  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `당신은 브랜드 분석 전문가입니다. 웹사이트 콘텐츠를 분석하여 브랜드의 페르소나를 추출합니다.

다음 항목을 추출해주세요:

1. **toneVoice**: 브랜드의 톤앤매너를 설명하는 형용사 5-7개 (예: "전문적인", "친근한", "혁신적인")
2. **keywords**: 브랜드/산업을 대표하는 핵심 키워드 5-10개
3. **summary**: 브랜드를 한 문장으로 요약 (50자 이내)
4. **targetAudience**: 추정되는 주요 타겟 고객층 설명 (예: "20-30대 직장인", "스타트업 창업자")
5. **brandValues**: 브랜드가 추구하는 핵심 가치 3-5개 (예: "혁신", "신뢰", "고객중심")
6. **communicationStyle**: 커뮤니케이션 스타일을 0-1 사이의 점수로 표현
   - formality: 0(매우 캐주얼) ~ 1(매우 포멀)
   - enthusiasm: 0(차분한) ~ 1(열정적인)
   - humor: 0(진지한) ~ 1(유머러스한)
   - empathy: 0(중립적) ~ 1(공감적)

반드시 JSON 형식으로 응답하세요. 한국어로 작성해주세요.`;

const USER_PROMPT_TEMPLATE = `다음 웹사이트 콘텐츠를 분석하여 브랜드 페르소나를 추출해주세요:

---
{content}
---

위 콘텐츠를 분석하여 브랜드의 톤앤매너, 키워드, 요약, 타겟 고객, 가치, 커뮤니케이션 스타일을 JSON 형식으로 추출해주세요.`;

/**
 * Extracts brand persona from website content using OpenAI
 */
export async function extractBrandPersona(websiteContent: string): Promise<BrandPersona> {
  const openai = getOpenAIClient();
  
  const userPrompt = USER_PROMPT_TEMPLATE.replace('{content}', websiteContent);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4o
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('OpenAI 응답이 비어있습니다.');
    }

    // Parse the JSON response
    const parsedContent = JSON.parse(content);
    
    // Validate with Zod schema
    const validatedPersona = BrandPersonaSchema.parse(parsedContent);
    
    return validatedPersona;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Persona validation failed:', error.issues);
      throw new Error('브랜드 페르소나 형식이 올바르지 않습니다.');
    }
    if (error instanceof SyntaxError) {
      throw new Error('AI 응답을 파싱할 수 없습니다.');
    }
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('OpenAI API 키가 유효하지 않습니다.');
      }
      if (error.status === 429) {
        throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      }
      throw new Error(`OpenAI API 오류: ${error.message}`);
    }
    throw error;
  }
}
