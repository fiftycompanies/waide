"use client";

import { useState } from "react";
import { Globe, Copy, ExternalLink, CheckCircle2, Clock, FileQuestion } from "lucide-react";
import type { HomepageProject } from "@/lib/actions/homepage-actions";

interface ClientHomepageViewProps {
  project: HomepageProject | null;
}

export function ClientHomepageView({ project }: ClientHomepageViewProps) {
  const [copied, setCopied] = useState(false);

  // 홈페이지 없음
  if (!project) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">홈페이지</h1>
          <p className="text-sm text-muted-foreground mt-1">브랜드 홈페이지 현황</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-20 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-semibold text-foreground">홈페이지가 아직 없습니다</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            홈페이지 제작을 원하시면 담당 매니저에게 문의해 주세요.
            <br />
            브랜드 분석 자료를 기반으로 맞춤형 홈페이지를 제작해 드립니다.
          </p>
        </div>
      </div>
    );
  }

  // 홈페이지 있음, status !== live
  if (project.status !== "live") {
    const statusMessages: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
      collecting: {
        icon: <Clock className="h-12 w-12 text-yellow-500/60" />,
        title: "자료 수집 중입니다",
        desc: "홈페이지 제작에 필요한 자료를 수집하고 있습니다. 곧 완료될 예정입니다.",
      },
      building: {
        icon: <Clock className="h-12 w-12 text-blue-500/60" />,
        title: "홈페이지를 제작 중입니다",
        desc: "수집된 자료를 바탕으로 홈페이지를 제작하고 있습니다. 완료되면 안내드리겠습니다.",
      },
      preview: {
        icon: <Clock className="h-12 w-12 text-purple-500/60" />,
        title: "홈페이지 검수 중입니다",
        desc: "홈페이지 제작이 완료되어 최종 검수를 진행하고 있습니다. 곧 공개됩니다.",
      },
      suspended: {
        icon: <Clock className="h-12 w-12 text-gray-400" />,
        title: "홈페이지가 일시 중단되었습니다",
        desc: "홈페이지 서비스가 일시 중단된 상태입니다. 자세한 내용은 담당 매니저에게 문의해 주세요.",
      },
    };

    const msg = statusMessages[project.status] ?? statusMessages.building;

    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">홈페이지</h1>
          <p className="text-sm text-muted-foreground mt-1">브랜드 홈페이지 현황</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-card py-16 text-center">
          {msg.icon}
          <p className="text-lg font-semibold text-foreground mt-4">{msg.title}</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">{msg.desc}</p>
        </div>
      </div>
    );
  }

  // 홈페이지 status === live
  const deploymentUrl = project.vercel_deployment_url
    || (project.subdomain ? `https://${project.subdomain}.waide.kr` : null);

  const handleCopy = async () => {
    if (!deploymentUrl) return;
    await navigator.clipboard.writeText(deploymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">홈페이지</h1>
        <p className="text-sm text-muted-foreground mt-1">브랜드 홈페이지 현황</p>
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-6">
        {/* 상태 배지 */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Globe className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-lg">{project.project_name}</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              라이브
            </span>
          </div>
        </div>

        {/* 배포 URL */}
        {deploymentUrl && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">홈페이지 주소</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-muted/30 text-sm font-mono">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{deploymentUrl}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    복사
                  </>
                )}
              </button>
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
                미리보기
              </a>
            </div>
          </div>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">총 방문수</p>
            <p className="text-xl font-bold mt-0.5">{project.total_visits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">상담 신청</p>
            <p className="text-xl font-bold mt-0.5">{project.total_inquiries}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">마지막 배포</p>
            <p className="text-sm font-medium mt-1">
              {project.last_deployed_at
                ? new Date(project.last_deployed_at).toLocaleDateString("ko-KR")
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
