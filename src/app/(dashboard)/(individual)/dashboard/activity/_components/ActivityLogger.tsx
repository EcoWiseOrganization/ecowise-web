"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersonalActivity } from "@/hooks/usePersonalActivity";
import type { GhgScope } from "@/types/emission-log.types";

const SCOPES: GhgScope[] = ["Scope 1", "Scope 2", "Scope 3"];

export function ActivityLogger() {
  const { t } = useTranslation();
  const {
    logs,
    quota,
    loading,
    submitting,
    error,
    filters,
    setFilters,
    create,
    remove,
    refresh,
  } = usePersonalActivity({ pageSize: 25 });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    activity_name: string;
    scope: GhgScope;
    reporting_date: string;
    quantity: string;
    unit: string;
    co2e_result: string;
    evidence_url: string;
  }>({
    activity_name: "",
    scope: "Scope 1",
    reporting_date: new Date().toISOString().slice(0, 10),
    quantity: "",
    unit: "kWh",
    co2e_result: "",
    evidence_url: "",
  });

  const remainingQuota = Math.max(0, quota.limit - quota.used);
  const atLimit = remainingQuota <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    const co2 = form.co2e_result ? parseFloat(form.co2e_result) : undefined;
    if (!form.activity_name.trim() || !Number.isFinite(qty) || qty <= 0) return;
    const res = await create({
      activity_name: form.activity_name,
      scope: form.scope,
      reporting_date: form.reporting_date,
      quantity: qty,
      unit: form.unit,
      co2e_result: co2,
      evidence_url: form.evidence_url || undefined,
      status: "Pending",
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        ...form,
        activity_name: "",
        quantity: "",
        co2e_result: "",
        evidence_url: "",
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#DAEDD5] p-12 text-center text-sm text-[#6E726E]">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="bg-white rounded-2xl border border-[#DAEDD5] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold">
            {t("activity.title")}
          </h2>
          <p className="text-sm text-[#6E726E]">
            {t("activity.quota", { used: quota.used, limit: quota.limit })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={atLimit}
          className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showForm ? t("common.cancel") : t("activity.addEntry")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#DAEDD5] p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Field label={t("activity.field.name")}>
            <input
              type="text"
              value={form.activity_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, activity_name: e.target.value }))
              }
              required
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </Field>
          <Field label={t("activity.field.scope")}>
            <select
              value={form.scope}
              onChange={(e) =>
                setForm((s) => ({ ...s, scope: e.target.value as GhgScope }))
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
            >
              {SCOPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label={t("activity.field.date")}>
            <input
              type="date"
              value={form.reporting_date}
              onChange={(e) =>
                setForm((s) => ({ ...s, reporting_date: e.target.value }))
              }
              required
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </Field>
          <Field label={t("activity.field.quantity")}>
            <div className="flex gap-2">
              <input
                type="number"
                value={form.quantity}
                onChange={(e) =>
                  setForm((s) => ({ ...s, quantity: e.target.value }))
                }
                required
                min={0}
                step="any"
                className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
              />
              <input
                type="text"
                value={form.unit}
                onChange={(e) =>
                  setForm((s) => ({ ...s, unit: e.target.value }))
                }
                required
                maxLength={20}
                className="w-24 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                placeholder={t("activity.field.unit")}
              />
            </div>
          </Field>
          <Field label={t("activity.field.co2e")}>
            <input
              type="number"
              value={form.co2e_result}
              onChange={(e) =>
                setForm((s) => ({ ...s, co2e_result: e.target.value }))
              }
              min={0}
              step="any"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
              placeholder="kg"
            />
          </Field>
          <Field label={t("activity.field.evidence")}>
            <input
              type="url"
              value={form.evidence_url}
              onChange={(e) =>
                setForm((s) => ({ ...s, evidence_url: e.target.value }))
              }
              placeholder="https://"
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </Field>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? t("activity.saving") : t("activity.save")}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          placeholder={t("activity.searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) => {
            const next = { ...filters, search: e.target.value, page: 1 };
            setFilters(next);
            void refresh(next);
          }}
          className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
        <select
          value={filters.scope ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            const next: typeof filters = {
              ...filters,
              scope: v === "" ? "" : (v as GhgScope),
              page: 1,
            };
            setFilters(next);
            void refresh(next);
          }}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">{t("activity.scopeAll")}</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#DAEDD5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2">{t("activity.col.activity")}</th>
              <th className="px-3 py-2">{t("activity.col.scope")}</th>
              <th className="px-3 py-2">{t("activity.col.date")}</th>
              <th className="px-3 py-2">{t("activity.col.quantity")}</th>
              <th className="px-3 py-2">{t("activity.col.co2e")}</th>
              <th className="px-3 py-2">{t("activity.col.status")}</th>
              <th className="px-3 py-2 text-right">{t("activity.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[#AAAAAA]">
                  {t("activity.empty")}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 font-medium text-[#141514]">
                    {log.activity_name}
                  </td>
                  <td className="px-3 py-3">{log.scope}</td>
                  <td className="px-3 py-3">{log.reporting_date}</td>
                  <td className="px-3 py-3">
                    {log.quantity} {log.unit}
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#155A03]">
                    {(log.co2e_result ?? 0).toFixed(2)} kg
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                      {log.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(log.id)}
                      className="text-xs text-red-600 hover:underline"
                      disabled={log.status === "Published" || log.status === "Exported"}
                      title={
                        log.status === "Published" || log.status === "Exported"
                          ? t("activity.lockedHint")
                          : undefined
                      }
                    >
                      {t("activity.delete")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
