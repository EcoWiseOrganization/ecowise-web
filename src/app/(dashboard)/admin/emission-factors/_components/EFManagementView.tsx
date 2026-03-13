"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import type {
  EmissionCategory,
  EmissionFactorWithCategory,
  CreateEmissionFactorInput,
} from "@/types/sustainability";
import { EFTable } from "./EFTable";
import { EFModal } from "./EFModal";
import { ScopeFilterTabs } from "../../_components/ScopeFilterTabs";
import {
  createEmissionFactorAction,
  updateEmissionFactorAction,
  deleteEmissionFactorAction,
} from "@/app/actions/sustainability.actions";
import { useToast } from "@/components/ui/Toast";

interface EFManagementViewProps {
  initialFactors: EmissionFactorWithCategory[];
  categories: EmissionCategory[];
}

export function EFManagementView({ initialFactors, categories }: EFManagementViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [factors, setFactors] = useState(initialFactors);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmissionFactorWithCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>("all");

  // ── Filter ──────────────────────────────────────────────────────────────
  const displayed = scopeFilter === "all"
    ? factors
    : factors.filter((f) => f.category?.scope === scopeFilter);

  // ── CRUD handlers ────────────────────────────────────────────────────────

  const handleCreate = async (input: CreateEmissionFactorInput) => {
    setLoading(true);
    const { data, error } = await createEmissionFactorAction(input);
    setLoading(false);

    if (error || !data) {
      showToast(error ?? "Failed to create emission factor", "error");
      return;
    }

    const category = categories.find((c) => c.id === data.category_id);
    const newRow: EmissionFactorWithCategory = {
      ...data,
      category: category
        ? { id: category.id, name: category.name, scope: category.scope }
        : { id: data.category_id, name: "—", scope: "Scope 1" },
    };

    setFactors((prev) => [newRow, ...prev]);
    showToast(`Emission Factor "${data.name}" created ✓`, "success");
    setModalOpen(false);
  };

  const handleEdit = async (input: CreateEmissionFactorInput) => {
    if (!editTarget) return;
    setLoading(true);
    const { data, error } = await updateEmissionFactorAction(editTarget.id, input);
    setLoading(false);

    if (error || !data) {
      showToast(error ?? "Failed to update emission factor", "error");
      return;
    }

    setFactors((prev) =>
      prev.map((f) =>
        f.id === data.id
          ? { ...f, ...data }
          : f,
      ),
    );
    showToast(`"${data.name}" updated ✓`, "success");
    setEditTarget(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Archive emission factor "${name}"? This is a soft delete.`)) return;

    const { error } = await deleteEmissionFactorAction(id);
    if (error) {
      showToast(error, "error");
      return;
    }

    setFactors((prev) => prev.filter((f) => f.id !== id));
    showToast(`"${name}" archived`, "success");
  };

  const scopeCounts = {
    all:       factors.length,
    "Scope 1": factors.filter((f) => f.category?.scope === "Scope 1").length,
    "Scope 2": factors.filter((f) => f.category?.scope === "Scope 2").length,
    "Scope 3": factors.filter((f) => f.category?.scope === "Scope 3").length,
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
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all cursor-pointer"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          {t("admin.ef.newFactor")}
        </button>
      </div>

      {/* Count */}
      <p className="text-[#AAAAAA] text-sm -mt-3">
        {t("admin.ef.count", { count: displayed.length })}
      </p>

      {/* Data grid */}
      <EFTable
        factors={displayed}
        onEdit={(ef) => { setEditTarget(ef); setModalOpen(true); }}
        onDelete={handleDelete}
      />

      {/* Create / Edit modal */}
      {modalOpen && (
        <EFModal
          categories={categories}
          editTarget={editTarget}
          loading={loading}
          onSubmit={editTarget ? handleEdit : handleCreate}
          onCancel={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </>
  );
}
