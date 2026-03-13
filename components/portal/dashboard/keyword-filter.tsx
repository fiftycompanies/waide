"use client";

interface Keyword {
  id: string;
  keyword: string;
  is_primary: boolean;
}

interface Props {
  keywords: Keyword[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function KeywordFilter({ keywords, selectedId, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selectedId === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        전체
      </button>
      {keywords.map((kw) => (
        <button
          key={kw.id}
          onClick={() => onSelect(kw.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedId === kw.id
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {kw.is_primary && "★ "}
          {kw.keyword}
        </button>
      ))}
    </div>
  );
}
