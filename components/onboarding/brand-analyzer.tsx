"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonaResult } from "./persona-result";
import { saveBrandPersona, type PersonaData } from "@/lib/actions";

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

interface AnalysisResult {
  url: string;
  scrapedTitle: string;
  persona: BrandPersona;
}

export function BrandAnalyzer() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    // Reset states
    setError(null);
    setResult(null);

    // Validate URL
    if (!url.trim()) {
      setError("웹사이트 URL을 입력해주세요.");
      return;
    }

    // Add https:// if missing
    let processedUrl = url.trim();
    if (!processedUrl.startsWith("http://") && !processedUrl.startsWith("https://")) {
      processedUrl = "https://" + processedUrl;
    }

    // Basic URL validation
    try {
      new URL(processedUrl);
    } catch {
      setError("올바른 URL 형식을 입력해주세요. (예: https://example.com)");
      return;
    }

    setIsLoading(true);
    toast.loading("웹사이트를 분석하고 있습니다...", { id: "analyze" });

    try {
      const response = await fetch("/api/brand/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: processedUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "분석에 실패했습니다.");
      }

      setResult(data.data);
      toast.success("브랜드 분석이 완료되었습니다!", { id: "analyze" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.";
      setError(errorMessage);
      toast.error(errorMessage, { id: "analyze" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePersona = async () => {
    if (!result) return;

    setIsSaving(true);
    toast.loading("페르소나를 저장하고 있습니다...", { id: "save" });

    try {
      const personaData: PersonaData = {
        url: result.url,
        scrapedTitle: result.scrapedTitle,
        persona: result.persona,
      };

      const response = await saveBrandPersona(personaData);

      if (response.success && response.redirectUrl) {
        toast.success("페르소나가 저장되었습니다! 대시보드로 이동합니다.", { id: "save" });
        router.push(response.redirectUrl);
      } else {
        toast.error(response.error || "저장에 실패했습니다.", { id: "save" });
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("저장 중 오류가 발생했습니다.", { id: "save" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* URL Input Card */}
      <Card className="border-border/40 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">브랜드 분석하기</CardTitle>
              <CardDescription>
                웹사이트 URL을 입력하면 AI가 브랜드 페르소나를 추출합니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://your-website.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
                className="pl-10 h-12 bg-background/50"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !url.trim()}
              className="h-12 px-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  분석하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}

          {isLoading && (
            <div className="mt-6 p-6 rounded-lg bg-muted/50 border border-border/40">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">AI가 웹사이트를 분석하고 있습니다...</p>
                  <p className="text-xs text-muted-foreground">
                    콘텐츠 추출 및 브랜드 페르소나 생성 중 (약 10-20초 소요)
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <PersonaResult
          result={result}
          onSave={handleSavePersona}
          onReset={handleReset}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
