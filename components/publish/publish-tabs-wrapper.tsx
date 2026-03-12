"use client";

import { useRouter } from "next/navigation";
import { Clock, History, Settings } from "lucide-react";

type TabKey = "pending" | "history" | "auto";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "pending", label: "발행 대기", icon: Clock },
  { key: "history", label: "발행 이력", icon: History },
  { key: "auto",    label: "자동 발행 설정", icon: Settings },
];

interface PublishTabsWrapperProps {
  activeTab: TabKey;
  children: React.ReactNode;
}

export function PublishTabsWrapper({ activeTab, children }: PublishTabsWrapperProps) {
  const router = useRouter();

  function handleTabChange(tab: TabKey) {
    router.push(`/publish?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-border/60 pb-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
