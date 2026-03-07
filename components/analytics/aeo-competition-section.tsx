"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AEOCompetitionData } from "@/lib/actions/aeo-tracking-actions";

interface AEOCompetitionSectionProps {
  data: AEOCompetitionData;
}

export function AEOCompetitionSection({ data }: AEOCompetitionSectionProps) {
  const hasData = data.competitors.length > 0 || data.shareOfVoice.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-lg font-semibold mb-2">경쟁 분석 데이터 없음</p>
          <p className="text-sm text-muted-foreground">
            AEO 추적을 실행하면 경쟁 브랜드 언급 데이터가 자동으로 수집됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSoV = data.shareOfVoice.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Share of Voice */}
      {data.shareOfVoice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share of Voice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.shareOfVoice.map((item) => {
                const isOurs = item.brand === data.shareOfVoice.find(
                  (s) => data.ourMentionCount > 0 && s.count === data.ourMentionCount
                )?.brand;

                return (
                  <div key={item.brand} className="flex items-center gap-3">
                    <div className="w-32 truncate text-sm font-medium">
                      {item.brand}
                      {isOurs && <Badge variant="default" className="ml-1 text-[10px]">우리</Badge>}
                    </div>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOurs ? "bg-blue-500" : "bg-gray-300"}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm text-muted-foreground">
                      {item.count}회 ({item.percentage}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 경쟁 브랜드 상세 */}
      {data.competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">경쟁 브랜드 언급 상세</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">브랜드</th>
                  <th className="text-center py-2 px-2 font-medium">언급 횟수</th>
                  <th className="text-center py-2 px-2 font-medium">평균 위치</th>
                  <th className="text-center py-2 px-2 font-medium">긍정</th>
                  <th className="text-center py-2 px-2 font-medium">중립</th>
                  <th className="text-center py-2 px-2 font-medium">부정</th>
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((comp) => (
                  <tr key={comp.brand} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{comp.brand}</td>
                    <td className="text-center py-2 px-2">{comp.mention_count}</td>
                    <td className="text-center py-2 px-2">
                      {comp.avg_position ? `${comp.avg_position}위` : "-"}
                    </td>
                    <td className="text-center py-2 px-2 text-emerald-600">{comp.sentiment_breakdown.positive}</td>
                    <td className="text-center py-2 px-2 text-gray-500">{comp.sentiment_breakdown.neutral}</td>
                    <td className="text-center py-2 px-2 text-red-500">{comp.sentiment_breakdown.negative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
