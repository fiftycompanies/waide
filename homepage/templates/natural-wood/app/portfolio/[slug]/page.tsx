import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BreadcrumbJsonLd } from "@/components/shared/JsonLd";
import type { Metadata } from "next";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PROJECT_ID = process.env.HOMEPAGE_PROJECT_ID!;

async function getPortfolio(slug: string) {
  const { data } = await supabase
    .from("homepage_portfolios")
    .select("*")
    .eq("project_id", PROJECT_ID)
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();

  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await getPortfolio(slug);
  if (!portfolio) return { title: "Not Found" };

  const title = portfolio.title || "시공 사례";
  return {
    title,
    description: portfolio.description || `${title} - 시공 사례 상세`,
    openGraph: {
      images: portfolio.image_urls?.[0] ? [portfolio.image_urls[0]] : [],
    },
  };
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const portfolio = await getPortfolio(slug);
  if (!portfolio) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="pt-24 pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: baseUrl },
          { name: "시공사례", url: `${baseUrl}/#portfolio` },
          { name: portfolio.title || "상세", url: `${baseUrl}/portfolio/${slug}` },
        ]}
      />
      <div className="container-wide">
        {/* Header */}
        <div className="mb-8">
          <div className="w-8 h-0.5 bg-accent mb-4" />
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {portfolio.title || "시공 사례"}
          </h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-text-secondary">
            {portfolio.space_type && <span className="px-3 py-1 rounded-2xl bg-bg-muted">{portfolio.space_type}</span>}
            {portfolio.area_pyeong && <span className="px-3 py-1 rounded-2xl bg-bg-muted">{portfolio.area_pyeong}평</span>}
            {portfolio.style && <span className="px-3 py-1 rounded-2xl bg-bg-muted">{portfolio.style}</span>}
            {portfolio.budget_range && <span className="px-3 py-1 rounded-2xl bg-bg-muted">{portfolio.budget_range}</span>}
          </div>
        </div>

        {/* Before/After */}
        {portfolio.before_image_url && portfolio.after_image_url && (
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm font-medium text-text-muted mb-2">BEFORE</p>
              <img
                src={portfolio.before_image_url}
                alt="Before"
                className="w-full rounded-3xl object-cover aspect-[4/3]"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-accent mb-2">AFTER</p>
              <img
                src={portfolio.after_image_url}
                alt="After"
                className="w-full rounded-3xl object-cover aspect-[4/3]"
              />
            </div>
          </div>
        )}

        {/* Gallery */}
        {portfolio.image_urls && portfolio.image_urls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {portfolio.image_urls.map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt={`${portfolio.title} ${i + 1}`}
                className="w-full rounded-3xl object-cover aspect-[4/3]"
              />
            ))}
          </div>
        )}

        {/* Description */}
        {portfolio.description && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
              시공 설명
            </h2>
            <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">{portfolio.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
