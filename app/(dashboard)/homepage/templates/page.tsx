"use client";

import { useState } from "react";
import { PanelTop, Eye } from "lucide-react";

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  layout: string;
  preview: string;
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: "modern-minimal",
    name: "모던 미니멀",
    description: "깔끔한 화이트 배경에 블루 포인트. 3열 그리드 갤러리와 심플한 애니메이션으로 전문성을 강조합니다.",
    primaryColor: "#2563eb",
    secondaryColor: "#059669",
    font: "Pretendard",
    layout: "3열 그리드",
    preview: "A",
  },
  {
    id: "natural-wood",
    name: "내추럴 우드",
    description: "따뜻한 웜화이트 배경에 우드브라운 포인트. Noto Serif KR 제목 폰트와 2열 카드 갤러리로 자연스러운 감성을 전달합니다.",
    primaryColor: "#8B6914",
    secondaryColor: "#6B7B3A",
    font: "Noto Serif KR",
    layout: "2열 카드",
    preview: "B",
  },
  {
    id: "premium-dark",
    name: "프리미엄 다크",
    description: "다크 배경에 골드 포인트. Playfair Display 제목 폰트와 풀스크린 갤러리로 고급스러운 분위기를 연출합니다.",
    primaryColor: "#C9A96E",
    secondaryColor: "#0A0A0A",
    font: "Playfair Display",
    layout: "풀스크린 갤러리",
    preview: "C",
  },
];

export default function HomepageTemplatesPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">템플릿 관리</h2>
        <p className="mt-1 text-sm text-gray-500">
          홈페이지 프로젝트에 적용 가능한 템플릿 3종입니다. 프로젝트 생성 시 선택하거나, 프로젝트 상세에서 변경할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <div
            key={tpl.id}
            onClick={() => setSelected(selected === tpl.id ? null : tpl.id)}
            className={`cursor-pointer rounded-xl border-2 bg-white transition-all hover:shadow-lg ${
              selected === tpl.id
                ? "border-blue-500 shadow-lg"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {/* 프리뷰 영역 */}
            <div
              className="relative flex h-48 items-center justify-center rounded-t-xl"
              style={{
                background:
                  tpl.id === "premium-dark"
                    ? "#0A0A0A"
                    : tpl.id === "natural-wood"
                    ? "#FEFCF9"
                    : "#FFFFFF",
              }}
            >
              <div className="text-center">
                <span
                  className="text-5xl font-bold"
                  style={{ color: tpl.primaryColor, fontFamily: tpl.font }}
                >
                  {tpl.preview}
                </span>
                <p
                  className="mt-2 text-sm font-medium"
                  style={{
                    color:
                      tpl.id === "premium-dark" ? "#F5F0EB" : "#6B7280",
                  }}
                >
                  Template {tpl.preview}
                </p>
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/10 px-2 py-1 text-xs text-white backdrop-blur">
                <Eye className="h-3 w-3" />
                미리보기
              </div>
            </div>

            {/* 정보 영역 */}
            <div className="p-5">
              <div className="flex items-center gap-2">
                <PanelTop className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {tpl.description}
              </p>

              {/* 상세 스펙 */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">색상</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: tpl.primaryColor }}
                    />
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: tpl.secondaryColor }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">폰트</span>
                  <span className="text-gray-700">{tpl.font}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">레이아웃</span>
                  <span className="text-gray-700">{tpl.layout}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ID</span>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {tpl.id}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
