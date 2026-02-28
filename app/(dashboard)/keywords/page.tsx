import { getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { getKeywords } from "@/lib/actions/keyword-actions";
import { getKeywordStrategy } from "@/lib/actions/keyword-strategy-actions";
import { KeywordsClient } from "@/components/keywords/keywords-client";
import { KeywordStrategySection } from "@/components/keywords/keyword-strategy-section";

export default async function KeywordsPage() {
  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);
  const keywords = await getKeywords(selectedClientId);
  const isAllMode = !selectedClientId;

  // 키워드 전략 조회 (클라이언트 선택 시만)
  const strategy = selectedClientId ? await getKeywordStrategy(selectedClientId) : null;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">키워드 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAllMode ? (
              <span className="font-medium text-foreground">전체 브랜드</span>
            ) : (
              <span className="font-medium text-foreground">{selectedBrand?.name}</span>
            )}
            의 타겟 키워드 · {keywords.length}개 등록됨
          </p>
        </div>
      </div>

      {/* AI 키워드 전략 섹션 (클라이언트 선택 시만) */}
      {selectedClientId && (
        <KeywordStrategySection
          clientId={selectedClientId}
          initialStrategy={strategy}
        />
      )}

      {/* 클라이언트 컴포넌트 (테이블 + 다이얼로그) */}
      <KeywordsClient keywords={keywords} clientId={selectedClientId} />
    </div>
  );
}
