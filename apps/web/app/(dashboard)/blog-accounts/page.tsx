import { getSelectedClientId, getAiMarketBrands } from "@/lib/actions/brand-actions";
import { getBlogAccounts } from "@/lib/actions/blog-account-actions";
import { getAccountGrades } from "@/lib/actions/recommendation-actions";
import { BlogAccountsClient } from "@/components/blog-accounts/blog-accounts-client";

export default async function BlogAccountsPage() {
  const [selectedClientId, brands] = await Promise.all([
    getSelectedClientId(),
    getAiMarketBrands(),
  ]);

  const selectedBrand = brands.find((b) => b.id === selectedClientId);
  const isAllMode = !selectedClientId;

  const [accounts, accountGrades] = await Promise.all([
    getBlogAccounts(selectedClientId),
    getAccountGrades(selectedClientId),
  ]);

  // Tistory OAuth 활성화 여부
  const tistoryEnabled = !!(
    process.env.TISTORY_CLIENT_ID &&
    process.env.TISTORY_CLIENT_SECRET &&
    process.env.TISTORY_REDIRECT_URI
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">블로그 계정 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAllMode ? (
            <span className="font-medium text-foreground">전체 브랜드</span>
          ) : (
            <span className="font-medium text-foreground">{selectedBrand?.name}</span>
          )}
          의 발행 계정 · API 연동 (Tistory/WordPress/Medium) · C-Rank 관리
        </p>
      </div>

      <BlogAccountsClient
        accounts={accounts}
        accountGrades={accountGrades}
        clientId={selectedClientId}
        tistoryEnabled={tistoryEnabled}
      />
    </div>
  );
}
