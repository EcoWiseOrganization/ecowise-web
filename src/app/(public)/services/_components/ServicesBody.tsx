"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BusinessIcon from "@mui/icons-material/Business";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import VerifiedIcon from "@mui/icons-material/Verified";

const CARDS = [
  {
    icon: AssessmentIcon,
    titleKey: "services.feature.tracking.title",
    bodyKey: "services.feature.tracking.body",
  },
  {
    icon: BusinessIcon,
    titleKey: "services.feature.org.title",
    bodyKey: "services.feature.org.body",
  },
  {
    icon: EventAvailableIcon,
    titleKey: "services.feature.events.title",
    bodyKey: "services.feature.events.body",
  },
  {
    icon: VerifiedIcon,
    titleKey: "services.feature.audit.title",
    bodyKey: "services.feature.audit.body",
  },
];

export function ServicesBody() {
  const { t } = useTranslation();

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 flex flex-col gap-12">
      <header className="text-center max-w-3xl mx-auto">
        <h1 className="text-[#155A03] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          {t("services.page.title")}
        </h1>
        <p className="text-[#6E726E] text-base sm:text-lg mt-4 leading-7">
          {t("services.page.subtitle")}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CARDS.map(({ icon: Icon, titleKey, bodyKey }) => (
          <article
            key={titleKey}
            className="bg-white border border-[#DAEDD5] rounded-2xl p-8 hover:shadow-lg transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-[#1F8505]">
              <Icon sx={{ fontSize: 28 }} />
            </div>
            <h2 className="text-[#155A03] text-xl font-semibold mt-4">
              {t(titleKey)}
            </h2>
            <p className="text-[#3B3D3B] mt-2 leading-7">{t(bodyKey)}</p>
          </article>
        ))}
      </section>

      <section className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-2xl p-8 sm:p-12 text-center">
        <h2 className="text-[#155A03] text-2xl font-bold">
          {t("services.cta.title")}
        </h2>
        <p className="text-[#6E726E] mt-2">{t("services.cta.body")}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-base font-semibold no-underline hover:shadow-lg transition"
          >
            {t("services.cta.register")}
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl border-2 border-[#1F8505] text-[#1F8505] text-base font-semibold no-underline hover:bg-[#1F8505] hover:text-white transition"
          >
            {t("services.cta.signIn")}
          </Link>
        </div>
      </section>
    </div>
  );
}
