"use client";

import { useState } from "react";
import { PanelTop, Eye, ExternalLink, Check } from "lucide-react";

interface TemplateInfo {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  layout: string;
  preview: string;
  previewUrl: string;
  features: string[];
}

const SITES_BASE_URL = "/homepage/templates/preview";

const TEMPLATES: TemplateInfo[] = [
  {
    id: "remodeling",
    name: "리모델리아",
    subtitle: "아파트 리모델링 전문",
    description:
      "아파트멘터리 스타일. 미니멀한 화이트 배경에 블랙·옐로우 포인트. Spoqa Han Sans Neo 폰트와 포트폴리오 그리드 갤러리, 고객 후기 섹션으로 전문성과 신뢰를 전달합니다.",
    primaryColor: "#13130A",
    secondaryColor: "#FEEB8F",
    font: "Spoqa Han Sans Neo",
    layout: "3열 포트폴리오 그리드",
    preview: "A",
    previewUrl: `${SITES_BASE_URL}/templates/remodeling`,
    features: [
      "스티키 헤더 + 모바일 햄버거 메뉴",
      "30평대·구축 포트폴리오 그리드",
      "고객 후기 3열 카드",
      "카카오톡 플로팅 버튼",
    ],
  },
  {
    id: "wallpaper",
    name: "벽지마스터",
    subtitle: "도배·바닥재 시공 전문",
    description:
      "도배청년단 스타일. 밝은 화이트 배경에 블루(#3594f2) 포인트. Noto Sans KR 폰트, Hero 슬라이더, 시공사례 갤러리, 리뷰 캐러셀, 가격 안내 등 풍부한 콘텐츠 구성.",
    primaryColor: "#3594f2",
    secondaryColor: "#f5f5f5",
    font: "Noto Sans KR",
    layout: "Masonry 갤러리 + 슬라이더",
    preview: "B",
    previewUrl: `${SITES_BASE_URL}/templates/wallpaper`,
    features: [
      "Hero 이미지 슬라이더 (자동 전환)",
      "4개 서비스 카테고리 아이콘",
      "CSS Masonry 시공사례 갤러리",
      "별점 리뷰 캐러셀",
      "가격 안내 + 방염 비교",
      "3단 Footer (블루바·그레이·화이트)",
    ],
  },
  {
    id: "premium",
    name: "디자인랩",
    subtitle: "프리미엄 인테리어 디자인",
    description:
      "인테리어티쳐 스타일. 올 블랙 다크 테마에 그레이(#888) 포인트. Pretendard 폰트, 01~09 넘버링 섹션, Before/After 슬라이더, 3D 비교 등 하이엔드 브랜딩.",
    primaryColor: "#888888",
    secondaryColor: "#000000",
    font: "Pretendard",
    layout: "풀스크린 다크 + 넘버링 섹션",
    preview: "C",
    previewUrl: `${SITES_BASE_URL}/templates/premium`,
    features: [
      "풀 블랙 Hero (100dvh)",
      "Before/After 드래그 슬라이더",
      "01~09 넘버링 섹션 구성",
      "3D BEFORE/AFTER 비교",
      "SVG 세계지도 + 쇼룸 안내",
      "반응형 플로팅 CTA",
    ],
  },
];

export default function HomepageTemplatesPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">템플릿 관리</h2>
        <p className="mt-1 text-sm text-gray-500">
          홈페이지 프로젝트에 적용 가능한 인테리어 업종 전용 템플릿입니다.
          프로젝트 생성 시 선택하거나, 프로젝트 상세에서 변경할 수 있습니다.
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
                  tpl.id === "premium"
                    ? "#0A0A0A"
                    : tpl.id === "wallpaper"
                      ? "#f5f5f5"
                      : "#FFFFFF",
              }}
            >
              <div className="text-center">
                <span
                  className="text-4xl font-bold"
                  style={{ color: tpl.primaryColor, fontFamily: tpl.font }}
                >
                  {tpl.name}
                </span>
                <p
                  className="mt-2 text-xs font-medium"
                  style={{
                    color:
                      tpl.id === "premium" ? "#888888" : "#6B7280",
                  }}
                >
                  {tpl.subtitle}
                </p>
              </div>
              <a
                href={tpl.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-xs text-white backdrop-blur hover:bg-black/40 transition-colors"
              >
                <Eye className="h-3 w-3" />
                미리보기
              </a>
            </div>

            {/* 정보 영역 */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PanelTop className="h-4 w-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                </div>
                {selected === tpl.id && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                    <Check className="h-3 w-3" />
                    선택됨
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {tpl.description}
              </p>

              {/* 기능 목록 */}
              <div className="mt-3 space-y-1">
                {tpl.features.map((feat) => (
                  <div
                    key={feat}
                    className="flex items-center gap-1.5 text-xs text-gray-500"
                  >
                    <Check className="h-3 w-3 shrink-0 text-green-500" />
                    {feat}
                  </div>
                ))}
              </div>

              {/* 상세 스펙 */}
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
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

              {/* 프리뷰 버튼 */}
              <a
                href={tpl.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                라이브 미리보기
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
