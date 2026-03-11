import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HeroSection } from "@/app/(public)/_components/HeroSection";
import { PartnersBar } from "@/app/(public)/_components/PartnersBar";
import { StatsBar } from "@/app/(public)/_components/StatsBar";
import { ServicesSection } from "@/app/(public)/_components/ServicesSection";
import { StepsSection } from "@/app/(public)/_components/StepsSection";
import { PricingSection } from "@/app/(public)/_components/PricingSection";
import { MobileAppSection } from "@/app/(public)/_components/MobileAppSection";

export default function HomePage() {
  return (
    <div className="w-full relative bg-white overflow-hidden">
      <Header />
      <main className="pt-[61px] sm:pt-[69px] lg:pt-[71px]">
        <ScrollReveal>
          <HeroSection />
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <PartnersBar />
        </ScrollReveal>
        <ScrollReveal>
          <StatsBar />
        </ScrollReveal>
        <ScrollReveal>
          <ServicesSection />
        </ScrollReveal>
        <ScrollReveal>
          <StepsSection />
        </ScrollReveal>
        <ScrollReveal>
          <PricingSection />
        </ScrollReveal>
        <ScrollReveal>
          <MobileAppSection />
        </ScrollReveal>
      </main>
      <Footer />
    </div>
  );
}
