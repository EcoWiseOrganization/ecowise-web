"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  exportSubscribedUsers,
  type AdminUsersExportFormat,
} from "@/app/actions/admin-users.actions";
import { triggerBase64Download } from "@/lib/download";
import { formatMoney } from "@/lib/format-number";
import type { SubscribedUserRow } from "@/services/subscription.service";

function SubStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const color =
    status === "Active"
      ? "bg-[#DAEDD5] text-[#155A03]"
      : status === "Trial"
        ? "bg-blue-50 text-blue-700"
        : status === "PastDue"
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {t(`billing.status.${status}`, { defaultValue: status })}
    </span>
  );
}

export function SubscribedUsersView({ rows }: { rows: SubscribedUserRow[] }) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState<AdminUsersExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);

  async function handleExport(format: AdminUsersExportFormat) {
    setBusy(format);
    setError(null);
    try {
      const res = await exportSubscribedUsers(format);
      triggerBase64Download({
        base64: res.base64,
        filename: res.filename,
        mimeType: res.mimeType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-[#6E726E]">
          {t("admin.users.sub.count", {
            defaultValue: "{{count}} subscribed users",
            count: rows.length,
          })}
        </span>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              disabled={busy !== null || rows.length === 0}
              className="bg-[#1F8505] hover:bg-[#176d04] inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileDownloadIcon sx={{ fontSize: 18 }} />
              {busy === "xlsx"
                ? t("admin.users.export.busy", { defaultValue: "Exporting…" })
                : t("admin.users.export.xlsx", { defaultValue: "Excel" })}
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={busy !== null || rows.length === 0}
              className="border border-[#DAEDD5] text-[#1F8505] hover:bg-[#f0f9ed] inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileDownloadIcon sx={{ fontSize: 18 }} />
              {busy === "csv"
                ? t("admin.users.export.busy", { defaultValue: "Exporting…" })
                : t("admin.users.export.csv", { defaultValue: "CSV" })}
            </button>
          </div>
          {error && (
            <span className="text-xs text-red-600">
              {t("admin.users.export.error", { defaultValue: "Export failed" })}: {error}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#B8D6B0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#DAEDD5] text-left text-[#155A03] text-xs font-bold uppercase">
              <th className="px-4 py-3">{t("admin.users.sub.col.user")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.plan")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.cycle")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.status")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.amount")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.period")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.autoRenew")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.invoice")}</th>
              <th className="px-4 py-3">{t("admin.users.sub.col.paidAt")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.user_id}
                className="border-b border-[#DAEDD5] last:border-b-0 hover:bg-[#F9FDF7] align-top"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[#155A03]">
                    {r.full_name || r.user_name || "N/A"}
                  </div>
                  <div className="text-xs text-[#AAAAAA]">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-[#3B3D3B]">{r.plan_name}</td>
                <td className="px-4 py-3">{t(`billing.cycle.${r.billing_cycle}`)}</td>
                <td className="px-4 py-3">
                  <SubStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 font-semibold text-[#155A03]">
                  {formatMoney(r.amount, r.currency)}
                </td>
                <td className="px-4 py-3 text-xs text-[#6E726E]">
                  {r.billing_cycle === "Lifetime" ? (
                    t("billing.cycle.Lifetime")
                  ) : (
                    <>
                      {fmtDate(r.current_period_start)} →{" "}
                      {fmtDate(r.current_period_end)}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.auto_renew ? t("billing.on") : t("billing.off")}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.invoice_number ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[#6E726E]">
                  {r.invoice_paid_at ? fmtDate(r.invoice_paid_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-12 flex items-center justify-center">
            <p className="text-[#6E726E] text-sm">
              {t("admin.users.sub.empty", {
                defaultValue: "No users have purchased a plan yet.",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
