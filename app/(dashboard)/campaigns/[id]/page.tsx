"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  ImageIcon,
  Loader2,
  Trash2,
  Check,
  Link as LinkIcon,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  type Content,
} from "@/lib/actions/campaign-actions";

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "초안", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  SCHEDULED: { label: "예약됨", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  PUBLISHED: { label: "발행됨", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Content | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Load campaign data
  useEffect(() => {
    async function loadCampaign() {
      const resolvedParams = await params;
      const result = await getCampaignById(resolvedParams.id);
      if (result.success && result.data) {
        setCampaign(result.data);
        setCaption(result.data.caption);
        setImageUrl(result.data.image_url || "");
        setScheduledAt(
          result.data.scheduled_at
            ? new Date(result.data.scheduled_at).toISOString().slice(0, 16)
            : ""
        );
      } else {
        toast.error("콘텐츠를 찾을 수 없습니다.");
        router.push("/campaigns");
      }
      setIsLoading(false);
    }
    loadCampaign();
  }, [params, router]);

  const handleSaveDraft = async () => {
    if (!campaign) return;

    setIsSaving(true);
    toast.loading("저장 중...", { id: "save" });

    const result = await updateCampaign(campaign.id, {
      caption,
      imageUrl: imageUrl || null,
    });

    if (result.success) {
      toast.success("저장되었습니다!", { id: "save" });
      setCampaign(result.data!);
    } else {
      toast.error(result.error || "저장에 실패했습니다.", { id: "save" });
    }

    setIsSaving(false);
  };

  const handleSchedule = async () => {
    if (!campaign || !scheduledAt) {
      toast.error("발행 일시를 선택해주세요.");
      return;
    }

    setIsSaving(true);
    toast.loading("예약 중...", { id: "schedule" });

    const result = await updateCampaign(campaign.id, {
      caption,
      imageUrl: imageUrl || null,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: "SCHEDULED",
    });

    if (result.success) {
      toast.success("게시물이 예약되었습니다!", { id: "schedule" });
      setCampaign(result.data!);
    } else {
      toast.error(result.error || "예약에 실패했습니다.", { id: "schedule" });
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!campaign) return;

    if (!confirm("정말로 이 콘텐츠를 삭제하시겠습니까?")) return;

    setIsDeleting(true);
    toast.loading("삭제 중...", { id: "delete" });

    const result = await deleteCampaign(campaign.id);

    if (result.success) {
      toast.success("삭제되었습니다!", { id: "delete" });
      router.push("/campaigns");
    } else {
      toast.error(result.error || "삭제에 실패했습니다.", { id: "delete" });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const status = statusConfig[campaign.status] || statusConfig.DRAFT;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{campaign.topic}</h1>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              생성일: {new Date(campaign.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Caption Editor */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-violet-500" />
              캡션 편집
            </CardTitle>
            <CardDescription>
              Instagram에 게시될 캡션을 편집하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full min-h-[200px] p-3 rounded-lg border border-border/40 bg-background/50 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm leading-relaxed"
              placeholder="캡션을 입력하세요..."
            />

            {/* Hashtags */}
            {campaign.hashtags && campaign.hashtags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">해시태그</Label>
                <div className="flex flex-wrap gap-2">
                  {campaign.hashtags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Image Prompt (read-only) */}
            {campaign.image_prompt && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">이미지 프롬프트</Label>
                <div className="p-3 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20">
                  <p className="text-xs text-muted-foreground">
                    {campaign.image_prompt}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Image & Scheduling */}
        <div className="space-y-6">
          {/* Image Upload */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-fuchsia-500" />
                이미지
              </CardTitle>
              <CardDescription>
                게시물에 첨부할 이미지 URL을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Preview */}
              <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden border border-border/40">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">이미지 미리보기</p>
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">이미지 URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  직접 업로드는 추후 지원 예정입니다
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                발행 예약
              </CardTitle>
              <CardDescription>
                게시물 발행 일시를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">발행 일시</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="pl-10"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              {campaign.status === "SCHEDULED" && campaign.scheduled_at && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Check className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    {new Date(campaign.scheduled_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    에 발행 예정
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end sticky bottom-6">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="h-12 px-6"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Save className="mr-2 h-5 w-5" />
          )}
          초안 저장
        </Button>
        <Button
          onClick={handleSchedule}
          disabled={isSaving || !scheduledAt}
          className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-5 w-5" />
          )}
          발행 예약
        </Button>
      </div>
    </div>
  );
}
