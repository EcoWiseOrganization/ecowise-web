"use client";

import { useState } from "react";
import FunctionsIcon from "@mui/icons-material/Functions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useTranslation } from "react-i18next";
import type {
  EmissionCategory,
  EmissionFactorWithCategory,
  InputFieldSchema,
  CalculationMethod,
  CreateCalculationTemplateInput,
} from "@/types/sustainability";
import { FormulaEngine } from "@/lib/formula-engine";
import { InputSchemaBuilder } from "./InputSchemaBuilder";

const METHODS: CalculationMethod[] = ["Activity-based", "Spend-based", "Hybrid"];

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] " +
  "text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] " +
  "focus:ring-2 focus:ring-[#79B669]/20 transition-colors";

interface FormulaBuilderFormProps {
  categories: EmissionCategory[];
  factors: EmissionFactorWithCategory[];
  loading: boolean;
  onSubmit: (input: CreateCalculationTemplateInput) => void;
  onCancel: () => void;
}

export function FormulaBuilderForm({
  categories,
  factors,
  loading,
  onSubmit,
  onCancel,
}: FormulaBuilderFormProps) {
  const { t } = useTranslation();

  // ── Form state ─────────────────────────────────────────────────────────
  const [categoryId, setCategoryId]   = useState("");
  const [defaultEfId, setDefaultEfId] = useState("");
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod]           = useState<CalculationMethod>("Activity-based");
  const [resultUnit, setResultUnit]   = useState("kgCO2e");
  const [inputSchema, setInputSchema] = useState<InputFieldSchema[]>([]);
  const [formula, setFormula]         = useState("");
  const [errors, setErrors]           = useState<Record<string, string>>({});

  // ── Formula validation state ────────────────────────────────────────────
  const formulaValidation = formula.trim()
    ? FormulaEngine.validate(formula)
    : null;

  const declaredVars = new Set(inputSchema.map((f) => f.field));

  const formulaVars  = formula.trim()
    ? new Set(FormulaEngine.getRequiredVariables(formula))
    : new Set<string>();

  const undeclaredVars = [...formulaVars].filter((v) => !declaredVars.has(v));
  const unusedVars = [...declaredVars].filter((v) => !formulaVars.has(v));

  // ── Filter factors by selected category ────────────────────────────────
  const availableFactors = categoryId
    ? factors.filter((f) => f.category_id === categoryId)
    : factors;

  // ── Submission ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!categoryId)      errs.categoryId = t("admin.ef.modal.required");
    if (!name.trim())     errs.name = t("admin.ef.modal.required");
    if (!formula.trim())  errs.formula = t("admin.ef.modal.required");

    const fv = FormulaEngine.validate(formula);
    if (!fv.valid) errs.formula = fv.error ?? "Invalid formula";

    if (undeclaredVars.length > 0) {
      errs.formula = `Formula uses undeclared variables: ${undeclaredVars.join(", ")}. Add them to Input Schema.`;
    }

    inputSchema.forEach((f, i) => {
      if (!f.field.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        errs[`field_${i}`] = `Field #${i + 1}: variable name must start with a letter/underscore`;
      }
      if (!f.label.trim()) {
        errs[`label_${i}`] = `Field #${i + 1}: label is required`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const input: CreateCalculationTemplateInput = {
      category_id:        categoryId,
      name:               name.trim(),
      description:        description.trim() || undefined,
      input_schema:       inputSchema,
      formula_string:     formula.trim(),
      calculation_method: method,
      result_unit:        resultUnit.trim() || "kgCO2e",
      default_ef_id:      defaultEfId || undefined,
    };
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
          <FunctionsIcon sx={{ fontSize: 22, color: "#1F8505" }} />
        </div>
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold">{t("admin.formula.form.title")}</h2>
          <p className="text-[#AAAAAA] text-xs">
            {t("admin.formula.form.subtitle")}
          </p>
        </div>
      </div>

      {/* ── Section 1: Basic Info ── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-xs font-bold text-[#1F8505] uppercase tracking-wide mb-1">
          {t("admin.formula.form.section1")}
        </legend>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">
              {t("admin.formula.form.category")} <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setDefaultEfId(""); }}
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              <option value="" disabled>{t("admin.formula.form.selectCategory")}</option>
              {["Scope 1", "Scope 2", "Scope 3"].map((scope) => (
                <optgroup key={scope} label={scope}>
                  {categories.filter((c) => c.scope === scope).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-600 text-xs">{errors.categoryId}</p>}
          </div>

          {/* Calculation Method */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">{t("admin.formula.form.method")}</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as CalculationMethod)} className={`${inputCls} cursor-pointer appearance-none`}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Template Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[#141514] text-sm font-medium">
            {t("admin.formula.form.templateName")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Điện năng tiêu thụ (kWh)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            maxLength={255}
          />
          {errors.name && <p className="text-red-600 text-xs">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[#141514] text-sm font-medium">{t("admin.formula.form.description")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Mô tả ngắn về template này và khi nào dùng…"
            className="w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] focus:ring-2 focus:ring-[#79B669]/20 transition-colors resize-none"
          />
        </div>

        {/* Default EF + Result Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">{t("admin.formula.form.defaultEF")}</label>
            <select value={defaultEfId} onChange={(e) => setDefaultEfId(e.target.value)} className={`${inputCls} cursor-pointer appearance-none`}>
              <option value="">{t("admin.formula.form.userSelectsEF")}</option>
              {availableFactors.map((ef) => (
                <option key={ef.id} value={ef.id}>
                  {ef.name} ({ef.co2e_total} {ef.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#141514] text-sm font-medium">{t("admin.formula.form.resultUnit")}</label>
            <input
              type="text"
              value={resultUnit}
              onChange={(e) => setResultUnit(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="kgCO2e"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Section 2: Input Schema ── */}
      <fieldset className="flex flex-col gap-4">
        <div>
          <legend className="text-xs font-bold text-[#1F8505] uppercase tracking-wide">
            {t("admin.formula.form.section2")}
          </legend>
          <p className="text-[#AAAAAA] text-xs mt-0.5">
            {t("admin.formula.form.section2Hint")}
          </p>
        </div>
        <InputSchemaBuilder fields={inputSchema} onChange={setInputSchema} />
      </fieldset>

      {/* ── Section 3: Formula Editor ── */}
      <fieldset className="flex flex-col gap-3">
        <div>
          <legend className="text-xs font-bold text-[#1F8505] uppercase tracking-wide">
            {t("admin.formula.form.section3")}
          </legend>
          <p className="text-[#AAAAAA] text-xs mt-0.5">
            {t("admin.formula.form.section3Hint")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[#141514] text-sm font-medium">
            {t("admin.formula.form.formulaLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g.  kwh * EF_TOTAL"
            className={`${inputCls} font-mono text-base`}
            spellCheck={false}
          />

          {/* Live validation feedback */}
          {formula.trim() && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
              formulaValidation?.valid
                ? "bg-[#f0f9ed] border-[#DAEDD5] text-[#1F8505]"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {formulaValidation?.valid
                ? <CheckCircleIcon sx={{ fontSize: 14, mt: 0.1 }} />
                : <ErrorIcon sx={{ fontSize: 14, mt: 0.1 }} />
              }
              <span>
                {formulaValidation?.valid
                  ? t("admin.formula.form.formulaValid")
                  : formulaValidation && !formulaValidation.valid
                    ? formulaValidation.error
                    : ""}
              </span>
            </div>
          )}

          {errors.formula && <p className="text-red-600 text-xs">{errors.formula}</p>}
        </div>

        {/* Variable cross-check panel */}
        {(formulaVars.size > 0 || declaredVars.size > 0) && (
          <div className="bg-[#f9fdf7] border border-[#DAEDD5] rounded-xl p-3 text-xs flex flex-col gap-1.5">
            <p className="font-semibold text-[#155A03]">{t("admin.formula.form.varCrossCheck")}</p>
            <div className="flex flex-wrap gap-1.5">
              {[...formulaVars].map((v) => (
                <span
                  key={v}
                  className={`px-2 py-0.5 rounded-full border font-mono ${
                    v === "EF_TOTAL"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : declaredVars.has(v)
                        ? "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]"
                        : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {v} {v !== "EF_TOTAL" && (declaredVars.has(v) ? "✓" : "⚠ undeclared")}
                </span>
              ))}
            </div>
            {unusedVars.length > 0 && (
              <p className="text-amber-600">
                {t("admin.formula.form.undeclaredWarn", { vars: unusedVars.join(", ") })}
              </p>
            )}
          </div>
        )}
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2 border-t border-[#DAEDD5]">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={loading || (formulaValidation !== null && !formulaValidation.valid)}
          className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? t("admin.formula.form.saving") : t("admin.formula.form.saveTemplate")}
        </button>
      </div>
    </form>
  );
}
