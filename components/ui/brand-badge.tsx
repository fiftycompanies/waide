// ── 브랜드 배지 공유 컴포넌트 ─────────────────────────────────────────────────
// 전체 보기 모드에서 각 행의 소속 브랜드를 표시합니다.

const BRAND_COLOR_SETS = [
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
  { bg: "bg-emerald-100",text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
  { bg: "bg-rose-100",   text: "text-rose-700",   border: "border-rose-200" },
  { bg: "bg-sky-100",    text: "text-sky-700",    border: "border-sky-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
];

/** 브랜드명에서 결정론적으로 색상 인덱스 계산 */
function hashIndex(name: string): number {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % BRAND_COLOR_SETS.length;
}

interface BrandBadgeProps {
  name: string;
  className?: string;
}

export function BrandBadge({ name, className = "" }: BrandBadgeProps) {
  const color = BRAND_COLOR_SETS[hashIndex(name)];
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap
        ${color.bg} ${color.text} ${color.border} ${className}`}
    >
      {name}
    </span>
  );
}

/** 브랜드 목록으로 색상 맵 생성 (인덱스 기반) */
export function buildBrandColorMap(brands: { id: string; name: string }[]): Map<string, (typeof BRAND_COLOR_SETS)[0]> {
  const map = new Map<string, (typeof BRAND_COLOR_SETS)[0]>();
  brands.forEach((b, i) => {
    map.set(b.id, BRAND_COLOR_SETS[i % BRAND_COLOR_SETS.length]);
  });
  return map;
}
