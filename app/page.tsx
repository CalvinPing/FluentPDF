import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PrivacyCallout } from "@/components/landing/privacy-callout";
import { About } from "@/components/landing/about";
import { FooterCta } from "@/components/landing/footer-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        <PrivacyCallout />
        <About />
        <FooterCta />
      </main>
      <Footer />
    </>
  );
}
