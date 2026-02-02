import Link from "next/link";
import { Brain, Database, Sparkles, TrendingUp, Rocket, MessageSquare, Hash, Target, Heart, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getLatestBrandPersona } from "@/lib/actions";

// Type for tone voice settings from DB
interface ToneVoiceSettings {
  formality: number;
  humor: number;
  enthusiasm: number;
  empathy: number;
  toneVoice?: string[];
  keywords?: string[];
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

export default async function DashboardPage() {
  // Fetch the latest brand persona from DB
  const persona = await getLatestBrandPersona();

  // If persona exists, show the persona dashboard
  if (persona) {
    const toneSettings = persona.tone_voice_settings as unknown as ToneVoiceSettings;
    const toneVoice = toneSettings.toneVoice || [];
    const keywords = toneSettings.keywords || [];

    return (
      <div className="p-6 space-y-8">
        {/* Welcome Section with Brand Name */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome to {persona.name} HQ 👋
              </h1>
              <p className="text-muted-foreground">
                브랜드 페르소나가 성공적으로 설정되었습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              데이터가 성공적으로 저장되었습니다!
            </p>
            <p className="text-sm text-muted-foreground">
              Client (Onboarding) → Server Action → Database → Server Component (Dashboard) 흐름 검증 완료
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">브랜드 페르소나</CardTitle>
              <Brain className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">
                활성화된 페르소나
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">지식 베이스</CardTitle>
              <Database className="h-4 w-4 text-fuchsia-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                학습된 문서
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">생성된 콘텐츠</CardTitle>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                이번 달
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">참여율</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--%</div>
              <p className="text-xs text-muted-foreground">
                평균 참여율
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Brand Persona Card - Data from DB */}
        <Card className="border-border/40 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-6 border-b border-border/40">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-semibold">{persona.name}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {persona.description}
                </p>
              </div>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-8">
            {/* Tone & Voice */}
            {toneVoice.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-violet-500" />
                  <h4 className="font-semibold">톤앤매너</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {toneVoice.map((tone, index) => (
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
            )}

            {toneVoice.length > 0 && <Separator className="bg-border/40" />}

            {/* Keywords */}
            {keywords.length > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-fuchsia-500" />
                    <h4 className="font-semibold">핵심 키워드</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
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
              </>
            )}

            {/* Target Audience & Brand Values */}
            <div className="grid md:grid-cols-2 gap-6">
              {persona.target_audience && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold">타겟 고객</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {persona.target_audience}
                  </p>
                </div>
              )}

              {persona.brand_values && persona.brand_values.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    <h4 className="font-semibold">브랜드 가치</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {persona.brand_values.map((value, index) => (
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
              )}
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
                    value={toneSettings[key] || 0.5}
                    low={styleLabels[key].low}
                    high={styleLabels[key].high}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">다음 단계</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/40 hover:border-fuchsia-500/50 transition-colors">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-fuchsia-500/10 mb-2">
                  <Database className="h-6 w-6 text-fuchsia-500" />
                </div>
                <CardTitle className="text-lg">지식 업로드</CardTitle>
                <CardDescription>
                  브랜드 자료, 가이드라인, FAQ를 업로드하여 AI를 학습시키세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  자료 업로드
                </Button>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-amber-500/50 transition-colors">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 mb-2">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">콘텐츠 생성</CardTitle>
                <CardDescription>
                  페르소나를 활용해 SNS 콘텐츠를 자동으로 생성하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/campaigns/create">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                    콘텐츠 만들기
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 hover:border-violet-500/50 transition-colors">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 mb-2">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">새 브랜드 추가</CardTitle>
                <CardDescription>
                  다른 브랜드의 페르소나도 분석하고 관리하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/onboarding">
                  <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                    브랜드 분석
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Default: No persona yet - show onboarding prompt
  return (
    <div className="p-6 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          안녕하세요! 👋
        </h1>
        <p className="text-muted-foreground">
          AI Marketer와 함께 브랜드 마케팅을 자동화하세요.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">브랜드 페르소나</CardTitle>
            <Brain className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              활성화된 페르소나
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">지식 베이스</CardTitle>
            <Database className="h-4 w-4 text-fuchsia-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              학습된 문서
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">생성된 콘텐츠</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              이번 달
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">참여율</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground">
              평균 참여율
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">시작하기</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand Onboarding - Primary Action */}
          <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 hover:border-violet-500/50 transition-colors">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 mb-2">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg">브랜드 분석하기</CardTitle>
              <CardDescription>
                웹사이트 URL을 입력하면 AI가 브랜드 페르소나를 자동으로 추출합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/onboarding">
                <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                  브랜드 분석 시작
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/40 hover:border-fuchsia-500/50 transition-colors">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-fuchsia-500/10 mb-2">
                <Database className="h-6 w-6 text-fuchsia-500" />
              </div>
              <CardTitle className="text-lg">지식 업로드</CardTitle>
              <CardDescription>
                브랜드 자료, 가이드라인, FAQ를 업로드하여 AI를 학습시키세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                자료 업로드
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 hover:border-amber-500/50 transition-colors opacity-60">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 mb-2">
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <CardTitle className="text-lg">콘텐츠 생성</CardTitle>
              <CardDescription>
                먼저 브랜드 분석을 완료해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                콘텐츠 만들기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
