"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { KeywordContent } from "@/lib/actions/keyword-actions";

const PUBLISH_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-200",
  review:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved:  "bg-blue-100 text-blue-700 border-blue-200",
  published: "bg-green-100 text-green-700 border-green-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  single: "일반", list: "목록", review: "후기", info: "정보", special: "기획",
};

interface Props {
  contents: KeywordContent[];
}

export function KeywordContentsTable({ contents }: Props) {
  const router = useRouter();

  if (contents.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        아직 이 키워드로 작성된 콘텐츠가 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">제목</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">타입</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">발행계정</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">글자수</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">최고순위</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">상태</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">구분</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">생성일</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {contents.map((c) => {
            const bestRank = Math.min(c.peak_rank_naver ?? 999, c.peak_rank_google ?? 999, c.peak_rank ?? 999);
            return (
              <tr
                key={c.id}
                onClick={() => router.push(`/ops/contents/${c.id}`)}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2.5 max-w-[200px]">
                  <p className="truncate font-medium text-sm">{c.title ?? "(제목 없음)"}</p>
                  {c.blog_account_name && (
                    <p className="text-muted-foreground mt-0.5 truncate">{c.blog_account_name}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {c.content_type ? CONTENT_TYPE_LABELS[c.content_type] ?? c.content_type : "—"}
                </td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">
                  {c.blog_account_name ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">
                  {c.word_count?.toLocaleString() ?? "—"}자
                </td>
                <td className="px-3 py-2.5 text-center">
                  {bestRank < 999 ? (
                    <span className={`font-semibold ${bestRank <= 3 ? "text-emerald-600" : bestRank <= 10 ? "text-amber-600" : "text-foreground"}`}>
                      {bestRank}위
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${PUBLISH_COLORS[c.publish_status] ?? ""}`}
                  >
                    {c.publish_status}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {c.generated_by === "human" ? "✍️" : "🤖"}
                </td>
                <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
