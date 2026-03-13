"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="w-full px-4 sm:px-6 lg:px-0">
      <div className="w-full max-w-[1400px] h-[340px] sm:h-[480px] lg:h-[680px] mx-auto mt-[60px] relative overflow-hidden rounded-2xl lg:rounded-3xl">
        {/* Background Image */}
        <Image
          src="/img/home/bg-part1.jpg"
          alt="Green mountains background"
          fill
          className="object-cover w-full h-full"
          priority
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 lg:left-[82px] lg:top-[57px] lg:inset-auto lg:w-[561px] lg:flex lg:flex-col gap-5 sm:gap-7 lg:gap-10 z-10">
          <h1 className="text-[#155A03] text-[26px] sm:text-[36px] lg:text-[48px] font-bold leading-tight lg:leading-[56px]">
            {t("hero.title")}
          </h1>
          <p className="text-[#6E726E] text-sm sm:text-base font-normal leading-6 max-w-[477px]">
            {t("hero.subtitle")}
          </p>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] overflow-hidden rounded-xl text-white text-sm sm:text-base font-medium no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
            >
              {t("hero.registerNow")}
            </Link>
            <Link
              href="#contact"
              className="px-4 sm:px-5 py-2 sm:py-2.5 overflow-hidden rounded-xl border border-[#1F8505] text-[#1F8505] text-sm sm:text-base font-medium no-underline hover:bg-[#1F8505] hover:text-white hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
            >
              {t("hero.contactUs")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
