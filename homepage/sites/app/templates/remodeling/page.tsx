import Image from "next/image";
import Hero from "@/components/remodelia/Hero";
import BrandIntro from "@/components/remodelia/BrandIntro";
import PortfolioGrid from "@/components/remodelia/PortfolioGrid";
import ReviewSection from "@/components/remodelia/ReviewSection";
import {
  LocalBusinessJsonLd,
  FaqJsonLd,
  BreadcrumbJsonLd,
} from "@/components/shared/JsonLd";
import { brand, faqItems, images } from "@/data/remodelia";

export default function RemodeliaPage() {
  return (
    <>
      {/* Structured Data */}
      <LocalBusinessJsonLd
        name={brand.name}
        description={brand.description}
        phone={brand.phone}
        address={brand.address}
        url={brand.url}
        openingHours={brand.operatingHours}
        rating={4.9}
        reviewCount={127}
      />
      <FaqJsonLd items={faqItems} />
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: brand.url },
          { name: "리모델리아", url: `${brand.url}/remodelia` },
        ]}
      />

      {/* 1. Hero */}
      <Hero />

      {/* 2. Brand Intro */}
      <BrandIntro />

      {/* 3. Portfolio Sections (30평대 + 구축) */}
      <PortfolioGrid />

      {/* 4. Customer Reviews */}
      <ReviewSection />

      {/* 5. Bottom Image */}
      <section className="relative w-full">
        <div className="relative w-full aspect-[21/9] md:aspect-[3/1]">
          <Image
            src={images.bottom}
            alt="리모델리아 인테리어 하단 이미지"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </section>
    </>
  );
}
