"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import FunctionsIcon from "@mui/icons-material/Functions";
import { useTranslation } from "react-i18next";
import type {
  EmissionCategory,
  EmissionFactorWithCategory,
  CalculationTemplateWithRelations,
  CreateCalculationTemplateInput,
} from "@/types/sustainability";
import { FormulaBuilderForm } from "./FormulaBuilderForm";
import { ScopeFilterTabs } from "../../_components/ScopeFilterTabs";
import { createCalculationTemplateAction } from "@/app/actions/sustainability.actions";
import { useToast } from "@/components/ui/Toast";

const SCOPE_BADGE: Record<string, string> = {
  "Scope 1": "bg-red-50 text-red-700 border-red-200",
  "Scope 2": "bg-amber-50 text-amber-700 border-amber-200",
  "Scope 3": "bg-blue-50 text-blue-700 border-blue-200",
};

const METHOD_BADGE: Record<string, string> = {
  "Activity-based": "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]",
  "Spend-based":    "bg-purple-50 text-purple-700 border-purple-200",
  "Hybrid":         "bg-teal-50 text-teal-700 border-teal-200",
};

interface FormulaBuilderViewProps {
  categories: EmissionCategory[];
  factors: EmissionFactorWithCategory[];
  initialTemplates: CalculationTemplateWithRelations[];
}

export function FormulaBuilderView({ categories, factors, initialTemplates }: FormulaBuilderViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const scopeCounts = {
    all:       templates.length,
    "Scope 1": templates.filter((tmpl) => tmpl.category?.scope === "Scope 1").length,
    "Scope 2": templates.filter((tmpl) => tmpl.category?.scope === "Scope 2").length,
    "Scope 3": templates.filter((tmpl) => tmpl.category?.scope === "Scope 3").length,
  };

  const displayed = scopeFilter === "all"
    ? templates
    : templates.filter((tmpl) => tmpl.category?.scope === scopeFilter);

  // ── Create handler ───────────────────────────────────────────────────────
  const handleCreate = async (input: CreateCalculationTemplateInput) => {
    setLoading(true);
    const { data, error } = await createCalculationTemplateAction(input);
    setLoading(false);

    if (error || !data) {
      showToast(error ?? "Failed to save template", "error");
      return;
    }

    const cat = categories.find((c) => c.id === data.category_id);
    const ef  = factors.find((f) => f.id === data.default_ef_id);

    const newRow: CalculationTemplateWithRelations = {
      ...data,
      category:   cat ? { id: cat.id, name: cat.name, scope: cat.scope } : { id: data.category_id, name: "—", scope: "Scope 1" },
      default_ef: ef  ? { id: ef.id,  name: ef.name,  unit: ef.unit, co2e_total: ef.co2e_total } : null,
    };

    setTemplates((prev) => [newRow, ...prev]);
    showToast(`Template "${data.name}" saved ✓`, "success");
    setShowForm(false);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <ScopeFilterTabs
          value={scopeFilter}
          onChange={setScopeFilter}
          counts={scopeCounts}
        />

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all cursor-pointer"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          {t("admin.formula.newTemplate")}
        </button>
      </div>

      {/* Count label */}
      <p className="text-[#AAAAAA] text-sm -mt-3">
        {t("admin.formula.count", { count: displayed.length })}
      </p>

      {/* Template cards */}
      {displayed.length === 0 ? (
        <div className="py-20 border-2 border-dashed border-[#DAEDD5] rounded-2xl flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f0f9ed] flex items-center justify-center">
            <FunctionsIcon sx={{ fontSize: 28, color: "#79B669" }} />
          </div>
          <p className="text-[#3B3D3B] text-sm font-medium">
            {scopeFilter === "all" ? t("admin.formula.emptyTitle") : `No templates for ${scopeFilter}`}
          </p>
          <p className="text-[#AAAAAA] text-xs">{t("admin.formula.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayed.map((tmpl) => (
            <div key={tmpl.id} className="bg-white rounded-2xl border border-[#DAEDD5] px-5 py-4 hover:border-[#79B669] hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-[#141514] text-sm font-semibold">{tmpl.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SCOPE_BADGE[tmpl.category?.scope] ?? ""}`}>
                      {tmpl.category?.scope}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${METHOD_BADGE[tmpl.calculation_method] ?? ""}`}>
                      {tmpl.calculation_method}
                    </span>
                    {tmpl.category?.name && (
                      <span className="text-[10px] text-[#6E726E] bg-[#f5f5f5] border border-[#e0e0e0] px-2 py-0.5 rounded-full">
                        {tmpl.category.name}
                      </span>
                    )}
                  </div>

                  {tmpl.description && (
                    <p className="text-[#AAAAAA] text-xs mb-2">{tmpl.description}</p>
                  )}

                  {/* Formula display */}
                  <div className="flex items-center gap-2 mb-2">
                    <FunctionsIcon sx={{ fontSize: 14, color: "#79B669" }} />
                    <code className="text-xs text-[#1F8505] bg-[#f0f9ed] px-2 py-0.5 rounded">
                      {tmpl.formula_string}
                    </code>
                  </div>

                  {/* Input fields summary */}
                  {tmpl.input_schema.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tmpl.input_schema.map((f) => (
                        <span key={f.field} className="text-[10px] bg-[#f9fdf7] border border-[#DAEDD5] text-[#3B3D3B] px-2 py-0.5 rounded-full font-mono">
                          {f.field} {f.unit ? `(${f.unit})` : ""}
                        </span>
                      ))}
                      <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-mono">
                        EF_TOTAL
                      </span>
                    </div>
                  )}
                </div>

                {/* Default EF info */}
                {tmpl.default_ef && (
                  <div className="shrink-0 text-right">
                    <p className="text-[#AAAAAA] text-xs">{t("admin.formula.defaultEF")}</p>
                    <p className="text-[#141514] text-xs font-medium">{tmpl.default_ef.name}</p>
                    <p className="text-[#1F8505] text-sm font-bold tabular-nums">
                      {tmpl.default_ef.co2e_total} <span className="text-[#AAAAAA] text-xs font-normal">{tmpl.default_ef.unit}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto">
            <FormulaBuilderForm
              categories={categories}
              factors={factors}
              loading={loading}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
