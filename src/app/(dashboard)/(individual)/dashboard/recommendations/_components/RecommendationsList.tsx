"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRecommendationsAction } from "@/app/actions/personal-carbon.actions";
import type { Recommendation } from "@/lib/recommendations";

export function RecommendationsList() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getRecommendationsAction();
      if (!active) return;
      setItems(res.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#DAEDD5] p-12 text-center text-sm text-[#6E726E]">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((r) => (
        <article
          key={r.id}
          className="bg-white border border-[#DAEDD5] rounded-2xl p-6 flex flex-col gap-2"
        >
          <span className="text-xs uppercase text-[#79B669] tracking-wide">
            {r.category}
          </span>
          <h3 className="text-[#155A03] text-lg font-semibold">
            {t(r.titleKey)}
          </h3>
          <p className="text-[#3B3D3B] text-sm leading-6">{t(r.bodyKey)}</p>
          {r.estimatedSavingKg > 0 && (
            <span className="text-xs text-[#1F8505] font-semibold mt-2">
              ≈{" "}
              {r.estimatedSavingKg.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}{" "}
              kg CO₂e {t("reco.potentialSaving")}
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
