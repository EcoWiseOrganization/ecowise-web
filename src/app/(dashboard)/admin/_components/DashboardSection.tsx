"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardSectionProps {
  titleKey: string;
  subtitleKey?: string;
  /** Optional "view all" link in the header. */
  href?: string;
  hrefLabelKey?: string;
  children: ReactNode;
  /** Render the section spanning the full grid row. */
  className?: string;
}

/** Card chrome shared by every chart/list section on the admin dashboard. */
export function DashboardSection({
  titleKey,
  subtitleKey,
  href,
  hrefLabelKey,
  children,
  className = "",
}: DashboardSectionProps) {
  const { t } = useTranslation();
  return (
    <section
      className={`border-brand-100 flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6 ${className}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-brand-700 text-base font-semibold sm:text-lg">
            {t(titleKey)}
          </h2>
          {subtitleKey && (
            <p className="text-neutral-soft mt-0.5 text-xs sm:text-sm">
              {t(subtitleKey)}
            </p>
          )}
        </div>
        {href && hrefLabelKey && (
          <Link
            href={href}
            className="text-brand-500 hover:text-brand-700 text-sm font-medium hover:underline"
          >
            {t(hrefLabelKey)}
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
