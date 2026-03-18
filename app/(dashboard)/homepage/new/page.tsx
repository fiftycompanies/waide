"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { createHomepageProject } from "@/lib/actions/homepage-actions";

const TEMPLATES = [
  {
    id: "modern-minimal",
    name: "모던 미니멀",
    description: "깔끔하고 전문적인 화이트 톤. 20-30대 타겟.",
    colors: ["#ffffff", "#2563eb", "#10b981"],
    font: "Pretendard",
  },
  {
    id: "natural-wood",
    name: "내추럴 우드",
    description: "따뜻한 감성의 우드 톤. 신혼/가족 타겟.",
    colors: ["#FEFCF9", "#8B6F47", "#6B8E4E"],
    font: "Noto Serif KR",
  },
  {
    id: "premium-dark",
    name: "프리미엄 다크",
    description: "고급스러운 다크 톤. 40-50대 고소득 타겟.",
    colors: ["#0A0A0A", "#C9A96E", "#F5F5F5"],
    font: "Playfair Display",
  },
];

export default function NewHomepageProjectPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("modern-minimal");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      setError("클라이언트 ID를 입력해주세요");
      return;
    }
    if (!projectName.trim()) {
      setError("프로젝트명을 입력해주세요");
      return;
    }

    startTransition(async () => {
      const result = await createHomepageProject({
        clientId: clientId.trim(),
        projectName: projectName.trim(),
        templateId: selectedTemplate,
      });

      if (result.success && result.id) {
        router.push(`/homepage/${result.id}`);
      } else {
        setError(result.error || "프로젝트 생성에 실패했습니다");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/homepage"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">새 홈페이지 프로젝트</h1>
          <p className="text-sm text-muted-foreground mt-1">
            인테리어 업체의 홈페이지를 생성합니다
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div className="border rounded-lg p-4 bg-card space-y-4">
          <h2 className="font-semibold">기본 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1">클라이언트 ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="클라이언트 UUID 입력"
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              기존 waide-mkt 클라이언트의 ID를 입력합니다
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">프로젝트명</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="예: 강남인테리어 홈페이지"
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>

        {/* Template Selection */}
        <div className="border rounded-lg p-4 bg-card space-y-4">
          <h2 className="font-semibold">템플릿 선택</h2>

          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`border rounded-lg p-3 text-left transition-all ${
                  selectedTemplate === tpl.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
              >
                {/* Color Preview */}
                <div className="flex gap-1 mb-2">
                  {tpl.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className="font-medium text-sm">{tpl.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  폰트: {tpl.font}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              프로젝트 생성
            </>
          )}
        </button>
      </form>
    </div>
  );
}
