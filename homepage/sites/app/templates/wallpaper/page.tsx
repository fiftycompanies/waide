import Hero from "@/components/wallpaper-master/Hero";
import ServiceCategory from "@/components/wallpaper-master/ServiceCategory";
import ProjectGallery from "@/components/wallpaper-master/ProjectGallery";
import ExpertTips from "@/components/wallpaper-master/ExpertTips";
import FireSafety from "@/components/wallpaper-master/FireSafety";
import PriceEducation from "@/components/wallpaper-master/PriceEducation";
import EstimateCTA from "@/components/wallpaper-master/EstimateCTA";
import ReviewCarousel from "@/components/wallpaper-master/ReviewCarousel";
import PartnerLogos from "@/components/wallpaper-master/PartnerLogos";
import {
  LocalBusinessJsonLd,
  FaqJsonLd,
  BreadcrumbJsonLd,
} from "@/components/shared/JsonLd";
import { brand, faqItems } from "@/data/wallpaper-master";

export default function WallpaperMasterPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <LocalBusinessJsonLd
        name={brand.name}
        description={brand.description}
        phone={brand.phone}
        address={brand.address}
        url={brand.url}
        openingHours={brand.operatingHours}
        rating={4.9}
        reviewCount={320}
      />
      <FaqJsonLd items={faqItems} />
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: brand.url },
          { name: "벽지마스터", url: `${brand.url}/wallpaper` },
        ]}
      />

      {/* Page Sections - exact order per spec */}
      <Hero />
      <ServiceCategory />
      <ProjectGallery />
      <ExpertTips />
      <FireSafety />
      <PriceEducation />
      <EstimateCTA />
      <ReviewCarousel />
      <PartnerLogos />
    </>
  );
}
