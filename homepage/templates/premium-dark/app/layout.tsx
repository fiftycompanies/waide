import type { Metadata } from "next";
import { getHomepageConfig } from "@/data/config";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import FloatingCTA from "@/components/layout/FloatingCTA";
import { LocalBusinessJsonLd } from "@/components/shared/JsonLd";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getHomepageConfig();
  const { company, seo, theme } = config;

  return {
    title: {
      default: `${company.name} | 프리미엄 인테리어`,
      template: seo.meta_title_template,
    },
    description: seo.meta_description || company.description,
    keywords: seo.keywords,
    openGraph: {
      title: `${company.name} | 프리미엄 인테리어`,
      description: company.description,
      type: "website",
      locale: "ko_KR",
      images: theme.og_image_url ? [theme.og_image_url] : [],
    },
    icons: theme.favicon_url ? { icon: theme.favicon_url } : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getHomepageConfig();
  const { company, theme } = config;

  const avgRating = config.reviews.length > 0
    ? config.reviews.reduce((sum, r) => sum + r.rating, 0) / config.reviews.length
    : undefined;

  return (
    <html lang="ko" className="dark">
      <head>
        {/* Playfair Display + Inter + Noto Serif/Sans KR */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;600;700&family=Noto+Serif+KR:wght@400;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* 동적 테마 컬러 */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --primary: ${theme.primary_color}; --secondary: ${theme.secondary_color}; }`,
          }}
        />
      </head>
      <body>
        <LocalBusinessJsonLd
          name={company.name}
          description={company.description}
          phone={company.phone}
          address={company.address}
          url={typeof window !== "undefined" ? window.location.origin : ""}
          image={theme.og_image_url}
          openingHours={company.operatingHours}
          rating={avgRating}
          reviewCount={config.reviews.length > 0 ? config.reviews.length : undefined}
        />
        <Nav companyName={company.name} logo={company.logo} phone={company.phone} />
        <main>{children}</main>
        <Footer company={company} />
        <FloatingCTA phone={company.phone} kakaoLink={company.kakaoLink} />
      </body>
    </html>
  );
}
