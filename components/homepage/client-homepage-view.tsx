"use client";

import { useState, useEffect } from "react";
import { Globe, Copy, ExternalLink, CheckCircle2, Clock, FileQuestion, Loader2, Sparkles } from "lucide-react";
import type { HomepageProject } from "@/lib/actions/homepage-actions";
import {
  TEMPLATE_NAMES,
  TEMPLATE_LABELS,
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_BG_COLORS,
} from "@/lib/homepage/generate/template-types";
import type { TemplateName } from "@/lib/homepage/generate/template-types";
import {
  createHomepageRequest,
  getMyHomepageRequests,
} from "@/lib/actions/homepage-request-actions";
import type { HomepageRequest } from "@/lib/actions/homepage-request-actions";

interface ClientHomepageViewProps {
  project: HomepageProject | null;
  clientId?: string;
}

// ── 신청 상태 뱃지 ──────────────────────────────────────────────────────

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "접수 완료", color: "bg-yellow-100 text-yellow-700" },
  generating: { label: "제작 중", color: "bg-blue-100 text-blue-700" },
  completed: { label: "제작 완료", color: "bg-emerald-100 text-emerald-700" },
  delivered: { label: "전달 완료", color: "bg-gray-100 text-gray-600" },
  failed: { label: "실패", color: "bg-red-100 text-red-700" },
};

// ── 템플릿 선택 + 신청 UI ───────────────────────────────────────────────

function TemplateRequestSection({ clientId }: { clientId: string }) {
  const [selected, setSelected] = useState<TemplateName | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<HomepageRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getMyHomepageRequests(clientId).then((data) => {
      setRequests(data);
      setLoadingRequests(false);
    });
  }, [clientId]);

  const handleSubmit = async () => {
    if (!selected || !clientId) return;
    setSubmitting(true);
    const result = await createHomepageRequest({
      clientId,
      templateName: selected,
      note: note || undefined,
    });
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      // 목록 새로고침
      const updated = await getMyHomepageRequests(clientId);
      setRequests(updated);
    } else {
      alert(result.error || "신청에 실패했습니다.");
    }
  };

  // 진행 중인 신청이 있으면 상태 표시
  const activeRequest = requests.find((r) => ["pending", "generating"].includes(r.status));

  return (
    <div className="space-y-6">
      {/* 진행 중인 신청 */}
      {activeRequest && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">제작 신청 진행 중</h3>
          </div>
          <div className="rounded-lg bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">선택 템플릿</span>
              <span className="text-sm font-medium">
                {TEMPLATE_LABELS[activeRequest.template_name as TemplateName] ?? activeRequest.template_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">상태</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REQUEST_STATUS[activeRequest.status]?.color ?? ""}`}>
                {REQUEST_STATUS[activeRequest.status]?.label ?? activeRequest.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">신청일</span>
              <span className="text-sm">
                {new Date(activeRequest.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            {activeRequest.note && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">요청사항</span>
                <p className="text-sm mt-0.5">{activeRequest.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 템플릿 선택 (진행 중인 신청 없을 때만) */}
      {!activeRequest && !submitted && (
        <>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold">홈페이지 제작 신청</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              원하시는 디자인 스타일을 선택하고 제작을 신청해 주세요.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATE_NAMES.map((name) => {
                const isSelected = selected === name;
                const bgColor = TEMPLATE_BG_COLORS[name];
                const isDark = bgColor === "#1a1a1a" || bgColor === "#050510";

                return (
                  <button
                    key={name}
                    onClick={() => setSelected(name)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : "border-border hover:border-border/80 hover:shadow-sm"
                    }`}
                  >
                    {/* 색상 미리보기 */}
                    <div
                      className="h-20 rounded-lg mb-3 flex items-center justify-center"
                      style={{ backgroundColor: bgColor }}
                    >
                      <span className={`text-xs font-medium tracking-wider ${isDark ? "text-white/60" : "text-black/30"}`}>
                        PREVIEW
                      </span>
                    </div>
                    <p className="font-medium text-sm">{TEMPLATE_LABELS[name]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TEMPLATE_DESCRIPTIONS[name]}
                    </p>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 요청사항 + 제출 */}
          {selected && (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  요청사항 <span className="text-muted-foreground font-normal">(선택)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="특별히 원하시는 사항이 있으면 적어주세요 (색상, 분위기 등)"
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    신청 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    홈페이지 제작 신청하기
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* 신청 완료 메시지 */}
      {submitted && !activeRequest && (
        <div className="rounded-xl border bg-emerald-50 border-emerald-200 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-emerald-800">제작 신청이 완료되었습니다!</p>
          <p className="text-sm text-emerald-600 mt-1">
            담당 매니저가 확인 후 제작을 시작합니다. 진행 상황을 이 페이지에서 확인하실 수 있습니다.
          </p>
        </div>
      )}

      {/* 이전 신청 이력 */}
      {!loadingRequests && requests.length > 0 && !activeRequest && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">신청 이력</h3>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="text-sm">
                    {TEMPLATE_LABELS[req.template_name as TemplateName] ?? req.template_name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(req.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REQUEST_STATUS[req.status]?.color ?? ""}`}>
                  {REQUEST_STATUS[req.status]?.label ?? req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────────────

export function ClientHomepageView({ project, clientId }: ClientHomepageViewProps) {
  const [copied, setCopied] = useState(false);

  // 홈페이지 없음 → 템플릿 선택 + 제작 신청 UI
  if (!project) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">홈페이지</h1>
          <p className="text-sm text-muted-foreground mt-1">브랜드 홈페이지 현황</p>
        </div>
        {clientId ? (
          <TemplateRequestSection clientId={clientId} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-20 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-semibold text-foreground">홈페이지가 아직 없습니다</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              홈페이지 제작을 원하시면 담당 매니저에게 문의해 주세요.
              <br />
              브랜드 분석 자료를 기반으로 맞춤형 홈페이지를 제작해 드립니다.
            </p>
          </div>
        )}
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
