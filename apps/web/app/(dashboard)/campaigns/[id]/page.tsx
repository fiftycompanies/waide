import { createAdminClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CAMPAIGN_STATUS_KO: Record<string, string> = {
  draft: "초안",
  active: "진행중",
  paused: "일시정지",
  completed: "완료",
  cancelled: "취소",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const JOB_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  DONE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
};

const AGENT_LABELS: Record<string, string> = {
  CMO: "CMO",
  COPYWRITER: "COPYWRITER",
  OPS_QUALITY: "QC",
  OPS_PUBLISHER: "PUBLISHER",
  RND: "R&D",
};

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign } = await (db as any)
    .from("campaigns")
    .select("id, title, status, created_at, keyword_id, strategy_brief")
    .eq("id", id)
    .single();

  if (!campaign) notFound();

  // Fetch related jobs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobs } = await (db as any)
    .from("jobs")
    .select("id, title, assigned_agent, job_type, status, created_at, updated_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(campaign.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-2 text-[10px]"
        >
          {CAMPAIGN_STATUS_KO[campaign.status] ?? campaign.status}
        </Badge>
      </div>

      {campaign.strategy_brief && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-800 whitespace-pre-wrap">
          {campaign.strategy_brief}
        </div>
      )}

      {/* Jobs 파이프라인 */}
      <div>
        <h2 className="text-sm font-semibold mb-3">에이전트 파이프라인</h2>
        {!jobs || jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">연결된 Job이 없습니다.</p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3 text-left">Job 제목</th>
                  <th className="px-4 py-3 text-center">에이전트</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-right">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(jobs as Array<{
                  id: string;
                  title: string;
                  assigned_agent: string;
                  job_type: string;
                  status: string;
                  created_at: string;
                  updated_at: string;
                }>).map((job) => (
                  <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm">{job.title}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">
                        {AGENT_LABELS[job.assigned_agent] ?? job.assigned_agent}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 ${JOB_STATUS_COLORS[job.status] ?? ""}`}
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
