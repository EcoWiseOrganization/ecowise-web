"use client";

import Link from "next/link";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";

interface PricingPlanConfig {
  nameKey: string;
  price: string;
  periodKey?: string;
  descriptionKey: string;
  buttonKey: string;
  buttonVariant: "outline" | "filled";
  featureKeys: string[];
  highlighted?: boolean;
}

const PLANS_CONFIG: PricingPlanConfig[] = [
  {
    nameKey: "pricing.plan1.name",
    price: "$0",
    descriptionKey: "pricing.plan1.description",
    buttonKey: "pricing.plan1.button",
    buttonVariant: "outline",
    featureKeys: [
      "pricing.plan1.feature1",
      "pricing.plan1.feature2",
      "pricing.plan1.feature3",
      "pricing.plan1.feature4",
    ],
  },
  {
    nameKey: "pricing.plan2.name",
    price: "$000",
    periodKey: "pricing.quarter",
    descriptionKey: "pricing.plan2.description",
    buttonKey: "pricing.plan2.button",
    buttonVariant: "filled",
    featureKeys: [
      "pricing.plan2.feature1",
      "pricing.plan2.feature2",
      "pricing.plan2.feature3",
      "pricing.plan2.feature4",
    ],
    highlighted: true,
  },
  {
    nameKey: "pricing.plan3.name",
    price: "$00",
    periodKey: "pricing.quarter",
    descriptionKey: "pricing.plan3.description",
    buttonKey: "pricing.plan3.button",
    buttonVariant: "outline",
    featureKeys: [
      "pricing.plan3.feature1",
      "pricing.plan3.feature2",
      "pricing.plan3.feature3",
      "pricing.plan3.feature4",
    ],
  },
];

function PricingCard({ plan }: { plan: PricingPlanConfig }) {
  const { t } = useTranslation();
  const isHighlighted = plan.highlighted;

  return (
    <div
      className={`w-full rounded-3xl flex flex-col ${
        isHighlighted
          ? "bg-[linear-gradient(192deg,rgba(255,255,255,0)_0%,#1F8505_100%),linear-gradient(54deg,rgba(255,255,255,0)_0%,#1F8505_100%),white] shadow-[0px_4px_4px_rgba(31,133,5,0.25)] border border-[#1F8505]"
          : "bg-white shadow-[0px_4px_4px_rgba(218,237,213,0.25)] border border-[#DAEDD5]"
      }`}
    >
      {/* Top Section */}
      <div className="px-6 sm:px-[33px] pt-7 sm:pt-9 pb-6 sm:pb-8 overflow-hidden rounded-t-3xl flex flex-col gap-8 sm:gap-[42px]">
        <div className="flex flex-col gap-8 sm:gap-[42px]">
          <div className="flex flex-col gap-8 sm:gap-12">
            <h3 className="text-[#1F8505] text-xl sm:text-2xl font-medium leading-[27.6px]">
              {t(plan.nameKey)}
            </h3>
            <div className="flex items-end gap-2">
              <span className="text-[#1F8505] text-[48px] sm:text-[60px] font-semibold leading-none">
                {plan.price}
              </span>
              {plan.periodKey && (
                <span className="text-[#6E726E] text-base font-normal leading-[18.4px] mb-2">
                  {t(plan.periodKey)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-8 sm:gap-[42px]">
            <p className="text-[#6E726E] text-base font-normal leading-6">
              {t(plan.descriptionKey)}
            </p>
            <Link
              href="/register"
              className={`w-full text-center px-5 py-4 sm:py-[18px] rounded-xl text-base sm:text-lg font-medium no-underline shadow-[0px_2px_4px_rgba(218,237,213,0.25)] border border-[#DAEDD5] transition-all duration-200 ${
                plan.buttonVariant === "filled"
                  ? "bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)]"
                  : "bg-white text-[#1F8505] hover:bg-[#1F8505] hover:text-white hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)]"
              }`}
            >
              {t(plan.buttonKey)}
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full px-6 sm:px-[33px] pt-6 sm:pt-8 pb-7 sm:pb-9 overflow-hidden rounded-b-3xl border-t border-[#DAEDD5] flex flex-col items-start gap-7 sm:gap-9">
        <h4 className="text-[#1F8505] text-lg font-medium leading-[20.7px]">
          {t("pricing.features")}
        </h4>
        <div className="self-stretch flex flex-col items-start gap-5 sm:gap-7">
          {plan.featureKeys.map((featureKey) => (
            <div key={featureKey} className="self-stretch inline-flex items-center gap-2">
              <CheckCircleIcon sx={{ fontSize: 20, color: "#1F8505" }} />
              <span className="flex-1 text-[#6E726E] text-sm sm:text-base font-normal leading-[18.4px]">
                {t(featureKey)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  const { t } = useTranslation();

  return (
    <section id="products" className="w-full max-w-[1201px] mx-auto py-16 sm:py-20 px-4 sm:px-6 lg:px-0">
      <div className="flex flex-col items-center gap-10 sm:gap-[60px]">
        <h2 className="w-full max-w-[621px] text-center text-[#155A03] text-[32px] sm:text-[40px] lg:text-[48px] font-bold leading-tight lg:leading-[56px]">
          {t("pricing.title")}
        </h2>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLANS_CONFIG.map((plan) => (
            <PricingCard key={plan.nameKey} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
