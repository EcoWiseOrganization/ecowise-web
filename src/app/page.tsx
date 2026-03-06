import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
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
      <main>
        <HeroSection />
        <PartnersBar />
        <StatsBar />
        <ServicesSection />
        <StepsSection />
        <PricingSection />
        <MobileAppSection />
      </main>
      <Footer />
    </div>
  );
}
