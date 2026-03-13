"use client";

import { useState, useEffect } from "react";
import ScienceIcon from "@mui/icons-material/Science";
import { useTranslation } from "react-i18next";
import type {
  EmissionCategory,
  EmissionFactorWithCategory,
  CreateEmissionFactorInput,
  EFSource,
} from "@/types/sustainability";

const EF_SOURCES: EFSource[] = ["MONRE_VN", "IPCC", "DEFRA", "EPA", "Climatiq", "Custom"];

const GWP_CH4 = 27.9;  // IPCC AR6 GWP100
const GWP_N2O = 273;   // IPCC AR6 GWP100

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] " +
  "text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] " +
  "focus:ring-2 focus:ring-[#79B669]/20 transition-colors";

interface EFModalProps {
  categories: EmissionCategory[];
  editTarget: EmissionFactorWithCategory | null;
  loading: boolean;
  onSubmit: (input: CreateEmissionFactorInput) => void;
  onCancel: () => void;
}

type FormState = {
  category_id: string;
  name: string;
  unit: string;
  co2_value: string;
  ch4_value: string;
  n2o_value: string;
  co2e_total: string;
  source_reference: EFSource;
  year_valid: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  category_id: "",
  name: "",
  unit: "",
  co2_value: "0",
  ch4_value: "0",
  n2o_value: "0",
  co2e_total: "0",
  source_reference: "MONRE_VN",
  year_valid: new Date().getFullYear().toString(),
  notes: "",
};

export function EFModal({ categories, editTarget, loading, onSubmit, onCancel }: EFModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [autoCalc, setAutoCalc] = useState(true);

  // Pre-fill when editing
  useEffect(() => {
    if (editTarget) {
      setForm({
        category_id:       editTarget.category_id,
        name:              editTarget.name,
        unit:              editTarget.unit,
        co2_value:         String(editTarget.co2_value),
        ch4_value:         String(editTarget.ch4_value),
        n2o_value:         String(editTarget.n2o_value),
        co2e_total:        String(editTarget.co2e_total),
        source_reference:  editTarget.source_reference,
        year_valid:        editTarget.year_valid ? String(editTarget.year_valid) : "",
        notes:             editTarget.notes ?? "",
      });
    }
  }, [editTarget]);

  // Auto-calculate co2e_total when component values change
  useEffect(() => {
    if (!autoCalc) return;
    const co2 = parseFloat(form.co2_value) || 0;
    const ch4 = parseFloat(form.ch4_value) || 0;
    const n2o = parseFloat(form.n2o_value) || 0;
    const total = co2 + ch4 * GWP_CH4 + n2o * GWP_N2O;
    setForm((prev) => ({ ...prev, co2e_total: String(Math.round(total * 1e8) / 1e8) }));
  }, [form.co2_value, form.ch4_value, form.n2o_value, autoCalc]);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.category_id) errs.category_id = t("admin.ef.modal.required");
    if (!form.name.trim()) errs.name = t("admin.ef.modal.required");
    if (!form.unit.trim()) errs.unit = t("admin.ef.modal.unitHint");
    const total = parseFloat(form.co2e_total);
    if (isNaN(total) || total < 0) errs.co2e_total = t("admin.ef.modal.mustBePositive");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const input: CreateEmissionFactorInput = {
      category_id:      form.category_id,
      name:             form.name.trim(),
      unit:             form.unit.trim(),
      co2_value:        parseFloat(form.co2_value) || 0,
      ch4_value:        parseFloat(form.ch4_value) || 0,
      n2o_value:        parseFloat(form.n2o_value) || 0,
      co2e_total:       parseFloat(form.co2e_total),
      source_reference: form.source_reference,
      year_valid:       form.year_valid ? parseInt(form.year_valid) : null,
      notes:            form.notes.trim() || null,
    };
    onSubmit(input);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
              <ScienceIcon sx={{ fontSize: 20, color: "#1F8505" }} />
            </div>
            <div>
              <h2 className="text-[#155A03] text-lg font-semibold">
                {editTarget ? t("admin.ef.modal.titleEdit") : t("admin.ef.modal.titleNew")}
              </h2>
              <p className="text-[#AAAAAA] text-xs">{t("admin.ef.modal.requiredHint")}</p>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">
              {t("admin.ef.modal.category")} <span className="text-red-500">*</span>
            </label>
            <select value={form.category_id} onChange={set("category_id")} className={`${inputCls} cursor-pointer appearance-none`}>
              <option value="" disabled>{t("admin.ef.modal.selectCategory")}</option>
              {["Scope 1", "Scope 2", "Scope 3"].map((scope) => (
                <optgroup key={scope} label={scope}>
                  {categories
                    .filter((c) => c.scope === scope)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </optgroup>
              ))}
            </select>
            {errors.category_id && <p className="text-red-600 text-xs">{errors.category_id}</p>}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">
              {t("admin.ef.modal.name")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Vietnam National Grid 2022"
              value={form.name}
              onChange={set("name")}
              className={inputCls}
              maxLength={255}
            />
            {errors.name && <p className="text-red-600 text-xs">{errors.name}</p>}
          </div>

          {/* Unit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">
              {t("admin.ef.modal.unit")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. kgCO2e/kWh"
              value={form.unit}
              onChange={set("unit")}
              className={`${inputCls} font-mono`}
              maxLength={100}
            />
            {errors.unit && <p className="text-red-600 text-xs">{errors.unit}</p>}
          </div>

          {/* GHG Component breakdown */}
          <div className="bg-[#f9fdf7] border border-[#DAEDD5] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[#155A03] text-sm font-semibold">{t("admin.ef.modal.ghgValues")}</p>
              <label className="flex items-center gap-1.5 text-xs text-[#AAAAAA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCalc}
                  onChange={(e) => setAutoCalc(e.target.checked)}
                  className="accent-[#1F8505]"
                />
                {t("admin.ef.modal.autoCalc")}
              </label>
            </div>
            <p className="text-[#AAAAAA] text-xs -mt-1">
              {t("admin.ef.modal.gwpNote", { ch4: GWP_CH4, n2o: GWP_N2O })}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(["co2_value", "ch4_value", "n2o_value"] as const).map((field) => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-xs text-[#6E726E] font-medium">
                    {field === "co2_value" ? "CO₂" : field === "ch4_value" ? "CH₄" : "N₂O"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form[field]}
                    onChange={set(field)}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            {/* co2e_total */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#155A03]">
                {t("admin.ef.modal.co2eTotal")} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.co2e_total}
                onChange={(e) => {
                  setAutoCalc(false);
                  set("co2e_total")(e);
                }}
                className={`${inputCls} font-bold text-[#1F8505]`}
              />
              {errors.co2e_total && <p className="text-red-600 text-xs">{errors.co2e_total}</p>}
            </div>
          </div>

          {/* Source + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[#141514] text-sm font-medium">{t("admin.ef.modal.source")}</label>
              <select value={form.source_reference} onChange={set("source_reference")} className={`${inputCls} cursor-pointer appearance-none`}>
                {EF_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[#141514] text-sm font-medium">{t("admin.ef.modal.yearValid")}</label>
              <input
                type="number"
                placeholder="2022"
                value={form.year_valid}
                onChange={set("year_valid")}
                className={inputCls}
                min="2000"
                max="2100"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">{t("admin.ef.modal.notes")}</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="e.g. Quyết định 01/2022/QĐ-TTg – MONRE Vietnam"
              className="w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] focus:ring-2 focus:ring-[#79B669]/20 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t("admin.ef.modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading
                ? t("admin.ef.modal.saving")
                : editTarget
                  ? t("admin.ef.modal.saveChanges")
                  : t("admin.ef.modal.createFactor")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
