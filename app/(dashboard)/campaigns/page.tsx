import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Calendar,
  ImageIcon,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCampaigns, type Content } from "@/lib/actions/campaign-actions";

const statusConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  DRAFT: { label: "초안", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400", icon: FileText },
  SCHEDULED: { label: "예약됨", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: Clock },
  PUBLISHED: { label: "발행됨", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
};

function CampaignCard({ campaign }: { campaign: Content }) {
  const status = statusConfig[campaign.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;
  const scheduledDate = campaign.scheduled_at
    ? new Date(campaign.scheduled_at).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="h-full border-border/40 hover:border-violet-500/50 hover:shadow-lg transition-all cursor-pointer group">
        {/* Image Preview */}
        <div className="aspect-video bg-muted/50 rounded-t-lg overflow-hidden relative">
          {campaign.image_url ? (
            <img
              src={campaign.image_url}
              alt={campaign.topic}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          {/* Status Badge Overlay */}
          <div className="absolute top-3 right-3">
            <Badge className={`${status.color} gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-base line-clamp-1 group-hover:text-violet-500 transition-colors">
            {campaign.topic}
          </CardTitle>
          {scheduledDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {scheduledDate}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {campaign.caption}
          </p>
          {campaign.hashtags && campaign.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {campaign.hashtags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs text-violet-500 dark:text-violet-400"
                >
                  #{tag}
                </span>
              ))}
              {campaign.hashtags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{campaign.hashtags.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function CampaignsPage() {
  const result = await getCampaigns();
  const campaigns = result.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">캠페인 관리</h1>
          <p className="text-muted-foreground">
            생성된 콘텐츠를 관리하고 게시 일정을 설정하세요
          </p>
        </div>
        <Link href="/campaigns/create">
          <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
            <Plus className="h-4 w-4 mr-2" />
            새 콘텐츠
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === "DRAFT").length}
                </p>
                <p className="text-xs text-muted-foreground">초안</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === "SCHEDULED").length}
                </p>
                <p className="text-xs text-muted-foreground">예약됨</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === "PUBLISHED").length}
                </p>
                <p className="text-xs text-muted-foreground">발행됨</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Grid */}
      {campaigns.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <Card className="border-border/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 mb-4">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <CardTitle className="text-lg mb-2">아직 콘텐츠가 없습니다</CardTitle>
            <CardDescription className="text-center mb-6 max-w-sm">
              AI를 활용해 브랜드에 맞는 Instagram 콘텐츠를 생성해보세요.
            </CardDescription>
            <Link href="/campaigns/create">
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                <Sparkles className="h-4 w-4 mr-2" />
                첫 콘텐츠 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
