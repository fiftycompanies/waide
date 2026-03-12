"use client";

import {
  Brain,
  Hash,
  Target,
  Heart,
  RefreshCw,
  Save,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface BrandPersona {
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
}

interface PersonaResultProps {
  result: {
    url: string;
    scrapedTitle: string;
    persona: BrandPersona;
  };
  onSave: () => void;
  onReset: () => void;
  isSaving?: boolean;
}

const styleLabels = {
  formality: { label: "형식성", low: "캐주얼", high: "포멀" },
  enthusiasm: { label: "열정", low: "차분함", high: "열정적" },
  humor: { label: "유머", low: "진지함", high: "유머러스" },
  empathy: { label: "공감", low: "중립적", high: "공감적" },
};

function StyleMeter({
  label,
  value,
  low,
  high,
}: {
  label: string;
  value: number;
  low: string;
  high: string;
}) {
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

export function PersonaResult({ result, onSave, onReset, isSaving = false }: PersonaResultProps) {
  const { persona, scrapedTitle, url } = result;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <div className="flex-1">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            브랜드 분석이 완료되었습니다!
          </p>
          <p className="text-sm text-muted-foreground">
            {scrapedTitle || url}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-border/40 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-6 border-b border-border/40">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-lg font-semibold">브랜드 요약</h3>
              <p className="text-muted-foreground leading-relaxed">
                {persona.summary}
              </p>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6 space-y-8">
          {/* Tone & Voice */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-500" />
              <h4 className="font-semibold">톤앤매너</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.toneVoice.map((tone, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20"
                >
                  {tone}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Keywords */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-fuchsia-500" />
              <h4 className="font-semibold">핵심 키워드</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.keywords.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400"
                >
                  #{keyword}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Target Audience & Brand Values */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                <h4 className="font-semibold">타겟 고객</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.targetAudience}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                <h4 className="font-semibold">브랜드 가치</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {persona.brandValues.map((value, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  >
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Communication Style */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h4 className="font-semibold">커뮤니케이션 스타일</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {(Object.keys(styleLabels) as Array<keyof typeof styleLabels>).map((key) => (
                <StyleMeter
                  key={key}
                  label={styleLabels[key].label}
                  value={persona.communicationStyle[key]}
                  low={styleLabels[key].low}
                  high={styleLabels[key].high}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 h-12 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-70"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              페르소나 저장하기
            </>
          )}
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          disabled={isSaving}
          className="h-12 border-border/40"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          다시 분석하기
        </Button>
      </div>
    </div>
  );
}
