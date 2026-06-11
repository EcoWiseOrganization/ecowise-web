"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FunctionsIcon from "@mui/icons-material/Functions";
import type {
  CalculationTemplateWithRelations,
  InputFieldSchema,
} from "@/types/sustainability";
import { getCalculationTemplates } from "@/services/sustainability.service";
import { createEmissionLog, uploadEvidence } from "@/services/emissionLog.service";
import { FormulaEngine } from "@/lib/formula-engine";
import { useToast } from "@/components/ui/Toast";

// ── Types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  template?: string;
  activity_name?: string;
  evidence?: string;
  inputs?: Record<string, string>;
}

interface Props {
  orgId: string;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddEmissionModal({ orgId, onClose, onSaved }: Props) {
  const { showToast } = useToast();

  // Form state
  const [activityName, setActivityName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data
  const [templates, setTemplates] = useState<CalculationTemplateWithRelations[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Animation
  const [visible, setVisible] = useState(false);

  // Refs
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // ── Slide-in animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Fetch calculation templates on mount ──────────────────────────────────
  useEffect(() => {
    setLoadingTemplates(true);
    getCalculationTemplates()
      .then((data) => setTemplates(data.filter((t) => t.default_ef !== null)))
      .catch((err) => {
        console.error(err);
        showToast("Failed to load formulas.", "error");
      })
      .finally(() => setLoadingTemplates(false));
  }, [showToast]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  // Inputs the user must fill = template's input_schema minus EF_TOTAL
  // (resolved server-side from the linked emission factor).
  const visibleFields: InputFieldSchema[] = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.input_schema.filter(
      (f) => f.field.toUpperCase() !== "EF_TOTAL",
    );
  }, [selectedTemplate]);

  // The first numeric field becomes the persisted `quantity` / `unit`
  // on the EmissionLog row (the schema requires both NOT NULL). All
  // other inputs are still fed to the formula for the co2e result.
  const primaryNumericField = useMemo(
    () => visibleFields.find((f) => f.type === "number") ?? null,
    [visibleFields],
  );

  // Live formula evaluation for the right-hand preview.
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
      const result = FormulaEngine.evaluate(selectedTemplate.formula_string, scope);
      if (!Number.isFinite(result) || result < 0) return null;
      return { kg: result, tonnes: result / 1000 };
    } catch {
      return null;
    }
  }, [selectedTemplate, visibleFields, inputValues]);

  // Impact-level styling for the live preview card.
  const impact: "neutral" | "low" | "medium" | "high" =
    evaluation == null
      ? "neutral"
      : evaluation.tonnes < 0.1
        ? "low"
        : evaluation.tonnes < 1
          ? "medium"
          : "high";

  const impactStyles = {
    neutral: { bg: "bg-[#F8F8F8]", border: "border-[#E2E8F0]", text: "text-[#AAAAAA]", label: "" },
    low: { bg: "bg-[#DAEDD5]", border: "border-[#79B669]", text: "text-[#155A03]", label: "Low — Within normal range" },
    medium: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-600", label: "Medium — Monitor this activity" },
    high: { bg: "bg-red-50", border: "border-red-300", text: "text-red-600", label: "High — Requires attention" },
  } as const;
  const style = impactStyles[impact];

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setTemplateId(id);
    setErrors((prev) => ({ ...prev, template: undefined, inputs: undefined }));
    // Pre-fill numeric fields with the schema's default_value (if any).
    const next: Record<string, string> = {};
    const t = templates.find((x) => x.id === id);
    if (t) {
      for (const f of t.input_schema) {
        if (f.field.toUpperCase() === "EF_TOTAL") continue;
        if (f.default_value !== undefined && f.default_value !== null) {
          next[f.field] = String(f.default_value);
        }
      }
    }
    setInputValues(next);
  }

  function handleInputChange(field: string, value: string) {
    setInputValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev.inputs) return prev;
      const { [field]: _drop, ...rest } = prev.inputs;
      return { ...prev, inputs: Object.keys(rest).length ? rest : undefined };
    });
  }

  function handleEvidencePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, evidence: "Evidence must be an image file." }));
      return;
    }
    setErrors((prev) => ({ ...prev, evidence: undefined }));
    setEvidenceFile(file);
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!activityName.trim()) errs.activity_name = "Activity name is required.";
    if (!selectedTemplate) errs.template = "Please select a formula.";
    if (!evidenceFile) errs.evidence = "Please attach an image as evidence.";

    if (selectedTemplate) {
      const fieldErrs: Record<string, string> = {};
      for (const f of visibleFields) {
        const raw = inputValues[f.field];
        const required = f.required !== false;
        if (raw === undefined || raw === "") {
          if (required) fieldErrs[f.field] = `${f.label} is required.`;
          continue;
        }
        if (f.type === "number") {
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            fieldErrs[f.field] = `${f.label} must be a number.`;
          } else if (f.min !== undefined && n < f.min) {
            fieldErrs[f.field] = `${f.label} must be ≥ ${f.min}.`;
          } else if (f.max !== undefined && n > f.max) {
            fieldErrs[f.field] = `${f.label} must be ≤ ${f.max}.`;
          }
        }
      }
      if (Object.keys(fieldErrs).length) errs.inputs = fieldErrs;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(keepOpen: boolean) {
    if (!validate() || !selectedTemplate || !evidenceFile) return;
    setIsSubmitting(true);

    // 1. Upload evidence image.
    const upload = await uploadEvidence(evidenceFile, orgId);
    if (upload.error || !upload.url) {
      showToast(`File upload failed: ${upload.error}`, "error");
      setIsSubmitting(false);
      return;
    }

    // 2. Evaluate the formula one more time at submit time.
    if (evaluation == null) {
      showToast("Could not evaluate the formula with the given inputs.", "error");
      setIsSubmitting(false);
      return;
    }

    // 3. Resolve the persisted quantity/unit pair from the primary input.
    //    Schema requires both NOT NULL with quantity > 0 — fall back to
    //    the formula result itself if the template has no numeric field.
    const quantity = primaryNumericField
      ? Number(inputValues[primaryNumericField.field])
      : Math.max(evaluation.kg, 0.0001);
    // `||` (not `??`) so an empty-string unit from a partially-seeded
    // input_schema falls back through to result_unit, then to a hard
    // default — EmissionLog.unit is NOT NULL.
    const unit =
      primaryNumericField?.unit || selectedTemplate.result_unit || "unit";

    // 4. Insert the log row. Date defaults to today (Date.now()).
    const { error } = await createEmissionLog({
      org_id: orgId,
      activity_name: activityName.trim(),
      scope: selectedTemplate.category.scope,
      source_type_id: selectedTemplate.category_id,
      reporting_date: new Date().toISOString().split("T")[0],
      quantity,
      unit,
      co2e_result: evaluation.tonnes,
      evidence_url: upload.url,
    });

    setIsSubmitting(false);

    if (error) {
      showToast(`Save failed: ${error}`, "error");
      return;
    }

    showToast("Emission entry saved successfully.", "success");
    onSaved();

    if (keepOpen) {
      resetForm();
    } else {
      handleClose();
    }
  }

  function resetForm() {
    setActivityName("");
    setTemplateId("");
    setInputValues({});
    setEvidenceFile(null);
    setErrors({});
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-4xl bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DAEDD5] flex-shrink-0">
          <div>
            <h2 className="text-[#155A03] text-xl font-semibold leading-7">
              Add Emission Entry
            </h2>
            <p className="text-[#AAAAAA] text-sm leading-5">
              Pick a calculation formula and fill in its inputs
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[#AAAAAA] hover:text-[#155A03] hover:bg-[#DAEDD5]/50 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: 22 }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ════ LEFT: Form ════ */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 border-r border-[#DAEDD5]">

            {/* 1 — Activity name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#155A03] text-sm font-semibold">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  setErrors((p) => ({ ...p, activity_name: undefined }));
                }}
                placeholder="e.g. Warehouse B — Electricity Usage"
                className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                  errors.activity_name
                    ? "border-red-400 bg-red-50 focus:border-red-400"
                    : "border-[#DAEDD5] focus:border-[#79B669]"
                }`}
              />
              {errors.activity_name && (
                <p className="text-red-500 text-xs">{errors.activity_name}</p>
              )}
            </div>

            {/* 2 — Choose formula */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#155A03] text-sm font-semibold">
                Formula <span className="text-red-500">*</span>
              </label>
              <select
                value={templateId}
                onChange={handleTemplateChange}
                disabled={loadingTemplates}
                className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                  errors.template
                    ? "border-red-400 bg-red-50"
                    : "border-[#DAEDD5] focus:border-[#79B669]"
                } disabled:bg-[#F5F5F5] disabled:text-[#AAAAAA] disabled:cursor-not-allowed`}
              >
                <option value="">
                  {loadingTemplates ? "Loading formulas…" : "Select a formula…"}
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.template && (
                <p className="text-red-500 text-xs">{errors.template}</p>
              )}
              {selectedTemplate && (
                <p className="text-[#AAAAAA] text-xs flex items-center gap-1.5">
                  <FunctionsIcon sx={{ fontSize: 13 }} />
                  <span className="font-mono">{selectedTemplate.formula_string}</span>
                </p>
              )}
            </div>

            {/* 3 — Dynamic inputs from the formula's input_schema */}
            {selectedTemplate && visibleFields.length > 0 && (
              <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#DAEDD5] bg-[#F7FBF5]">
                <p className="text-[#155A03] text-xs font-bold uppercase tracking-wide">
                  Formula Inputs
                </p>
                {visibleFields.map((f) => {
                  const err = errors.inputs?.[f.field];
                  const value = inputValues[f.field] ?? "";
                  // Skip the unit suffix when the label already ends
                  // in parens — most VN seeds embed the unit there
                  // (e.g. "Khoảng cách bay (km)").
                  const labelHasUnitSuffix = /\([^()]+\)\s*$/.test(f.label);
                  return (
                    <div key={f.field} className="flex flex-col gap-1">
                      <label className="text-[#155A03] text-sm font-medium">
                        {f.label}
                        {f.required !== false && (
                          <span className="text-red-500"> *</span>
                        )}
                        {f.unit && !labelHasUnitSuffix && (
                          <span className="text-[#AAAAAA] font-normal text-xs ml-1">
                            ({f.unit})
                          </span>
                        )}
                      </label>
                      {f.type === "select" ? (
                        <select
                          value={value}
                          onChange={(e) => handleInputChange(f.field, e.target.value)}
                          className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                            err
                              ? "border-red-400 bg-red-50"
                              : "border-[#DAEDD5] focus:border-[#79B669]"
                          }`}
                        >
                          <option value="">Select…</option>
                          {(f.options ?? []).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          min={f.min}
                          max={f.max}
                          value={value}
                          onChange={(e) => handleInputChange(f.field, e.target.value)}
                          placeholder="0"
                          className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                            err
                              ? "border-red-400 bg-red-50"
                              : "border-[#DAEDD5] focus:border-[#79B669]"
                          }`}
                        />
                      )}
                      {err && <p className="text-red-500 text-xs">{err}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4 — Evidence image */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#155A03] text-sm font-semibold">
                Evidence (image) <span className="text-red-500">*</span>
              </label>
              <input
                ref={evidenceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEvidencePick}
              />
              <button
                type="button"
                onClick={() => evidenceInputRef.current?.click()}
                className={`h-10 px-3 rounded-lg border text-sm text-left flex items-center gap-2 bg-white hover:bg-[#F7FBF5] cursor-pointer transition-colors ${
                  errors.evidence ? "border-red-400 bg-red-50" : "border-[#DAEDD5]"
                }`}
              >
                <AttachFileIcon sx={{ fontSize: 16, color: "#79B669" }} />
                <span className={evidenceFile ? "text-[#155A03]" : "text-[#AAAAAA]"}>
                  {evidenceFile ? evidenceFile.name : "Choose image…"}
                </span>
              </button>
              <p className="text-[#AAAAAA] text-[11px]">
                Accepted: JPG, PNG, WEBP · Max 10 MB
              </p>
              {errors.evidence && (
                <p className="text-red-500 text-xs">{errors.evidence}</p>
              )}
            </div>
          </div>

          {/* ════ RIGHT: Live Impact Preview ════ */}
          <div className="w-[300px] flex-shrink-0 overflow-y-auto px-5 py-5 flex flex-col gap-5 bg-[#FAFAFA]">
            <div>
              <h3 className="text-[#155A03] text-xs font-bold uppercase tracking-[0.5px] leading-[15px]">
                Live Impact Preview
              </h3>
              <p className="text-[#AAAAAA] text-xs mt-0.5">Estimated CO₂ equivalent</p>
            </div>

            {/* CO2e card */}
            <div
              className={`rounded-2xl border p-5 flex flex-col items-center gap-1.5 transition-all duration-300 ${style.bg} ${style.border}`}
            >
              <span className="text-[#AAAAAA] text-[10px] font-semibold uppercase tracking-wider">
                Total Estimated
              </span>
              <span
                className={`text-[42px] font-bold tabular-nums leading-none transition-colors duration-300 ${style.text}`}
              >
                {evaluation ? evaluation.tonnes.toFixed(4) : "—"}
              </span>
              <span className={`text-sm font-bold ${style.text}`}>tCO₂e</span>
              <span className={`text-[11px] ${style.text} opacity-70`}>
                {evaluation
                  ? `(${evaluation.kg.toFixed(2)} kg CO₂e)`
                  : "Pick a formula & fill its inputs"}
              </span>
            </div>

            {/* Impact level badge */}
            {impact !== "neutral" && (
              <div className={`rounded-xl px-4 py-3 border ${style.bg} ${style.border}`}>
                <p className="text-[10px] font-bold text-[#155A03] uppercase tracking-wide mb-1">
                  Impact Level
                </p>
                <p className={`text-sm font-semibold ${style.text}`}>{style.label}</p>
              </div>
            )}

            {/* Formula context */}
            {selectedTemplate && selectedTemplate.default_ef && (
              <div className="rounded-xl border border-[#DAEDD5] bg-white p-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-[#155A03] uppercase tracking-wide">
                  Emission Factor Used
                </p>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#AAAAAA]">Factor</span>
                    <span className="text-[#155A03] font-medium text-right">
                      {selectedTemplate.default_ef.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#AAAAAA]">CO₂e / unit</span>
                    <span className="text-[#155A03] font-semibold">
                      {Number(selectedTemplate.default_ef.co2e_total).toFixed(4)} kg
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#AAAAAA]">EF Unit</span>
                    <span className="text-[#155A03] font-medium">
                      {selectedTemplate.default_ef.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scope badge — derived from the formula's category */}
            {selectedTemplate && (
              <div className="rounded-xl border border-[#DAEDD5] bg-white px-4 py-3 flex items-center justify-between">
                <span className="text-[#AAAAAA] text-xs">Scope</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedTemplate.category.scope === "Scope 1"
                      ? "bg-[#DAEDD5] text-[#155A03]"
                      : selectedTemplate.category.scope === "Scope 2"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {selectedTemplate.category.scope}
                </span>
              </div>
            )}

            {/* Methodology note */}
            <p className="text-[#AAAAAA] text-[10px] leading-4">
              Calculation based on GHG Protocol methodology. Factors sourced from IPCC AR6,
              DEFRA, and MONRE VN databases.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-[#DAEDD5] flex items-center justify-end gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#155A03] text-sm font-medium hover:bg-[#DAEDD5]/50 bg-white cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-[#155A03] text-[#155A03] text-sm font-semibold hover:bg-[#DAEDD5]/50 bg-white cursor-pointer transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save & Log Another"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#1F8505] text-white text-sm font-bold hover:brightness-110 border-none cursor-pointer transition-all disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </>
  );
}
