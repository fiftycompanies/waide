"use client";

interface VisibilityRow {
  keyword_id: string;
  keyword?: string;
  rank: number | null;
  mentionCount: number;
}

interface Props {
  title: string;
  rows: VisibilityRow[];
  platform: "naver" | "google";
}

export default function ExposureTable({ title, rows, platform }: Props) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="text-left py-2 font-medium">키워드</th>
                <th className="text-center py-2 font-medium w-14">노출</th>
                <th className="text-center py-2 font-medium w-16">순위</th>
                <th className="text-left py-2 font-medium pl-4">점유율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct = Math.round((row.mentionCount / 20) * 100);
                const isExposed = row.rank != null && row.rank > 0;
                return (
                  <tr key={row.keyword_id} className="border-b last:border-0">
                    <td className="py-2.5 text-gray-800 font-medium">
                      {row.keyword || "-"}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          isExposed ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      />
                    </td>
                    <td className="py-2.5 text-center">
                      {row.rank != null ? (
                        <span
                          className={`font-medium ${
                            row.rank <= 3
                              ? "text-emerald-600"
                              : row.rank <= 10
                                ? "text-blue-600"
                                : "text-gray-600"
                          }`}
                        >
                          {row.rank}위
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              platform === "naver"
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {pct}%{" "}
                          <span className="text-gray-300">
                            ({row.mentionCount}/20)
                          </span>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
