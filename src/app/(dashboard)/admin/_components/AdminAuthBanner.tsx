"use client";

import { useTranslation } from "react-i18next";

export function AdminAuthBanner() {
  const { t } = useTranslation();
  return (
    <div className="p-6 bg-[#DAEDD5] rounded-3xl border border-[#B8D6B0] flex flex-col gap-3">
      <h2 className="text-[#155A03] text-xl font-semibold">
        {t("admin.dashboard.authCheck")}
      </h2>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-[#1F8505]" />
        <span className="text-[#155A03] text-base">
          {t("admin.dashboard.authSuccess")}
        </span>
      </div>
    </div>
  );
}
