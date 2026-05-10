"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import {
  exportOrgReportAction,
  listOrgArchivesAction,
} from "@/app/actions/reports.actions";
import { triggerBase64Download } from "@/lib/download";
import type { ReportArchive, ReportFormat } from "@/types/report.types";

const FORMATS: { value: ReportFormat; labelKey: string }[] = [
  { value: "pdf", labelKey: "report.format.pdf" },
  { value: "xlsx", labelKey: "report.format.xlsx" },
  { value: "csv", labelKey: "report.format.csv" },
];

interface Props {
  orgId: string;
  isAdmin: boolean;
  initialArchives: ReportArchive[];
  defaultStart: string;
  defaultEnd: string;
}

export function OrgReportView({
  orgId,
  isAdmin,
  initialArchives,
  defaultStart,
  defaultEnd,
}: Props) {
  const { t } = useTranslation();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [publishLock, setPublishLock] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [archives, setArchives] = useState<ReportArchive[]>(initialArchives);
  const [success, setSuccess] = useState<string | null>(null);

  const onExport = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await exportOrgReportAction({
        orgId,
        period: { start, end },
        format,
        publishLock: publishLock && isAdmin,
      });
      if (!res.data) {
        setError(res.error ?? "unknown");
        return;
      }
      triggerBase64Download(res.data);
      const list = await listOrgArchivesAction(orgId);
      if (list.data) setArchives(list.data);
      setSuccess(
        publishLock && res.data.publishedCount > 0
          ? "report.lockedNotice"
          : "report.exportSuccess"
      );
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <Field label={t("report.period.start")}>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("report.period.end")}>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("report.format.label")}>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportFormat)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {t(f.labelKey)}
              </option>
            ))}
          </select>
        </Field>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publishLock}
              onChange={(e) => setPublishLock(e.target.checked)}
            />
            <span>{t("report.publishLock")}</span>
          </label>
        )}
        <button
          type="button"
          onClick={onExport}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("report.exporting") : t("report.export")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {t(success, { defaultValue: success })}
        </div>
      )}

      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <h3 className="text-[#155A03] text-lg font-semibold mb-3">
          {t("report.archives")}
        </h3>
        {archives.length === 0 ? (
          <p className="text-sm text-[#AAAAAA]">{t("report.archivesEmpty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[#6E726E] text-xs uppercase">
              <tr className="border-b border-gray-100">
                <th className="px-2 py-2">{t("report.col.kind")}</th>
                <th className="px-2 py-2">{t("report.col.format")}</th>
                <th className="px-2 py-2">{t("report.col.period")}</th>
                <th className="px-2 py-2">{t("report.col.totalCo2e")}</th>
                <th className="px-2 py-2">{t("report.col.logs")}</th>
                <th className="px-2 py-2">{t("report.col.when")}</th>
              </tr>
            </thead>
            <tbody>
              {archives.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-2">{a.kind}</td>
                  <td className="px-2 py-2 uppercase">{a.format}</td>
                  <td className="px-2 py-2">
                    {a.period_start} → {a.period_end}
                  </td>
                  <td className="px-2 py-2 font-semibold text-[#155A03]">
                    {Number(a.total_co2e_kg ?? 0).toFixed(2)} kg
                  </td>
                  <td className="px-2 py-2">{a.log_count}</td>
                  <td className="px-2 py-2 text-xs text-[#AAAAAA]">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6E726E] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
