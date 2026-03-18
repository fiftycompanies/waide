"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Calendar, CreditCard, Globe, Hammer, MessageSquare, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestFreeHomepage, requestMarketingConsultation } from "@/lib/actions/dashboard-cta-actions";

export interface BrandInfo {
  id: string;
  name: string;
  status: string | null;
  onboarding_status: string | null;
  client_type: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  sales_agent_name: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "비활성", color: "bg-slate-100 text-slate-600" },
  churned: { label: "이탈", color: "bg-red-100 text-red-700" },
};

const ONBOARDING_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "진행 중", color: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", color: "bg-emerald-100 text-emerald-700" },
};

export function BrandInfoCard({ brand }: { brand: BrandInfo }) {
  const status = STATUS_MAP[brand.status ?? ""] ?? { label: brand.status ?? "미설정", color: "bg-slate-100 text-slate-600" };
  const onboarding = ONBOARDING_MAP[brand.onboarding_status ?? ""] ?? { label: "미시작", color: "bg-slate-100 text-slate-600" };

  return (
    <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-100">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{brand.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                <Badge className={`text-[10px] ${onboarding.color}`}>온보딩: {onboarding.label}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">플랜:</span>
            <span className="font-medium">{brand.plan_name || "없음"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">담당:</span>
            <span className="font-medium">{brand.sales_agent_name || "없음"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">등록:</span>
            <span className="font-medium">{new Date(brand.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
          {brand.subscription_status && (
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">구독:</span>
              <span className="font-medium capitalize">{brand.subscription_status}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 고객 대시보드 CTA 배너 ──────────────────────────────────────────────────

export interface ClientCtaBannerProps {
  homepageStatus: "none" | "in_progress" | "live";
  homepageUrl: string | null;
}

export function ClientCtaBanner({ homepageStatus, homepageUrl }: ClientCtaBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleHomepageRequest = () => {
    startTransition(async () => {
      const result = await requestFreeHomepage();
      if (result.success) {
        toast.success("홈페이지 제작이 신청되었습니다! 담당자가 곧 연락드립니다.");
      } else {
        toast.error(result.error || "신청에 실패했습니다.");
      }
    });
  };

  const handleMarketingConsultation = () => {
    startTransition(async () => {
      const result = await requestMarketingConsultation();
      if (result.success) {
        toast.success("마케팅 상담이 신청되었습니다! 전문가가 곧 연락드립니다.");
      } else {
        toast.error(result.error || "상담 신청에 실패했습니다.");
      }
    });
  };

  const handleViewProgress = () => {
    router.push("/homepage");
  };

  const handleVisitHomepage = () => {
    if (homepageUrl) {
      window.open(homepageUrl, "_blank");
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
      <CardContent className="p-5">
        {/* 상태별 안내 메시지 */}
        {homepageStatus === "none" && (
          <p className="text-sm text-muted-foreground mb-4">
            홈페이지를 만들면 검색 노출과 고객 유입을 동시에 관리할 수 있어요
          </p>
        )}
        {homepageStatus === "in_progress" && (
          <p className="text-sm text-muted-foreground mb-4">
            홈페이지 제작이 진행 중이에요
          </p>
        )}
        {homepageStatus === "live" && (
          <p className="text-sm text-muted-foreground mb-4">
            홈페이지가 운영 중이에요
          </p>
        )}

        {/* 버튼 2개 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 왼쪽 버튼: 홈페이지 상태에 따라 전환 */}
          {homepageStatus === "none" && (
            <Button
              onClick={handleHomepageRequest}
              disabled={isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Globe className="h-4 w-4 mr-2" />
              무료 홈페이지 제작
            </Button>
          )}
          {homepageStatus === "in_progress" && (
            <Button
              onClick={handleViewProgress}
              disabled={isPending}
              variant="outline"
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Hammer className="h-4 w-4 mr-2" />
              제작 현황 보기
            </Button>
          )}
          {homepageStatus === "live" && (
            <Button
              onClick={handleVisitHomepage}
              disabled={isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Globe className="h-4 w-4 mr-2" />
              홈페이지 바로가기
            </Button>
          )}

          {/* 오른쪽 버튼: 항상 동일 */}
          <Button
            onClick={handleMarketingConsultation}
            disabled={isPending}
            variant="outline"
            className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            전문 마케팅 상담
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
