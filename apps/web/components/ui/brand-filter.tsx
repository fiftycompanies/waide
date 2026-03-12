"use client";

export interface BrandOption {
  id: string;
  name: string;
}

interface BrandFilterProps {
  brands: BrandOption[];
  selected: string[];        // selected client_ids ([] = 전체)
  onChange: (ids: string[]) => void;
}

export function BrandFilter({ brands, selected, onChange }: BrandFilterProps) {
  if (brands.length === 0) return null;

  const isAll = selected.length === 0;

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center py-2 px-1">
      <span className="text-xs text-muted-foreground shrink-0">브랜드:</span>
      <button
        onClick={() => onChange([])}
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
          isAll
            ? "border-violet-300 bg-violet-600 text-white"
            : "border-border bg-muted text-muted-foreground hover:bg-muted/70"
        }`}
      >
        전체
      </button>
      {brands.map((b) => {
        const active = selected.includes(b.id);
        return (
          <button
            key={b.id}
            onClick={() => toggle(b.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              active
                ? "border-violet-300 bg-violet-600 text-white"
                : "border-border bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {b.name}
          </button>
        );
      })}
    </div>
  );
}
