import { getHomepageConfig } from "@/data/config";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";
import FaqAccordion from "./FaqAccordion";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();
  return {
    title: `FAQ | ${config.company.name}`,
    description: `${config.company.name} 프리미엄 인테리어 자주 묻는 질문`,
  };
}

export default async function FaqPage() {
  const config = await getHomepageConfig();
  const { faqItems, company } = config;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="pt-28 pb-20">
      <FaqJsonLd items={faqItems} />
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "FAQ", url: `${baseUrl}/faq` },
        ]}
      />
      <div className="container-narrow">
        <div className="text-center mb-16">
          <div className="w-10 h-px bg-primary mx-auto mb-6" />
          <h1
            className="text-3xl md:text-5xl font-bold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            FAQ
          </h1>
          <p className="text-text-secondary mt-4 text-sm tracking-wide">
            {company.name}에 대해 자주 묻는 질문
          </p>
        </div>

        {faqItems.length > 0 ? (
          <FaqAccordion items={faqItems} />
        ) : (
          <div className="text-center py-20 text-text-muted text-sm">
            <p>등록된 FAQ가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
