import { getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { getKeywords } from "@/lib/actions/keyword-actions";
import { getKeywordStrategy } from "@/lib/actions/keyword-strategy-actions";
import { getQuestions } from "@/lib/actions/question-actions";
import { checkNaverAdApiAvailable } from "@/lib/actions/keyword-volume-actions";
import { KeywordsClient } from "@/components/keywords/keywords-client";
import { KeywordStrategySection } from "@/components/keywords/keyword-strategy-section";
import { KeywordsTabsWrapper } from "@/components/keywords/keywords-tabs-wrapper";
import { QuestionsTab } from "@/components/questions/questions-tab";
import { KeywordVolumeTab } from "@/components/keywords/keyword-volume-tab";

interface KeywordsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function KeywordsPage({ searchParams }: KeywordsPageProps) {
  const params = await searchParams;
  const tab = (params.tab ?? "keywords") as "keywords" | "questions" | "volume";

  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);
  const keywords = await getKeywords(selectedClientId);
  const isAllMode = !selectedClientId;

  // 키워드 전략 조회 (클라이언트 선택 시만)
  const strategy = selectedClientId ? await getKeywordStrategy(selectedClientId) : null;

  // 질문 조회 (클라이언트 선택 시만)
  const questions = selectedClientId ? await getQuestions(selectedClientId) : [];

  // 검색량 API 사용 가능 여부
  const apiAvailable = tab === "volume" ? await checkNaverAdApiAvailable() : false;

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

      {/* 탭 네비게이션 */}
      <KeywordsTabsWrapper activeTab={tab} questionCount={questions.length}>
        {tab === "keywords" && (
          <>
            {/* AI 키워드 전략 섹션 (클라이언트 선택 시만) */}
            {selectedClientId && (
              <KeywordStrategySection
                clientId={selectedClientId}
                initialStrategy={strategy}
              />
            )}

            {/* 클라이언트 컴포넌트 (테이블 + 다이얼로그) */}
            <KeywordsClient keywords={keywords} clientId={selectedClientId} />
          </>
        )}

        {tab === "questions" && selectedClientId && (
          <QuestionsTab
            clientId={selectedClientId}
            questions={questions}
            keywords={keywords}
          />
        )}

        {tab === "questions" && !selectedClientId && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              사이드바에서 브랜드를 먼저 선택해주세요
            </p>
          </div>
        )}

        {tab === "volume" && (
          <KeywordVolumeTab
            clientId={selectedClientId}
            apiAvailable={apiAvailable}
          />
        )}
      </KeywordsTabsWrapper>
    </div>
  );
}
