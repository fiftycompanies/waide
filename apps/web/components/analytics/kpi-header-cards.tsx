import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { OpsKpiCards } from "@/lib/actions/analytics-actions";

interface KpiHeaderCardsProps {
  data: OpsKpiCards;
}

function DeltaBadge({ value, inverse = false, unit = "%p" }: { value: number; inverse?: boolean; unit?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">변동 없음</span>;
  const isGood = inverse ? value < 0 : value > 0;
  const abs = Math.abs(value);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-emerald-600" : "text-red-500"}`}>
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {abs.toFixed(1)}{unit}
    </span>
  );
}

export function KpiHeaderCards({ data }: KpiHeaderCardsProps) {
  const cards = [
    {
      label: "노출 점유율",
      value: `${data.weightedVisibilityPc.toFixed(1)}%`,
      delta: <DeltaBadge value={data.visibilityDelta} />,
      description: "가중 노출 점유율 (PC)",
      icon: "📊",
      color: "from-violet-50 to-purple-50 border-violet-100",
    },
    {
      label: "AI 인용율 (SOM)",
      value: data.citationRate > 0 ? `${data.citationRate.toFixed(1)}%` : "준비 중",
      delta: data.citationRate > 0 ? <DeltaBadge value={data.citationRateDelta} /> : null,
      description: data.citationRate > 0 ? "이번 주 vs 지난 주" : "AEO 측정 기능 준비 중",
      icon: "🤖",
      color: "from-fuchsia-50 to-pink-50 border-fuchsia-100",
      muted: data.citationRate === 0,
    },
    {
      label: "평균 SERP 순위",
      value: data.avgRank !== null ? `${data.avgRank.toFixed(1)}위` : "데이터 없음",
      delta: data.avgRank !== null ? <DeltaBadge value={data.avgRankDelta} inverse unit="위" /> : null,
      description: "네이버 PC 기준",
      icon: "🎯",
      color: "from-blue-50 to-sky-50 border-blue-100",
    },
    {
      label: "이번달 발행",
      value: `${data.contentPublished}건`,
      delta: null,
      description: "당월 발행 콘텐츠",
      icon: "✍️",
      color: "from-green-50 to-emerald-50 border-green-100",
    },
    {
      label: "상위 3위 키워드",
      value: `${data.top3Keywords}개`,
      delta: null,
      description: "현재 1~3위 달성",
      icon: "🏆",
      color: "from-amber-50 to-yellow-50 border-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`bg-gradient-to-br ${card.color} border`}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${"muted" in card && card.muted ? "text-muted-foreground/60" : ""}`}>{card.value}</p>
            <div className="mt-1 flex items-center gap-2">
              {card.delta}
              <span className="text-xs text-muted-foreground">{card.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
