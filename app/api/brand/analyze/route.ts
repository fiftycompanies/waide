import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeWebsite, extractBrandPersona } from '@/lib/services';

// Force dynamic rendering - prevent static caching
export const dynamic = 'force-dynamic';

// Request validation schema
const AnalyzeRequestSchema = z.object({
  url: z.string().url({ message: '올바른 URL 형식을 입력해주세요.' }),
});

// Response type
interface AnalyzeResponse {
  success: boolean;
  data?: {
    url: string;
    scrapedTitle: string;
    persona: {
      toneVoice: string[];
      keywords: string[];
      summary: string;
      targetAudience: string;
      brandValues: string[];
      communicationStyle: {
        formality: number;
        enthusiasm: number;
        humor: number;
        empathy: number;
      };
    };
  };
  error?: string;
  details?: z.ZodIssue[];
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = AnalyzeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '입력값 검증에 실패했습니다.',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { url } = validationResult.data;

    // Step 1: Scrape the website
    console.log(`[Brand Analysis] Scraping URL: ${url}`);
    const scrapedContent = await scrapeWebsite(url);
    
    if (!scrapedContent.fullText || scrapedContent.fullText.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: '웹사이트에서 충분한 콘텐츠를 추출할 수 없습니다. 다른 URL을 시도해주세요.',
        },
        { status: 422 }
      );
    }

    console.log(`[Brand Analysis] Scraped ${scrapedContent.fullText.length} characters`);

    // Step 2: Extract brand persona using LLM
    console.log(`[Brand Analysis] Extracting persona with OpenAI...`);
    const persona = await extractBrandPersona(scrapedContent.fullText);
    
    console.log(`[Brand Analysis] Successfully extracted persona for: ${scrapedContent.title}`);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        url,
        scrapedTitle: scrapedContent.title,
        persona,
      },
    });

  } catch (error) {
    console.error('[Brand Analysis] Error:', error);

    // Handle known error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '데이터 형식이 올바르지 않습니다.',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Handle custom errors with messages
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: '브랜드 분석 중 알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
