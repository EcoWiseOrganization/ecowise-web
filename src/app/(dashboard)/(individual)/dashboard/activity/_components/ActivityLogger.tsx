"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePersonalActivity } from "@/hooks/usePersonalActivity";
import { todayLocalISO } from "@/lib/dates";
import { getCalculationTemplates } from "@/services/sustainability.service";
import { FormulaEngine } from "@/lib/formula-engine";
import type { GhgScope } from "@/types/emission-log.types";
import type {
  CalculationTemplateWithRelations,
  InputFieldSchema,
} from "@/types/sustainability";

const SCOPES: GhgScope[] = ["Scope 1", "Scope 2", "Scope 3"];
const PAGE_SIZE = 25;

export function ActivityLogger() {
  const { t } = useTranslation();
  const {
    logs,
    count,
    quota,
    loading,
    submitting,
    error,
    filters,
    setFilters,
    create,
    update,
    remove,
    refresh,
  } = usePersonalActivity({ pageSize: PAGE_SIZE, page: 1 });

  // Debounce: keep the input responsive but only hit the server 300 ms
  // after the user stops typing. Without this, every keystroke fires a
  // server action — fine on a laptop, painful on a phone.
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);
  const onSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = { ...filters, search: value, page: 1 };
      setFilters(next);
      void refresh(next);
    }, 300);
  };

  // Pager helpers (server-side pagination — caller supplies page in filters).
  const currentPage = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next));
    if (clamped === currentPage) return;
    const nextFilters = { ...filters, page: clamped };
    setFilters(nextFilters);
    void refresh(nextFilters);
  };

  const [showForm, setShowForm] = useState(false);
  // null = creating, string = editing the log with this id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CalculationTemplateWithRelations[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [description, setDescription] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const remainingQuota = Math.max(0, quota.limit - quota.used);
  const atLimit = remainingQuota <= 0;

  // Pre-load formulas on mount — the Edit-action path needs them to
  // match log.source_type_id → template, and we don't want a flash of
  // empty dropdown when the user opens the form for the first time.
  // Templates without a default_ef can't resolve EF_TOTAL, so skip them.
  useEffect(() => {
    if (templates.length || templatesLoading) return;
    setTemplatesLoading(true);
    getCalculationTemplates()
      .then((rows) => setTemplates(rows.filter((t) => t.default_ef !== null)))
      .catch((e) => console.error(e))
      .finally(() => setTemplatesLoading(false));
  }, [templates.length, templatesLoading]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  // EF_TOTAL is resolved server-side from the linked emission factor;
  // never ask the user to type it.
  const visibleFields: InputFieldSchema[] = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.input_schema.filter(
      (f) => f.field.toUpperCase() !== "EF_TOTAL",
    );
  }, [selectedTemplate]);

  // First numeric field becomes the persisted (quantity, unit) pair —
  // the EmissionLog schema requires both NOT NULL with quantity > 0.
  const primaryNumericField = useMemo(
    () => visibleFields.find((f) => f.type === "number") ?? null,
    [visibleFields],
  );

  // Live formula evaluation — driven by the user's inputs + the
  // formula's linked EF. Returns null while inputs are missing /
  // invalid so the UI can show a placeholder instead of NaN.
  const evaluation = useMemo(() => {
    if (!selectedTemplate || !selectedTemplate.default_ef) return null;
    const scope: Record<string, number> = {
      EF_TOTAL: Number(selectedTemplate.default_ef.co2e_total) || 0,
    };
    for (const f of visibleFields) {
      const raw = inputValues[f.field];
      const n = raw === undefined || raw === "" ? NaN : Number(raw);
      if (!Number.isFinite(n)) return null;
      scope[f.field] = n;
    }
    try {
      const kg = FormulaEngine.evaluate(selectedTemplate.formula_string, scope);
      if (!Number.isFinite(kg) || kg < 0) return null;
      return { kg, tonnes: kg / 1000 };
    } catch {
      return null;
    }
  }, [selectedTemplate, visibleFields, inputValues]);

  function resetForm() {
    setEditingId(null);
    setTemplateId("");
    setDescription("");
    setInputValues({});
  }

  // Edit flow — open the same form pre-filled with what we can recover
  // from the stored log row. The schema doesn't persist the full
  // input_schema values, so only the primary numeric field is restored;
  // other formula inputs start blank and the user re-enters them. We
  // intentionally re-use the create form rather than a separate modal
  // so the formula/scope/co2e logic stays in one place.
  function startEdit(log: (typeof logs)[number]) {
    if (log.status === "Published" || log.status === "Exported") return;
    const tmpl =
      templates.find((x) => x.category_id === log.source_type_id) ?? null;
    setEditingId(log.id);
    setDescription(log.activity_name);
    setTemplateId(tmpl?.id ?? "");

    if (tmpl) {
      const next: Record<string, string> = {};
      const visible = tmpl.input_schema.filter(
        (f) => f.field.toUpperCase() !== "EF_TOTAL",
      );
      const primary = visible.find((f) => f.type === "number") ?? null;
      for (const f of visible) {
        if (f.default_value !== undefined && f.default_value !== null) {
          next[f.field] = String(f.default_value);
        }
      }
      if (primary) next[primary.field] = String(log.quantity);
      setInputValues(next);
    } else {
      setInputValues({});
    }

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setTemplateId(id);
    // Pre-fill numeric inputs with the schema's default_value if any.
    const next: Record<string, string> = {};
    const tmpl = templates.find((x) => x.id === id);
    if (tmpl) {
      for (const f of tmpl.input_schema) {
        if (f.field.toUpperCase() === "EF_TOTAL") continue;
        if (f.default_value !== undefined && f.default_value !== null) {
          next[f.field] = String(f.default_value);
        }
      }
    }
    setInputValues(next);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedTemplate.default_ef) return;
    if (!description.trim()) return;
    if (evaluation == null) return;

    // Derive the persisted (quantity, unit) pair from the primary
    // numeric field; fall back to the formula result + result_unit
    // when the formula has no numeric inputs (rare).
    const quantity = primaryNumericField
      ? Number(inputValues[primaryNumericField.field])
      : Math.max(evaluation.kg, 0.0001);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    // `||` (not `??`) so an empty-string unit from a partially-seeded
    // input_schema still falls back through to result_unit and finally
    // a hard default — the EmissionLog row requires a non-null unit.
    const unit =
      primaryNumericField?.unit || selectedTemplate.result_unit || "unit";

    const payload = {
      activity_name: description.trim(),
      scope: selectedTemplate.category.scope as GhgScope,
      source_type_id: selectedTemplate.category_id,
      reporting_date: todayLocalISO(),
      quantity,
      unit,
      co2e_result: evaluation.tonnes,
      status: "Pending" as const,
    };
    const res = editingId
      ? await update(editingId, payload)
      : await create(payload);
    if (res.ok) {
      setShowForm(false);
      resetForm();
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
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          disabled={atLimit && !editingId}
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
          className="bg-white rounded-2xl border border-[#DAEDD5] p-6 flex flex-col gap-4"
        >
          {editingId && (
            <div className="rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
              <span className="font-semibold">{t("activity.editingTitle")}</span>
              {" — "}
              {t("activity.editingHint")}
            </div>
          )}

          {/* 1 — Pick a formula */}
          <Field label={t("activity.field.formula")}>
            <select
              value={templateId}
              onChange={handleTemplateChange}
              disabled={templatesLoading}
              required
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white disabled:bg-[#F5F5F5] disabled:cursor-not-allowed"
            >
              <option value="">
                {templatesLoading
                  ? t("activity.formula.loading")
                  : templates.length === 0
                    ? t("activity.formula.none")
                    : t("activity.formula.placeholder")}
              </option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-1 text-[11px] text-[#AAAAAA] font-mono">
                {selectedTemplate.formula_string}
                {" · "}
                <span className="font-sans">
                  {selectedTemplate.category.scope}
                </span>
              </p>
            )}
          </Field>

          {/* 2 — Description (note → activity_name) */}
          <Field label={t("activity.field.description")}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={200}
              placeholder={t("activity.description.placeholder")}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </Field>

          {/* 3 — Dynamic formula inputs */}
          {selectedTemplate && visibleFields.length > 0 && (
            <div className="rounded-xl border border-[#DAEDD5] bg-[#F7FBF5] p-4 flex flex-col gap-3">
              <p className="text-[#155A03] text-xs font-bold uppercase tracking-wide">
                {t("activity.formula.inputsTitle")}
              </p>
              {visibleFields.map((f) => {
                const value = inputValues[f.field] ?? "";
                // Skip the unit suffix when the label already ends in
                // parens — most VN seeds embed the unit there.
                const labelHasUnitSuffix = /\([^()]+\)\s*$/.test(f.label);
                const displayLabel =
                  !f.unit || labelHasUnitSuffix
                    ? f.label
                    : `${f.label} (${f.unit})`;
                return (
                  <Field key={f.field} label={displayLabel}>
                    {f.type === "select" ? (
                      <select
                        value={value}
                        onChange={(e) =>
                          setInputValues((p) => ({
                            ...p,
                            [f.field]: e.target.value,
                          }))
                        }
                        required={f.required !== false}
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
                      >
                        <option value="">—</option>
                        {(f.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setInputValues((p) => ({
                            ...p,
                            [f.field]: e.target.value,
                          }))
                        }
                        required={f.required !== false}
                        min={f.min}
                        max={f.max}
                        step="any"
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
                      />
                    )}
                  </Field>
                );
              })}
              {/* Live CO₂e preview — informational only, the server
                  re-evaluates on submit. */}
              <div className="text-xs text-[#155A03] pt-1 border-t border-[#DAEDD5]">
                {evaluation
                  ? `≈ ${evaluation.kg.toFixed(2)} kg CO₂e (${evaluation.tonnes.toFixed(4)} t)`
                  : t("activity.field.co2e")}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTemplate || evaluation == null}
              className="px-5 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
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
                  {/*
                    * Distinguish "no data" from "filtered out nothing"
                    * — both hit this branch but the user's next action
                    * is different (log first activity vs. clear the
                    * filter). The empty-set fallback shows up only
                    * when the user hasn't typed a search and has no
                    * scope / status filter active.
                    */}
                  {filters.search?.trim() || filters.scope || filters.status
                    ? t("activity.emptyFiltered", {
                        defaultValue:
                          "No activity matches the current filters. Try clearing them.",
                      })
                    : t("activity.empty")}
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
                    {(() => {
                      const locked =
                        log.status === "Published" || log.status === "Exported";
                      const lockTitle = locked ? t("activity.lockedHint") : undefined;
                      return (
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(log)}
                            className="text-xs text-[#1F8505] hover:underline"
                            disabled={locked}
                            title={lockTitle}
                          >
                            {t("activity.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(log.id)}
                            className="text-xs text-red-600 hover:underline"
                            disabled={locked}
                            title={lockTitle}
                          >
                            {t("activity.delete")}
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginator — only shown when there's more than one page. Previous
        * versions silently capped users at 25 rows because no UI existed. */}
      {count > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[#6E726E]">
          <span>
            {t("activity.paginationSummary", {
              defaultValue: "{{from}}–{{to}} of {{total}}",
              from: count === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
              to: Math.min(currentPage * PAGE_SIZE, count),
              total: count,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="px-3 py-1.5 rounded-lg border border-[#DAEDD5] text-[#3B3D3B] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f5f5]"
            >
              {t("common.previous", { defaultValue: "Previous" })}
            </button>
            <span className="text-xs">
              {t("activity.paginationPage", {
                defaultValue: "Page {{page}} / {{total}}",
                page: currentPage,
                total: totalPages,
              })}
            </span>
            <button
              type="button"
              disabled={loading || currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="px-3 py-1.5 rounded-lg border border-[#DAEDD5] text-[#3B3D3B] text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f5f5]"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}
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
