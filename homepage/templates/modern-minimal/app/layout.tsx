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
      default: `${company.name} | 인테리어 전문`,
      template: seo.meta_title_template,
    },
    description: seo.meta_description || company.description,
    keywords: seo.keywords,
    openGraph: {
      title: `${company.name} | 인테리어 전문`,
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
    <html lang="ko">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
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
