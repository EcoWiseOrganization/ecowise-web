"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { exportComplianceReportAction } from "@/app/actions/reports.actions";
import { triggerBase64Download } from "@/lib/download";
import type {
  ComplianceRegulation,
  ReportLanguage,
} from "@/types/report.types";

const REGULATIONS: { value: ComplianceRegulation; labelKey: string }[] = [
  { value: "GHG_PROTOCOL", labelKey: "compliance.reg.ghg" },
  { value: "GRI", labelKey: "compliance.reg.gri" },
  { value: "TCFD", labelKey: "compliance.reg.tcfd" },
];

const LANGUAGES: { value: ReportLanguage; labelKey: string }[] = [
  { value: "en", labelKey: "compliance.lang.en" },
  { value: "vi", labelKey: "compliance.lang.vi" },
];

export function ComplianceView({
  orgId,
  defaultStart,
  defaultEnd,
}: {
  orgId: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const { t } = useTranslation();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [regulation, setRegulation] = useState<ComplianceRegulation>(
    "GHG_PROTOCOL"
  );
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [language, setLanguage] = useState<ReportLanguage>("en");
  const [publishLock, setPublishLock] = useState(true);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null
  );

  const onExport = () => {
    setStatus(null);
    startTransition(async () => {
      const res = await exportComplianceReportAction({
        orgId,
        period: { start, end },
        format,
        regulation,
        language,
        publishLock,
      });
      if (!res.data) {
        setStatus({ ok: false, msg: res.error ?? "unknown" });
        return;
      }
      triggerBase64Download(res.data);
      setStatus({
        ok: true,
        msg:
          publishLock && res.data.publishedCount > 0
            ? "report.lockedNotice"
            : "report.exportSuccess",
      });
    });
  };

  return (
    <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-[#155A03] text-lg font-semibold">
          {t("compliance.title")}
        </h2>
        <p className="text-sm text-[#6E726E]">{t("compliance.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        <Field label={t("compliance.regulation")}>
          <select
            value={regulation}
            onChange={(e) =>
              setRegulation(e.target.value as ComplianceRegulation)
            }
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {REGULATIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.labelKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("compliance.language")}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as ReportLanguage)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {t(l.labelKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("report.format.label")}>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "pdf" | "xlsx")}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={publishLock}
            onChange={(e) => setPublishLock(e.target.checked)}
          />
          <span>{t("report.publishLock")}</span>
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={onExport}
          disabled={pending}
          className="px-5 py-2.5 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("report.exporting") : t("compliance.generate")}
        </button>
      </div>

      {status && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            status.ok
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {t(status.ok ? status.msg : `error.${status.msg}`, {
            defaultValue: status.msg,
          })}
        </div>
      )}

      <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-lg p-4 text-xs text-[#3B3D3B] leading-5">
        <strong>{t("compliance.checklistTitle")}</strong>
        <ul className="list-disc list-inside mt-1">
          <li>{t("compliance.checklist.scope1")}</li>
          <li>{t("compliance.checklist.scope2")}</li>
          <li>{t("compliance.checklist.scope3")}</li>
          <li>{t("compliance.checklist.completeness")}</li>
          <li>{t("compliance.checklist.frozen")}</li>
          <li>{t("compliance.checklist.audit")}</li>
        </ul>
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
