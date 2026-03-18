import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import ComingSoon from "@/components/home/ComingSoon";
import BlogComparison from "@/components/home/BlogComparison";
import Process from "@/components/home/Process";
import Templates from "@/components/home/Templates";
import Pricing from "@/components/home/Pricing";
import FAQ from "@/components/home/FAQ";
import ContactCTA from "@/components/home/ContactCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <ComingSoon />
        <BlogComparison />
        <Process />
        <Templates />
        <Pricing />
        <FAQ />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}
