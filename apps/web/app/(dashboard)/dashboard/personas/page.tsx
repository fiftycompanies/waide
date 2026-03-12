"use client";

import { useEffect, useState } from "react";
import { Brain, Edit, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLatestBrandPersona, type BrandPersona } from "@/lib/actions";

interface ToneVoiceSettings {
  toneVoice?: string[];
  keywords?: string[];
  formality?: number;
  enthusiasm?: number;
  humor?: number;
  empathy?: number;
}

export default function PersonasPage() {
  const [persona, setPersona] = useState<BrandPersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPersona = async () => {
      const result = await getLatestBrandPersona();
      setPersona(result);
      setIsLoading(false);
    };
    loadPersona();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">브랜드 페르소나</h1>
          <p className="text-muted-foreground">
            AI가 분석한 브랜드의 톤앤매너와 특성을 관리합니다
          </p>
        </div>
        <Link href="/onboarding">
          <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
            <Plus className="h-4 w-4 mr-2" />
            새 페르소나
          </Button>
        </Link>
      </div>

      {/* Persona Card */}
      {persona ? (
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">{persona.name}</CardTitle>
                  <CardDescription>
                    {persona.target_audience || "타겟 고객 미설정"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={persona.is_active ? "default" : "secondary"}
                  className={
                    persona.is_active
                      ? "bg-emerald-500/10 text-emerald-600"
                      : ""
                  }
                >
                  {persona.is_active ? "활성" : "비활성"}
                </Badge>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            {persona.description && (
              <div>
                <h3 className="text-sm font-medium mb-2">브랜드 요약</h3>
                <p className="text-muted-foreground">{persona.description}</p>
              </div>
            )}

            {/* Tone & Voice */}
            <div>
              <h3 className="text-sm font-medium mb-2">톤앤매너</h3>
              <div className="flex flex-wrap gap-2">
                {((persona.tone_voice_settings as ToneVoiceSettings)?.toneVoice || []).map(
                  (tone: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {tone}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <h3 className="text-sm font-medium mb-2">핵심 키워드</h3>
              <div className="flex flex-wrap gap-2">
                {((persona.tone_voice_settings as ToneVoiceSettings)?.keywords || []).map(
                  (keyword: string, index: number) => (
                    <Badge
                      key={index}
                      className="bg-violet-500/10 text-violet-600"
                    >
                      {keyword}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Brand Values */}
            {persona.brand_values && persona.brand_values.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">브랜드 가치</h3>
                <div className="flex flex-wrap gap-2">
                  {persona.brand_values.map((value: string, index: number) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Communication Style */}
            <div>
              <h3 className="text-sm font-medium mb-3">커뮤니케이션 스타일</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "격식",
                    value: (persona.tone_voice_settings as ToneVoiceSettings)?.formality ?? 0.5,
                  },
                  {
                    label: "열정",
                    value: (persona.tone_voice_settings as ToneVoiceSettings)?.enthusiasm ?? 0.5,
                  },
                  {
                    label: "유머",
                    value: (persona.tone_voice_settings as ToneVoiceSettings)?.humor ?? 0.5,
                  },
                  {
                    label: "공감",
                    value: (persona.tone_voice_settings as ToneVoiceSettings)?.empathy ?? 0.5,
                  },
                ].map((style) => (
                  <div
                    key={style.label}
                    className="p-3 rounded-lg bg-muted/50 border border-border/40"
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {style.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                          style={{ width: `${style.value * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(style.value * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 mb-4">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <CardTitle className="text-lg mb-2">
              아직 브랜드 페르소나가 없습니다
            </CardTitle>
            <CardDescription className="text-center mb-6 max-w-sm">
              웹사이트 URL을 입력하면 AI가 자동으로 브랜드 페르소나를 분석합니다.
            </CardDescription>
            <Link href="/onboarding">
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                <Sparkles className="h-4 w-4 mr-2" />
                브랜드 분석 시작하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
