import { getHomepageConfig } from "@/data/config";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import FaqAccordion from "./FaqAccordion";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();
  return {
    title: `자주 묻는 질문 | ${config.company.name}`,
    description: `${config.company.name} 인테리어 자주 묻는 질문 - 견적, 시공 기간, A/S 등 궁금한 점을 확인하세요.`,
  };
}

export default async function FaqPage() {
  const config = await getHomepageConfig();
  const { faqItems, company } = config;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="pt-24 pb-16">
      <FaqJsonLd items={faqItems} />
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "자주 묻는 질문", url: `${baseUrl}/faq` },
        ]}
      />
      <div className="container-narrow">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">FAQ</p>
          <h1 className="text-3xl md:text-4xl font-bold">자주 묻는 질문</h1>
          <p className="text-text-secondary mt-3">
            {company.name}에 대해 궁금한 점을 확인해보세요
          </p>
        </div>

        {faqItems.length > 0 ? (
          <FaqAccordion items={faqItems} />
        ) : (
          <div className="text-center py-16 text-text-muted">
            <p>등록된 FAQ가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
