"use client";

import Image from "next/image";
import Link from "next/link";
import DescriptionIcon from "@mui/icons-material/Description";
import { useTranslation } from "react-i18next";

function ServiceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 sm:gap-5 px-4 sm:px-5 py-5 sm:py-6 bg-white/95 shadow-[0px_4px_4px_rgba(218,237,213,0.25)] rounded-xl border border-[#DAEDD5]">
      <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-[#79B669] rounded-full flex items-center justify-center">
        <DescriptionIcon sx={{ fontSize: 18, color: "white" }} />
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <h3 className="text-[#104502] text-lg sm:text-xl font-semibold leading-6">
          {title}
        </h3>
        <p className="text-[#6E726E] text-sm sm:text-base font-normal leading-6">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ServicesSection() {
  const { t } = useTranslation();

  const SERVICES_TOP = [
    {
      titleKey: "services.emissionManagement.title",
      descriptionKey: "services.emissionManagement.description",
    },
  ];

  const SERVICES_GRID = [
    {
      titleKey: "services.netZero.title",
      descriptionKey: "services.netZero.description",
    },
    {
      titleKey: "services.analytics.title",
      descriptionKey: "services.analytics.description",
    },
    {
      titleKey: "services.carbonReporting.title",
      descriptionKey: "services.carbonReporting.description",
    },
    {
      titleKey: "services.verification.title",
      descriptionKey: "services.verification.description",
    },
  ];

  return (
    <section id="services" className="relative overflow-hidden bg-[#1F3818]">
      <Image
        src="/img/home/bg-part2.jpg"
        alt=""
        fill
        className="object-cover opacity-15"
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-[100px]">
        <div className="flex flex-col gap-10 sm:gap-[60px]">
          {/* Top: Title + Dashboard Image */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-[60px]">
            {/* Left content */}
            <div className="w-full lg:w-[529px] flex flex-col gap-8 lg:gap-10 lg:shrink-0">
              <div className="flex flex-col gap-2.5">
                <h2 className="text-white text-[32px] sm:text-[40px] lg:text-[48px] font-bold leading-tight lg:leading-[56px]">
                  {t("services.title")}
                </h2>
                <p className="text-[#E5E5E5] text-base sm:text-lg font-normal leading-6">
                  {t("services.subtitle")}
                </p>
              </div>
              <Link
                href="#services"
                className="self-start px-5 py-2.5 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] overflow-hidden rounded-xl text-white text-base sm:text-xl font-medium no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                {t("services.explore")}
              </Link>
            </div>

            {/* Dashboard Image — hidden on mobile */}
            <div className="relative mt-0 lg:mt-6 hidden md:block w-full lg:w-auto">
              <Image
                src="/img/home/dashboard.png"
                alt="EcoWise Dashboard"
                width={474}
                height={351}
                className="w-full max-w-[474px] mx-auto lg:mx-0 lg:rotate-[5deg] lg:origin-top-left shadow-[0px_4px_4px_rgba(218,237,213,0.25)] rounded-xl border-4 border-[#DAEDD5]"
              />
            </div>
          </div>

          {/* Service Cards */}
          <div className="flex flex-col gap-4">
            {/* First card — half width on desktop, full on mobile */}
            <div className="w-full lg:w-[calc(50%-8px)]">
              {SERVICES_TOP.map((service) => (
                <ServiceCard
                  key={service.titleKey}
                  title={t(service.titleKey)}
                  description={t(service.descriptionKey)}
                />
              ))}
            </div>
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICES_GRID.map((service) => (
                <ServiceCard
                  key={service.titleKey}
                  title={t(service.titleKey)}
                  description={t(service.descriptionKey)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
