"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingCheckModalProps {
  clientId: string | null;
  clientName: string | null;
  onboardingStatus: string | null;
  hasBrandPersona: boolean;
}

export function OnboardingCheckModal({
  clientId,
  clientName,
  onboardingStatus,
  hasBrandPersona,
}: OnboardingCheckModalProps) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    // 온보딩 완료 체크: onboarding_status가 completed이거나 brand_persona가 있으면 완료
    const isCompleted = onboardingStatus === "completed" || hasBrandPersona;
    if (isCompleted) return;

    // 세션당 1회만 표시
    const key = `onboarding_dismissed_${clientId}`;
    if (sessionStorage.getItem(key)) return;

    setShow(true);
  }, [clientId, onboardingStatus, hasBrandPersona]);

  if (!show || !clientId) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(`onboarding_dismissed_${clientId}`, "1");
    setShow(false);
  };

  const handleStart = () => {
    sessionStorage.setItem(`onboarding_dismissed_${clientId}`, "1");
    setShow(false);
    router.push("/onboarding");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
              <Rocket className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">온보딩 미완료</h2>
              <p className="text-sm text-muted-foreground">{clientName || "선택된 브랜드"}</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          이 브랜드의 마케팅 분석이 아직 완료되지 않았습니다.
          URL 기반 분석을 실행하면 브랜드 페르소나와 키워드 전략이 자동 생성됩니다.
        </p>

        <div className="flex gap-2">
          <Button onClick={handleStart} className="flex-1 bg-violet-600 hover:bg-violet-700">
            <Rocket className="h-4 w-4 mr-2" />
            지금 분석 시작하기
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            나중에 하기
          </Button>
        </div>
      </div>
    </div>
  );
}
