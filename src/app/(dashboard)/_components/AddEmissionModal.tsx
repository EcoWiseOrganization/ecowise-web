"use client";

import { useState, useEffect, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import type { EmissionCategory } from "@/types/sustainability";
import type { EmissionFactorWithCategory } from "@/types/sustainability";
import type { GhgScope } from "@/types/emission-log.types";
import { getEmissionCategories, getEmissionFactors } from "@/services/sustainability.service";
import { createEmissionLog, uploadEvidence } from "@/services/emissionLog.service";
import { useOcrDataExtraction } from "@/hooks/useOcrDataExtraction";
import { useToast } from "@/components/ui/Toast";

// ── Constants ───────────────────────────────────────────────────────────────

const SCOPES: GhgScope[] = ["Scope 1", "Scope 2", "Scope 3"];

const UNITS = [
  "kWh", "MWh", "L", "m³", "kg", "tonne",
  "km", "pkm", "t·km", "MJ", "GJ", "piece", "USD",
];

// ── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  activity_name: string;
  scope: GhgScope | "";
  source_type_id: string;
  reporting_date: string;
  quantity: string;
  unit: string;
  evidence_file: File | null;
}

interface FormErrors {
  activity_name?: string;
  scope?: string;
  source_type_id?: string;
  reporting_date?: string;
  quantity?: string;
  unit?: string;
}

const EMPTY_FORM: FormValues = {
  activity_name: "",
  scope: "",
  source_type_id: "",
  reporting_date: new Date().toISOString().split("T")[0],
  quantity: "",
  unit: "",
  evidence_file: null,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orgId: string;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddEmissionModal({ orgId, onClose, onSaved }: Props) {
  const { showToast } = useToast();

  // Form state
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data
  const [categories, setCategories] = useState<EmissionCategory[]>([]);
  const [factors, setFactors] = useState<EmissionFactorWithCategory[]>([]);

  // Animation
  const [visible, setVisible] = useState(false);

  // Refs
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // OCR hook
  const { isExtracting, previewUrl, extractFromImage } = useOcrDataExtraction();

  // ── Slide-in animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Fetch categories ───────────────────────────────────────────────────────
  useEffect(() => {
    getEmissionCategories().then(setCategories).catch(console.error);
  }, []);

  // ── Fetch emission factors when source_type changes ────────────────────────
  useEffect(() => {
    if (!values.source_type_id) {
      setFactors([]);
      return;
    }
    getEmissionFactors(values.source_type_id).then(setFactors).catch(console.error);
  }, [values.source_type_id]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const filteredCategories = values.scope
    ? categories.filter((c) => c.scope === values.scope)
    : categories;

  const qty = parseFloat(values.quantity);
  const efValue = factors[0]?.co2e_total ?? 0;
  const co2eKg = !isNaN(qty) && qty > 0 && factors.length > 0 ? qty * Number(efValue) : null;
  const co2eTonne = co2eKg != null ? co2eKg / 1000 : null;

  // Color coding
  const impact =
    co2eTonne == null
      ? "neutral"
      : co2eTonne < 0.1
        ? "low"
        : co2eTonne < 1
          ? "medium"
          : "high";

  const impactStyles = {
    neutral: { bg: "bg-[#F8F8F8]", border: "border-[#E2E8F0]", text: "text-[#AAAAAA]", label: "" },
    low: { bg: "bg-[#DAEDD5]", border: "border-[#79B669]", text: "text-[#155A03]", label: "Low — Within normal range" },
    medium: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-600", label: "Medium — Monitor this activity" },
    high: { bg: "bg-red-50", border: "border-red-300", text: "text-red-600", label: "High — Requires attention" },
  };
  const style = impactStyles[impact];

  // ── Handlers ───────────────────────────────────────────────────────────────

  function set(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (field === "scope") {
        setValues((prev) => ({
          ...prev,
          scope: value as GhgScope | "",
          source_type_id: "",
        }));
      } else {
        setValues((prev) => ({ ...prev, [field]: value }));
      }
    };
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!values.activity_name.trim()) errs.activity_name = "Activity name is required.";
    if (!values.scope) errs.scope = "Please select a scope.";
    if (!values.source_type_id) errs.source_type_id = "Please select a source type.";
    if (!values.reporting_date) errs.reporting_date = "Reporting date is required.";
    if (!values.quantity) {
      errs.quantity = "Quantity is required.";
    } else if (isNaN(parseFloat(values.quantity)) || parseFloat(values.quantity) <= 0) {
      errs.quantity = "Quantity must be greater than 0.";
    }
    if (!values.unit) errs.unit = "Unit is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(keepOpen = false) {
    if (!validate()) return;
    setIsSubmitting(true);

    let evidence_url: string | undefined;
    if (values.evidence_file) {
      const { url, error } = await uploadEvidence(values.evidence_file, orgId);
      if (error) {
        showToast(`File upload failed: ${error}`, "error");
        setIsSubmitting(false);
        return;
      }
      evidence_url = url ?? undefined;
    }

    const { error } = await createEmissionLog({
      org_id: orgId,
      activity_name: values.activity_name.trim(),
      scope: values.scope as GhgScope,
      source_type_id: values.source_type_id || undefined,
      reporting_date: values.reporting_date,
      quantity: parseFloat(values.quantity),
      unit: values.unit,
      co2e_result: co2eTonne != null ? co2eTonne : undefined,
      evidence_url,
    });

    setIsSubmitting(false);

    if (error) {
      showToast(`Save failed: ${error}`, "error");
      return;
    }

    showToast("Emission entry saved successfully.", "success");
    onSaved();

    if (keepOpen) {
      setValues(EMPTY_FORM);
      setErrors({});
    } else {
      handleClose();
    }
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await extractFromImage(file);
    setValues((prev) => ({
      ...prev,
      ...(result.activity_name && !prev.activity_name ? { activity_name: result.activity_name } : {}),
      ...(result.quantity ? { quantity: String(result.quantity) } : {}),
      ...(result.unit ? { unit: result.unit } : {}),
    }));
    showToast("OCR complete — form fields auto-filled.", "success");
    // Reset the input so the same file can be re-selected
    if (ocrInputRef.current) ocrInputRef.current.value = "";
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
              Log a new activity emission record for this organization
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

            {/* OCR Upload Zone */}
            <div className="rounded-xl border-2 border-dashed border-[#79B669] bg-[#F7FBF5] p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AutoAwesomeIcon sx={{ fontSize: 18, color: "#1F8505" }} />
                <span className="text-[#155A03] text-sm font-semibold">
                  Auto-fill from Invoice / Receipt
                </span>
              </div>
              <p className="text-[#AAAAAA] text-xs leading-4 mb-3">
                Upload a photo of your electricity bill, fuel receipt, or invoice.
                Our OCR will automatically extract quantity and unit values.
              </p>
              <input
                ref={ocrInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleOcrUpload}
              />
              {previewUrl && !isExtracting && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-[#155A03] font-medium">
                  <CheckCircleIcon sx={{ fontSize: 14, color: "#1F8505" }} />
                  Document processed — fields have been auto-filled
                </div>
              )}
              {isExtracting ? (
                <div className="flex items-center gap-2 text-[#79B669] text-sm">
                  <div className="w-4 h-4 border-2 border-[#79B669] border-t-transparent rounded-full animate-spin" />
                  Analyzing document…
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => ocrInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#155A03] text-white text-xs font-semibold rounded-lg border-none cursor-pointer hover:bg-[#1F8505] transition-colors"
                >
                  <CloudUploadIcon sx={{ fontSize: 15, color: "white" }} />
                  Upload Document
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#DAEDD5]" />
              <span className="text-[#AAAAAA] text-xs px-1">or enter manually</span>
              <div className="flex-1 h-px bg-[#DAEDD5]" />
            </div>

            {/* Activity Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#155A03] text-sm font-semibold">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.activity_name}
                onChange={set("activity_name")}
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

            {/* Scope + Source Type */}
            <div className="grid grid-cols-2 gap-3">
              {/* Scope */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#155A03] text-sm font-semibold">
                  Category (Scope) <span className="text-red-500">*</span>
                </label>
                <select
                  value={values.scope}
                  onChange={set("scope")}
                  className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                    errors.scope
                      ? "border-red-400 bg-red-50"
                      : "border-[#DAEDD5] focus:border-[#79B669]"
                  }`}
                >
                  <option value="">Select scope…</option>
                  {SCOPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.scope && (
                  <p className="text-red-500 text-xs">{errors.scope}</p>
                )}
              </div>

              {/* Source Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#155A03] text-sm font-semibold">
                  Source Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={values.source_type_id}
                  onChange={set("source_type_id")}
                  disabled={!values.scope}
                  className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                    errors.source_type_id
                      ? "border-red-400 bg-red-50"
                      : "border-[#DAEDD5] focus:border-[#79B669]"
                  } disabled:bg-[#F5F5F5] disabled:text-[#AAAAAA] disabled:cursor-not-allowed`}
                >
                  <option value="">
                    {values.scope ? "Select source type…" : "Select scope first"}
                  </option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.source_type_id && (
                  <p className="text-red-500 text-xs">{errors.source_type_id}</p>
                )}
              </div>
            </div>

            {/* Reporting Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#155A03] text-sm font-semibold">
                Reporting Period <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={values.reporting_date}
                onChange={set("reporting_date")}
                max={new Date().toISOString().split("T")[0]}
                className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                  errors.reporting_date
                    ? "border-red-400 bg-red-50"
                    : "border-[#DAEDD5] focus:border-[#79B669]"
                }`}
              />
              {errors.reporting_date && (
                <p className="text-red-500 text-xs">{errors.reporting_date}</p>
              )}
            </div>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[#155A03] text-sm font-semibold">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={values.quantity}
                  onChange={set("quantity")}
                  placeholder="0.00"
                  className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                    errors.quantity
                      ? "border-red-400 bg-red-50"
                      : "border-[#DAEDD5] focus:border-[#79B669]"
                  }`}
                />
                {errors.quantity && (
                  <p className="text-red-500 text-xs">{errors.quantity}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#155A03] text-sm font-semibold">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={values.unit}
                  onChange={set("unit")}
                  className={`h-10 px-3 rounded-lg border text-sm bg-white outline-none transition-colors ${
                    errors.unit
                      ? "border-red-400 bg-red-50"
                      : "border-[#DAEDD5] focus:border-[#79B669]"
                  }`}
                >
                  <option value="">Unit…</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {errors.unit && (
                  <p className="text-red-500 text-xs">{errors.unit}</p>
                )}
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#155A03] text-sm font-semibold">
                Evidence Reference{" "}
                <span className="text-[#AAAAAA] font-normal text-xs">(optional)</span>
              </label>
              <input
                ref={evidenceInputRef}
                type="file"
                accept="image/*,application/pdf,.xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setValues((prev) => ({ ...prev, evidence_file: file }));
                }}
              />
              <button
                type="button"
                onClick={() => evidenceInputRef.current?.click()}
                className="h-10 px-3 rounded-lg border border-[#DAEDD5] text-sm text-left flex items-center gap-2 bg-white hover:bg-[#F7FBF5] cursor-pointer transition-colors"
              >
                <AttachFileIcon sx={{ fontSize: 16, color: "#79B669" }} />
                <span className={values.evidence_file ? "text-[#155A03]" : "text-[#AAAAAA]"}>
                  {values.evidence_file ? values.evidence_file.name : "Choose file…"}
                </span>
              </button>
              <p className="text-[#AAAAAA] text-[11px]">
                Accepted: PDF, JPG, PNG, XLSX, CSV · Max 10 MB
              </p>
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
                {co2eTonne != null ? co2eTonne.toFixed(4) : "—"}
              </span>
              <span className={`text-sm font-bold ${style.text}`}>tCO₂e</span>
              <span className={`text-[11px] ${style.text} opacity-70`}>
                {co2eKg != null
                  ? `(${co2eKg.toFixed(2)} kg CO₂e)`
                  : "Enter quantity & source type"}
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

            {/* Emission factor info */}
            {factors.length > 0 && (
              <div className="rounded-xl border border-[#DAEDD5] bg-white p-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-[#155A03] uppercase tracking-wide">
                  Emission Factor Used
                </p>
                {(() => {
                  const f = factors[0];
                  return (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#AAAAAA]">Factor</span>
                        <span className="text-[#155A03] font-medium text-right">{f.name}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#AAAAAA]">CO₂e / unit</span>
                        <span className="text-[#155A03] font-semibold">
                          {Number(f.co2e_total).toFixed(4)} kg
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#AAAAAA]">Unit</span>
                        <span className="text-[#155A03] font-medium">{f.unit}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#AAAAAA]">Source</span>
                        <span className="text-[#155A03] font-medium">{f.source_reference}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Scope badge */}
            {values.scope && (
              <div className="rounded-xl border border-[#DAEDD5] bg-white px-4 py-3 flex items-center justify-between">
                <span className="text-[#AAAAAA] text-xs">Scope</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    values.scope === "Scope 1"
                      ? "bg-[#DAEDD5] text-[#155A03]"
                      : values.scope === "Scope 2"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {values.scope}
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
