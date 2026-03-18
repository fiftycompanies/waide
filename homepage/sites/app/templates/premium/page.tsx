import Hero from "@/components/designlab/Hero";
import AboutSection from "@/components/designlab/AboutSection";
import BrandPartners from "@/components/designlab/BrandPartners";
import ResidentialPortfolio from "@/components/designlab/ResidentialPortfolio";
import CommercialPortfolio from "@/components/designlab/CommercialPortfolio";
import QualityCompare from "@/components/designlab/QualityCompare";
import OutputCompare from "@/components/designlab/OutputCompare";
import PartnershipSection from "@/components/designlab/PartnershipSection";
import DesignSection from "@/components/designlab/DesignSection";
import ServiceSection from "@/components/designlab/ServiceSection";
import ValueSection from "@/components/designlab/ValueSection";
import ShowroomInfo from "@/components/designlab/ShowroomInfo";
import {
  LocalBusinessJsonLd,
  BreadcrumbJsonLd,
} from "@/components/shared/JsonLd";
import { brand } from "@/data/designlab";

export default function DesignLabPage() {
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
        reviewCount={87}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: brand.url },
          { name: "디자인랩", url: `${brand.url}/designlab` },
        ]}
      />

      {/* Hero */}
      <Hero />

      {/* About */}
      <AboutSection />

      {/* 01 High-end Brand */}
      <BrandPartners />

      {/* 02 High-end Home */}
      <ResidentialPortfolio />

      {/* 03 High-end Space */}
      <CommercialPortfolio />

      {/* 04 High-end 3D Quality */}
      <QualityCompare />

      {/* 05 High-end Output */}
      <OutputCompare />

      {/* 06 High-end Partnership */}
      <PartnershipSection />

      {/* 07 High-end Design */}
      <DesignSection />

      {/* 08 High-end Service */}
      <ServiceSection />

      {/* 09 High-end Value */}
      <ValueSection />

      {/* Showroom */}
      <ShowroomInfo />
    </>
  );
}
