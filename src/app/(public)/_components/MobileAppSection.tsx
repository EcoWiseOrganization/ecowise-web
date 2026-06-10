"use client";

import Image from "next/image";
import AppleIcon from "@mui/icons-material/Apple";
import ShopIcon from "@mui/icons-material/Shop";
import { useTranslation } from "react-i18next";

export function MobileAppSection() {
  const { t } = useTranslation();

  return (
    <section className="relative w-full bg-[linear-gradient(180deg,#DAEDD5_0%,rgba(255,255,255,0)_100%)] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-[100px] relative">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-0">
          {/* Text Content */}
          <div className="flex flex-col gap-7 lg:gap-10 w-full lg:max-w-[604px] lg:pt-10 relative z-10">
            <h2 className="text-[#155A03] text-[28px] sm:text-[36px] lg:text-[48px] font-bold leading-tight lg:leading-[56px]">
              {t("mobile.title")}
            </h2>
            <p className="text-[#6E726E] text-base sm:text-lg font-normal leading-6 max-w-[484px] text-pretty">
              {t("mobile.subtitle")}
            </p>
            <div className="flex items-start gap-4 sm:gap-6">
              <a
                href="#"
                className="flex items-center gap-3 p-3 sm:p-4 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl text-white no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                <AppleIcon sx={{ fontSize: 28 }} />
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-[11px] font-normal">{t("mobile.downloadOn")}</span>
                  <span className="text-sm sm:text-base font-semibold">{t("mobile.appStore")}</span>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 p-3 sm:p-4 bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl text-white no-underline hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all duration-200"
              >
                <ShopIcon sx={{ fontSize: 28 }} />
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-[11px] font-normal">{t("mobile.getItOn")}</span>
                  <span className="text-sm sm:text-base font-semibold">{t("mobile.googlePlay")}</span>
                </div>
              </a>
            </div>
          </div>

          {/* Phone Mockup — hidden on mobile, visible md+. The PNG already
              contains the full device frame, screen content, and shadow,
              so it's rendered directly without an overlay. */}
          <div className="hidden md:flex justify-center lg:absolute lg:right-[-200px] lg:top-[-20px]">
            <Image
              src="/img/home/iphone2.png"
              alt={t("mobile.title")}
              width={1000}
              height={1000}
              priority
              className="w-[520px] lg:w-[840px] h-auto object-contain"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#DAEDD5]" />
    </section>
  );
}
