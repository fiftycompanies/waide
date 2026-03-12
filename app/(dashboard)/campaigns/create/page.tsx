"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Save,
  ImageIcon,
  Hash,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { generateCampaignContent, saveToLibrary, type GeneratedContent } from "@/lib/actions/content-actions";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [toneAdjustment, setToneAdjustment] = useState(0.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("주제를 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    toast.loading("AI가 콘텐츠를 생성하고 있습니다...", { id: "generate" });

    try {
      const result = await generateCampaignContent(topic, toneAdjustment);

      if (result.success && result.data) {
        setGeneratedContent(result.data);
        setEditedCaption(result.data.caption);
        toast.success("콘텐츠가 생성되었습니다!", { id: "generate" });
      } else {
        toast.error(result.error || "콘텐츠 생성에 실패했습니다.", { id: "generate" });
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast.error("콘텐츠 생성 중 오류가 발생했습니다.", { id: "generate" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;

    setIsSaving(true);
    toast.loading("라이브러리에 저장 중...", { id: "save" });

    try {
      const result = await saveToLibrary({
        ...generatedContent,
        caption: editedCaption,
        topic: topic, // Include the topic
      });

      if (result.success) {
        toast.success("라이브러리에 저장되었습니다!", { id: "save" });
        // Redirect to campaigns page
        router.push("/campaigns");
      } else {
        toast.error(result.error || "저장에 실패했습니다.", { id: "save" });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장 중 오류가 발생했습니다.", { id: "save" });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string, type: "caption" | "prompt") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "caption") {
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
      } else {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      }
      toast.success("클립보드에 복사되었습니다!");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const getToneLabel = (value: number) => {
    if (value < 0.3) return "위트있는 😄";
    if (value > 0.7) return "전문적인 💼";
    return "균형잡힌 ⚖️";
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">콘텐츠 생성</h1>
          <p className="text-muted-foreground">
            AI가 브랜드 페르소나에 맞는 Instagram 콘텐츠를 생성합니다
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>주제 입력</CardTitle>
                <CardDescription>어떤 내용의 게시물을 만들까요?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">게시물 주제</Label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 여름 휴가 시즌 특별 프로모션, 가족과 함께하는 풀빌라 여행"
                className="w-full min-h-[120px] p-3 rounded-lg border border-border/40 bg-background/50 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                구체적인 주제일수록 더 좋은 결과물이 나옵니다
              </p>
            </div>

            {/* Tone Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>톤 조절</Label>
                <span className="text-sm font-medium text-violet-500">
                  {getToneLabel(toneAdjustment)}
                </span>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={toneAdjustment}
                  onChange={(e) => setToneAdjustment(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>위트있는</span>
                  <span>전문적인</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full h-12 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  콘텐츠 생성하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <div className="space-y-6">
          {/* Caption Card */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  <CardTitle className="text-lg">캡션</CardTitle>
                </div>
                {generatedContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(editedCaption, "caption")}
                  >
                    {copiedCaption ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-[85%]" />
                </div>
              ) : generatedContent ? (
                <div className="space-y-4">
                  <textarea
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    className="w-full min-h-[160px] p-3 rounded-lg border border-border/40 bg-background/50 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm leading-relaxed"
                  />
                  {/* Hashtags */}
                  {generatedContent.hashtags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>추천 해시태그</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {generatedContent.hashtags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-violet-500/10 text-violet-600 dark:text-violet-400 cursor-pointer hover:bg-violet-500/20"
                            onClick={() => {
                              navigator.clipboard.writeText(`#${tag}`);
                              toast.success(`#${tag} 복사됨`);
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-muted-foreground">
                  주제를 입력하고 생성 버튼을 클릭하세요
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Prompt Card */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-fuchsia-500" />
                  <CardTitle className="text-lg">이미지 프롬프트</CardTitle>
                </div>
                {generatedContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.imagePrompt, "prompt")}
                  >
                    {copiedPrompt ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <CardDescription>
                DALL-E, Midjourney 등에서 사용할 수 있는 이미지 생성 프롬프트
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
              ) : generatedContent ? (
                <div className="p-4 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {generatedContent.imagePrompt}
                  </p>
                </div>
              ) : (
                <div className="h-[80px] flex items-center justify-center text-muted-foreground">
                  콘텐츠 생성 시 이미지 프롬프트가 표시됩니다
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          {generatedContent && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="outline"
              className="w-full h-12 border-violet-500/30 hover:bg-violet-500/10"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  라이브러리에 저장
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
