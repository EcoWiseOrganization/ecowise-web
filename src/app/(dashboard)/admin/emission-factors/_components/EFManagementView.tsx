"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import type {
  EmissionCategory,
  EmissionFactorWithCategory,
  CreateEmissionFactorInput,
} from "@/types/sustainability";
import { EFTable } from "./EFTable";
import { EFModal } from "./EFModal";
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

    // Optimistic update: find the matching category to build the joined object
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

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Scope filter tabs */}
        <div className="flex gap-2">
          {["all", "Scope 1", "Scope 2", "Scope 3"].map((s) => (
            <button
              key={s}
              onClick={() => setScopeFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                scopeFilter === s
                  ? "bg-[#1F8505] text-white border-[#1F8505]"
                  : "bg-white text-[#3B3D3B] border-[#DAEDD5] hover:border-[#79B669]"
              }`}
            >
              {s === "all" ? "All Scopes" : s}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all cursor-pointer"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          New Emission Factor
        </button>
      </div>

      {/* Count */}
      <p className="text-[#AAAAAA] text-sm -mt-3">
        {displayed.length} emission factor{displayed.length !== 1 ? "s" : ""}
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
