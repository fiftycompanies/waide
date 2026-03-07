"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { AEOCitationData } from "@/lib/actions/aeo-tracking-actions";

interface AEOCitationSectionProps {
  data: AEOCitationData;
}

export function AEOCitationSection({ data }: AEOCitationSectionProps) {
  const hasData = data.topSources.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-lg font-semibold mb-2">Citation 분석 데이터 없음</p>
          <p className="text-sm text-muted-foreground">
            Perplexity 추적 데이터가 있으면 인용 출처 분석이 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI가 인용한 출처 TOP 10 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 인용 출처 TOP 10</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">출처 URL</th>
                <th className="text-center py-2 px-2 font-medium">인용 횟수</th>
                <th className="text-center py-2 px-2 font-medium">관련 질문</th>
              </tr>
            </thead>
            <tbody>
              {data.topSources.map((source, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 max-w-sm truncate"
                    >
                      {truncateUrl(source.url)}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="text-center py-2 px-2">{source.citation_count}회</td>
                  <td className="text-center py-2 px-2">{source.related_questions}개</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 우리 콘텐츠 인용 여부 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">우리 콘텐츠 인용 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {data.ourContentCited.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                아직 우리 콘텐츠가 AI에 의해 인용되지 않았습니다.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                엔티티 콘텐츠와 SEO 콘텐츠를 발행하면 인용 가능성이 높아집니다.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">콘텐츠</th>
                  <th className="text-left py-2 px-3 font-medium">URL</th>
                  <th className="text-center py-2 px-2 font-medium">인용 횟수</th>
                </tr>
              </thead>
              <tbody>
                {data.ourContentCited.map((content, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 max-w-xs truncate">{content.content_title}</td>
                    <td className="py-2 px-3">
                      <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {truncateUrl(content.url)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="text-center py-2 px-2">
                      <Badge variant="default">{content.citation_count}회</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 30
      ? parsed.pathname.substring(0, 30) + "..."
      : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url.length > 50 ? url.substring(0, 50) + "..." : url;
  }
}
