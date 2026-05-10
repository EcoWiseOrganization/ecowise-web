"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteAccount } from "@/hooks/useDeleteAccount";

export function DeleteAccountForm({ email }: { email: string }) {
  const { t } = useTranslation();
  const { confirmEmail, setConfirmEmail, loading, error, blockedOrgIds, submit } =
    useDeleteAccount();
  const [acknowledged, setAcknowledged] = useState(false);

  const canSubmit =
    acknowledged && confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="bg-white rounded-3xl border border-red-200 p-6 max-w-xl space-y-4">
      <h2 className="text-lg font-semibold text-red-700">
        {t("settings.danger.heading")}
      </h2>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 space-y-1">
        <p className="font-medium">{t("settings.danger.warningTitle")}</p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("settings.danger.warning1")}</li>
          <li>{t("settings.danger.warning2")}</li>
          <li>{t("settings.danger.warning3")}</li>
        </ul>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5"
        />
        <span>{t("settings.danger.ack")}</span>
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-[#6E726E] mb-1">
          {t("settings.danger.confirmLabel", { email })}
        </span>
        <input
          type="email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          placeholder={email}
        />
      </label>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <p>{t(`error.${error}`, { defaultValue: error })}</p>
          {blockedOrgIds.length > 0 && (
            <p className="mt-1 text-xs">
              {t("settings.danger.blockedOrgs", { count: blockedOrgIds.length })}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => submit()}
        disabled={!canSubmit || loading}
        className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("settings.danger.deleting") : t("settings.danger.submit")}
      </button>
    </div>
  );
}
