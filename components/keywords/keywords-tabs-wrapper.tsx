"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Key, MessageCircle } from "lucide-react";

interface KeywordsTabsWrapperProps {
  activeTab: string;
  questionCount: number;
  children: React.ReactNode;
}

const TABS = [
  { key: "keywords", label: "키워드", icon: Key },
  { key: "questions", label: "질문 확장", icon: MessageCircle },
];

export function KeywordsTabsWrapper({ activeTab, questionCount, children }: KeywordsTabsWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTabChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "keywords") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/keywords${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {key === "questions" && questionCount > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activeTab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {questionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {children}
    </>
  );
}
