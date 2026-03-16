"use client";

import { useRouter } from "next/navigation";
import { FileText, Sparkles, Clock, Settings2, Key } from "lucide-react";

type TabKey = "list" | "recommend" | "history" | "keyword_history" | "auto" | "publish";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "list",            label: "콘텐츠 목록",     icon: FileText },
  { key: "recommend",       label: "발행 추천",       icon: Sparkles },
  { key: "history",         label: "발행 이력",       icon: Clock },
  { key: "keyword_history", label: "키워드 이력",     icon: Key },
  { key: "auto",            label: "자동 발행 설정",  icon: Settings2 },
];

interface ContentsTabsWrapperProps {
  activeTab: TabKey;
  children: React.ReactNode;
}

export function ContentsTabsWrapper({ activeTab, children }: ContentsTabsWrapperProps) {
  const router = useRouter();

  function handleTabChange(tab: TabKey) {
    router.push(`/contents?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-border/60 pb-0 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
