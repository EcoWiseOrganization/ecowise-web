"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ImpactStats } from "./ImpactStats";
import type { PublicImpactStats } from "@/services/public-stats.service";

export function AboutBody({ stats }: { stats: PublicImpactStats }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 flex flex-col gap-12 sm:gap-16">
      <header className="text-center max-w-3xl mx-auto">
        <h1 className="text-[#155A03] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          {t("about.title")}
        </h1>
        <p className="text-[#6E726E] text-base sm:text-lg mt-4 leading-7">
          {t("about.subtitle")}
        </p>
      </header>

      {/* Vision / Mission */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-2xl p-8">
          <h2 className="text-[#155A03] text-xl font-semibold">
            {t("about.vision.title")}
          </h2>
          <p className="text-[#3B3D3B] mt-3 leading-7">{t("about.vision.body")}</p>
        </div>
        <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-2xl p-8">
          <h2 className="text-[#155A03] text-xl font-semibold">
            {t("about.mission.title")}
          </h2>
          <p className="text-[#3B3D3B] mt-3 leading-7">{t("about.mission.body")}</p>
        </div>
      </section>

      {/* Impact stats */}
      <section>
        <h2 className="text-[#155A03] text-2xl font-semibold mb-6 text-center">
          {t("about.impact.title")}
        </h2>
        <ImpactStats stats={stats} />
      </section>

      {/* Contact CTA */}
      <section className="bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] rounded-2xl p-8 sm:p-12 text-white text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">
          {t("about.cta.title")}
        </h2>
        <p className="mt-2 opacity-90">{t("about.cta.body")}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl bg-white text-[#1F8505] text-base font-semibold no-underline hover:shadow-lg transition"
          >
            {t("about.cta.contact")}
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl border-2 border-white text-white text-base font-semibold no-underline hover:bg-white hover:text-[#1F8505] transition"
          >
            {t("about.cta.register")}
          </Link>
        </div>
      </section>
    </div>
  );
}
