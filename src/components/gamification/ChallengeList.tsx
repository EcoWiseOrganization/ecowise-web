"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteChallengeAction } from "@/app/actions/gamification.actions";
import type { Challenge } from "@/types/gamification.types";
import { useRouter } from "next/navigation";

interface Props {
  challenges: Challenge[];
  /**
   * Base path the Edit link is composed from — `${editHrefBase}/${id}/edit`.
   * Must be a string (not a builder function) because this is a Client
   * Component and Next rejects function props crossing the
   * server→client boundary.
   */
  editHrefBase: string;
  /** When true, show a Delete column. */
  canDelete?: boolean;
}

export function ChallengeList({ challenges, editHrefBase, canDelete }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = (id: string) => {
    if (!window.confirm(t("admin.challengeList.confirmDelete"))) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteChallengeAction(id);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
      {error && (
        <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-[#6E726E] text-xs uppercase">
          <tr className="border-b border-gray-100">
            <th className="px-3 py-2">{t("admin.challengeList.col.name")}</th>
            <th className="px-3 py-2">{t("admin.challengeList.col.category")}</th>
            <th className="px-3 py-2">{t("admin.challengeList.col.status")}</th>
            <th className="px-3 py-2">{t("admin.challengeList.col.points")}</th>
            <th className="px-3 py-2">{t("admin.challengeList.col.window")}</th>
            <th className="px-3 py-2">{t("admin.challengeList.col.scope")}</th>
            <th className="px-3 py-2 text-right" />
          </tr>
        </thead>
        <tbody>
          {challenges.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-[#AAAAAA]">
                {t("admin.challengeList.empty")}
              </td>
            </tr>
          ) : (
            challenges.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.category}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "Active"
                        ? "bg-[#f0f9ed] text-[#1F8505]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t(`admin.challengeForm.statusOpt.${c.status}`)}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-[#155A03]">
                  {c.points_reward}
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.start_date} → {c.end_date}
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.org_id
                    ? t("admin.challengeList.scope.org")
                    : t("admin.challengeList.scope.global")}
                </td>
                <td className="px-3 py-2 text-right space-x-3">
                  <Link
                    href={`${editHrefBase}/${c.id}/edit`}
                    className="text-[#1F8505] text-xs hover:underline"
                  >
                    {t("common.edit")}
                  </Link>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      className="text-red-600 text-xs hover:underline disabled:opacity-50"
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
