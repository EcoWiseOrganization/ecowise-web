"use client";

import { useTranslation } from "react-i18next";
import { useChangePassword } from "@/hooks/useChangePassword";

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const {
    oldPassword,
    newPassword,
    confirmPassword,
    setOldPassword,
    setNewPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    submit,
  } = useChangePassword();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await submit();
      }}
      className="bg-white rounded-3xl border border-[#B8D6B0] p-6 max-w-xl space-y-4"
    >
      <h2 className="text-lg font-semibold text-[#155A03]">
        {t("settings.password.heading")}
      </h2>
      <p className="text-sm text-[#6E726E]">
        {t("settings.password.policyHint")}
      </p>

      <Field
        label={t("settings.password.current")}
        value={oldPassword}
        onChange={setOldPassword}
        autoComplete="current-password"
      />
      <Field
        label={t("settings.password.new")}
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />
      <Field
        label={t("settings.password.confirm")}
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />

      {error && (
        <p className="text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700">
          {t("settings.password.success")}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 bg-[#155A03] text-white rounded-lg text-sm font-medium hover:bg-[#0e4302] disabled:opacity-50"
      >
        {loading ? t("settings.password.saving") : t("settings.password.submit")}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6E726E] mb-1">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        required
      />
    </label>
  );
}
