"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { searchOrganizationsAction } from "@/app/actions/admin.actions";
import type { AdminOrganizationRow } from "@/types/admin.types";

interface Props {
  initial: AdminOrganizationRow[];
  initialCount: number;
}

const STATUS_STYLES: Record<string, string> = {
  Verified: "bg-[#f0f9ed] text-[#1F8505]",
  Pending: "bg-orange-50 text-orange-700",
  Suspended: "bg-red-50 text-red-700",
};

export function OrgsTable({ initial, initialCount }: Props) {
  const { t } = useTranslation();
  const [orgs, setOrgs] = useState<AdminOrganizationRow[]>(initial);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [verification, setVerification] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const apply = (nextPage = 1) => {
    setError(null);
    setPage(nextPage);
    startTransition(async () => {
      const res = await searchOrganizationsAction({
        search: search || undefined,
        verification: verification || undefined,
        page: nextPage,
        pageSize,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOrgs(res.data);
      setCount(res.count);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="search"
          placeholder={t("admin.organizations.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:col-span-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
        <select
          value={verification}
          onChange={(e) => setVerification(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">{t("admin.organizations.filterAll")}</option>
          <option value="Pending">{t("admin.organizations.filterPending")}</option>
          <option value="Verified">{t("admin.organizations.filterVerified")}</option>
          <option value="Suspended">{t("admin.organizations.filterSuspended")}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => apply(1)}
        disabled={pending}
        className="self-start px-4 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
      >
        {pending ? t("common.searching") : t("common.search")}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2">{t("admin.organizations.col.name")}</th>
              <th className="px-3 py-2">{t("admin.organizations.col.taxId")}</th>
              <th className="px-3 py-2">{t("admin.organizations.col.type")}</th>
              <th className="px-3 py-2">{t("admin.organizations.col.industry")}</th>
              <th className="px-3 py-2">{t("admin.organizations.col.members")}</th>
              <th className="px-3 py-2">{t("admin.organizations.col.subscription")}</th>
              <th className="px-3 py-2">{t("admin.organizations.col.status")}</th>
              <th className="px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[#AAAAAA]"
                >
                  {t("admin.organizations.empty")}
                </td>
              </tr>
            ) : (
              orgs.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-[#141514]">
                    {o.legal_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {o.tax_code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{o.org_type ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{o.industry ?? "—"}</td>
                  <td className="px-3 py-2">{o.member_count}</td>
                  <td className="px-3 py-2 text-xs">
                    {o.active_subscription ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        STATUS_STYLES[o.verification_status ?? ""] ??
                        "bg-gray-100"
                      }`}
                    >
                      {o.verification_status ?? "Pending"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/organizations/${o.id}`}
                      className="text-[#1F8505] text-xs hover:underline"
                    >
                      {t("admin.organizations.viewDetail")}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-[#6E726E]">
          {t("admin.organizations.pagerSummary", {
            count,
            page,
            total: totalPages,
          })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || pending}
            onClick={() => apply(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-50"
          >
            {t("common.previous")}
          </button>
          <button
            type="button"
            disabled={page >= totalPages || pending}
            onClick={() => apply(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-50"
          >
            {t("common.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
