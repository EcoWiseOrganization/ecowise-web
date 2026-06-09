"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { redeemRewardAction } from "@/app/actions/gamification.actions";
import type { Reward, Redemption } from "@/types/gamification.types";

interface Props {
  rewards: Reward[];
  redemptions: Redemption[];
  myPoints: number;
}

export function RewardsBrowser({ rewards, redemptions, myPoints }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const errorMessage = (code: string): string => {
    switch (code) {
      case "INSUFFICIENT_POINTS":
        return t("rewards.redeem.insufficient");
      case "REWARD_OUT_OF_STOCK":
        return t("rewards.redeem.outOfStock");
      case "REWARD_INACTIVE":
      case "REWARD_NOT_FOUND":
      default:
        return t("rewards.redeem.failed");
    }
  };

  const redeem = (r: Reward) => {
    if (r.points_cost > myPoints) {
      setError("INSUFFICIENT_POINTS");
      return;
    }
    if (!window.confirm(t("rewards.redeem.confirm", { cost: r.points_cost })))
      return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await redeemRewardAction(r.id);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setSuccess(t("rewards.redeem.success"));
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-[#6E726E]">
            {t("rewards.points.balance")}
          </p>
          <p className="text-2xl font-bold text-[#1F8505]">
            {myPoints} {t("rewards.points.suffix")}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {errorMessage(error)}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <h2 className="text-[#155A03] text-lg font-semibold mt-2">
        {t("rewards.title")}
      </h2>
      {rewards.length === 0 ? (
        <p className="text-sm text-[#AAAAAA]">{t("rewards.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r) => {
            const outOfStock = r.total_stock <= 0 || r.status === "Inactive";
            return (
              <article
                key={r.id}
                className={`rounded-2xl border p-4 flex flex-col gap-2 ${
                  outOfStock ? "bg-gray-50 border-gray-200" : "bg-white border-[#DAEDD5]"
                }`}
              >
                {r.image_url && (
                  <div className="w-full h-32 relative rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={r.image_url}
                      alt={r.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 30vw"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-[#155A03]">{r.name}</h3>
                {r.description && (
                  <p className="text-xs text-[#6E726E] line-clamp-3">
                    {r.description}
                  </p>
                )}
                <div className="flex justify-between items-end mt-auto pt-2">
                  <div>
                    <p className="text-2xl font-bold text-[#1F8505]">
                      {r.points_cost}
                      <span className="text-xs text-[#6E726E] ml-1">
                        {t("rewards.points.suffix")}
                      </span>
                    </p>
                    <p className="text-[10px] text-[#AAAAAA]">
                      Stock: {r.total_stock} · {r.fulfillment}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => redeem(r)}
                    disabled={pending || outOfStock || r.points_cost > myPoints}
                    className="px-3 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {outOfStock ? t("rewards.outOfStock") : t("rewards.redeem")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <h2 className="text-[#155A03] text-lg font-semibold mt-4">
        {t("rewards.history.title")}
      </h2>
      {redemptions.length === 0 ? (
        <p className="text-sm text-[#AAAAAA]">{t("rewards.history.empty")}</p>
      ) : (
        <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[#6E726E] text-xs uppercase">
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">{t("rewards.title")}</th>
                <th className="px-3 py-2">{t("leaderboard.points")}</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-2 text-xs">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.reward_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 font-semibold text-[#155A03]">
                    -{r.points_spent}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
