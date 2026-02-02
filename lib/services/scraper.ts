import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  title: string;
  metaDescription: string;
  headings: string[];
  paragraphs: string[];
  fullText: string;
}

/**
 * Scrapes a URL and extracts meaningful text content
 */
export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIMarketerBot/1.0; +https://ai-marketer.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove script, style, and other non-content elements
    $('script, style, noscript, iframe, svg, nav, footer, header, aside').remove();
    $('[style*="display:none"], [style*="display: none"], .hidden, [hidden]').remove();

    // Extract title
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content')?.trim() || 
                  $('h1').first().text().trim() || 
                  '';

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() ||
                           $('meta[property="og:description"]').attr('content')?.trim() ||
                           '';

    // Extract headings (h1, h2, h3)
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2 && text.length < 200) {
        headings.push(text);
      }
    });

    // Extract paragraphs and meaningful text content
    const paragraphs: string[] = [];
    $('p, li, article, section > div, .content, .description, .about').each((_, el) => {
      const text = $(el).text().trim();
      // Filter out very short or very long text
      if (text && text.length > 20 && text.length < 1000) {
        // Avoid duplicates
        if (!paragraphs.includes(text)) {
          paragraphs.push(text);
        }
      }
    });

    // Also try to get main content area text
    const mainContent = $('main, article, .main, #main, .content, #content').text().trim();

    // Combine all text for the full text output
    const textParts: string[] = [
      title && `Title: ${title}`,
      metaDescription && `Description: ${metaDescription}`,
      headings.length > 0 && `Headings: ${headings.slice(0, 10).join(', ')}`,
      paragraphs.length > 0 && `Content: ${paragraphs.slice(0, 15).join(' ')}`,
    ].filter(Boolean) as string[];

    let fullText = textParts.join('\n\n');

    // If we got very little content, try to get body text
    if (fullText.length < 200 && mainContent.length > 100) {
      fullText += '\n\n' + mainContent.slice(0, 2000);
    }

    // Limit total text length to avoid token limits (roughly 4000 characters)
    if (fullText.length > 4000) {
      fullText = fullText.slice(0, 4000) + '...';
    }

    return {
      title,
      metaDescription,
      headings: headings.slice(0, 10),
      paragraphs: paragraphs.slice(0, 15),
      fullText,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('웹사이트에 연결할 수 없습니다. URL을 확인해주세요.');
      }
      if (error.response?.status === 403) {
        throw new Error('웹사이트 접근이 거부되었습니다.');
      }
      if (error.response?.status === 404) {
        throw new Error('페이지를 찾을 수 없습니다.');
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error('웹사이트 주소를 찾을 수 없습니다.');
      }
    }
    throw new Error('웹사이트 스크래핑 중 오류가 발생했습니다.');
  }
}
