"use client";

import { Building2, Calendar, CreditCard, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
