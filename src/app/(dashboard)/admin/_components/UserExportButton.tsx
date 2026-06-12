"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import {
  exportAdminUsers,
  type AdminUsersExportFormat,
} from "@/app/actions/admin-users.actions";
import { triggerBase64Download } from "@/lib/download";

/**
 * Two-button group letting the System Admin download the full user roster
 * as Excel (.xlsx) or CSV. Hits the `exportAdminUsers` server action and
 * pipes its base64 payload through the shared download helper — same
 * pattern used by the report exporters.
 */
export function UserExportButton() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<AdminUsersExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: AdminUsersExportFormat) {
    setBusy(format);
    setError(null);
    try {
      const result = await exportAdminUsers(format);
      triggerBase64Download({
        base64: result.base64,
        filename: result.filename,
        mimeType: result.mimeType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleExport("xlsx")}
          disabled={busy !== null}
          className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileDownloadIcon sx={{ fontSize: 18 }} />
          {busy === "xlsx"
            ? t("admin.users.export.busy", { defaultValue: "Exporting…" })
            : t("admin.users.export.xlsx", { defaultValue: "Excel" })}
        </button>
        <button
          type="button"
          onClick={() => handleExport("csv")}
          disabled={busy !== null}
          className="border-brand-200 text-brand-700 hover:bg-brand-50 inline-flex items-center gap-1.5 rounded-xl border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}
