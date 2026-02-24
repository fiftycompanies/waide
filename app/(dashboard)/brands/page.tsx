import { getBrandList, getDefaultWorkspaceId, getCompanyBrands } from "@/lib/actions/brand-actions";
import { BrandsClient } from "@/components/brands/brands-client";

export default async function BrandsPage() {
  const [brands, workspaceId, companyBrands] = await Promise.all([
    getBrandList(),
    getDefaultWorkspaceId(),
    getCompanyBrands(),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">브랜드 관리</h1>
        <p className="text-muted-foreground">
          본사(플랫폼)와 하위 업체를 계층으로 관리합니다
        </p>
      </div>
      <BrandsClient
        brands={brands}
        workspaceId={workspaceId ?? ""}
        companyBrands={companyBrands}
      />
    </div>
  );
}
