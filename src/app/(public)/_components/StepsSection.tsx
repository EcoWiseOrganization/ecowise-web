"use client";

import { useTranslation } from "react-i18next";

export function StepsSection() {
  const { t } = useTranslation();

  const STEPS = [
    {
      number: "01",
      titleKey: "steps.step1.title",
      descriptionKey: "steps.step1.description",
    },
    {
      number: "02",
      titleKey: "steps.step2.title",
      descriptionKey: "steps.step2.description",
    },
    {
      number: "03",
      titleKey: "steps.step3.title",
      descriptionKey: "steps.step3.description",
    },
    {
      number: "04",
      titleKey: "steps.step4.title",
      descriptionKey: "steps.step4.description",
    },
  ];

  return (
    <section className="w-full py-16 sm:py-20 lg:py-[100px]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col items-start gap-12 lg:gap-20">
        {/* Banner Title */}
        <div className="w-full flex items-center justify-center px-6 sm:px-12 lg:px-[97px] py-5 bg-[linear-gradient(270deg,#B8D6B0_0%,#79B669_98%)] shadow-[0px_4px_4px_rgba(218,237,213,0.25)] rounded-2xl lg:rounded-3xl">
          <h2 className="text-center text-white text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug lg:leading-[56px]">
            {t("steps.title")}
          </h2>
        </div>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="w-full">
          {/* Desktop layout */}
          <div className="hidden lg:block relative">
            {/* Connecting Line */}
            <div className="absolute left-[31px] top-[33px] w-[966px] h-0 outline outline-2 outline-[#155A03] outline-offset-[-1px]" />
            <div className="flex items-start justify-between gap-[84px]">
              {STEPS.map((step) => (
                <div key={step.number} className="w-[237px] flex flex-col items-start gap-5">
                  <div className="relative z-10 w-[66px] h-[66px] p-2.5 bg-[linear-gradient(270deg,#B8D6B0_0%,#79B669_98%)] rounded-xl flex flex-col items-center justify-center">
                    <span className="text-center text-white text-[30px] font-bold leading-[56px]">
                      {step.number}
                    </span>
                  </div>
                  <div className="flex flex-col items-start gap-2.5">
                    <h3 className="text-[#104502] text-xl font-semibold leading-6">{t(step.titleKey)}</h3>
                    <p className="text-[#155A03] text-base font-normal leading-6">{t(step.descriptionKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/tablet layout */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="flex items-start gap-4">
                <div className="shrink-0 w-[54px] h-[54px] bg-[linear-gradient(270deg,#B8D6B0_0%,#79B669_98%)] rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{step.number}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[#104502] text-base sm:text-lg font-semibold leading-6">{t(step.titleKey)}</h3>
                  <p className="text-[#155A03] text-sm sm:text-base font-normal leading-6">{t(step.descriptionKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
