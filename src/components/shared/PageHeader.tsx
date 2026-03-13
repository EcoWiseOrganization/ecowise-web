"use client";

import { useTranslation } from "react-i18next";

interface PageHeaderProps {
  titleKey: string;
  subtitleKey: string;
}

export function PageHeader({ titleKey, subtitleKey }: PageHeaderProps) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-[#155A03] text-[30px] font-semibold leading-9">
        {t(titleKey)}
      </h1>
      <p className="text-[#AAAAAA] text-base font-medium leading-6">
        {t(subtitleKey)}
      </p>
    </div>
  );
}
