import { getHomepageConfig } from "@/data/config";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Portfolio from "@/components/home/Portfolio";
import BeforeAfter from "@/components/home/BeforeAfter";
import Services from "@/components/home/Services";
import Process from "@/components/home/Process";
import Reviews from "@/components/home/Reviews";
import Blog from "@/components/home/Blog";
import FAQ from "@/components/home/FAQ";
import ContactCTA from "@/components/home/ContactCTA";

export default async function HomePage() {
  const config = await getHomepageConfig();
  const { company, persona, portfolios, reviews, blogPosts, faqItems } = config;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = persona as any;
  const interiorProfile = p?.interior_profile || {};

  const tagline = p?.one_liner || `${company.name} — 공간의 품격을 높이다`;
  const description = p?.brand_story_hook || company.description;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 4.9;

  return (
    <>
      <Hero tagline={tagline} description={description} portfolios={portfolios} />
      <Stats
        experienceYears={interiorProfile.experience_years}
        completedProjects={interiorProfile.completed_projects}
        reviewCount={reviews.length}
        averageRating={avgRating}
      />
      <Portfolio portfolios={portfolios} />
      <BeforeAfter portfolios={portfolios} />
      <Services serviceTypes={interiorProfile.service_types || []} />
      <Process />
      <Reviews reviews={reviews} />
      <Blog posts={blogPosts} />
      <FAQ items={faqItems} />
      <ContactCTA projectId={process.env.HOMEPAGE_PROJECT_ID!} />
    </>
  );
}
