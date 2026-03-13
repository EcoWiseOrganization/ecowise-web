"use client";

import EditIcon from "@mui/icons-material/Edit";
import ArchiveIcon from "@mui/icons-material/Archive";
import type { EmissionFactorWithCategory } from "@/types/sustainability";

const SCOPE_BADGE: Record<string, string> = {
  "Scope 1": "bg-red-50 text-red-700 border-red-200",
  "Scope 2": "bg-amber-50 text-amber-700 border-amber-200",
  "Scope 3": "bg-blue-50 text-blue-700 border-blue-200",
};

const SOURCE_BADGE: Record<string, string> = {
  MONRE_VN:  "bg-[#f0f9ed] text-[#1F8505] border-[#DAEDD5]",
  IPCC:      "bg-purple-50 text-purple-700 border-purple-200",
  DEFRA:     "bg-sky-50 text-sky-700 border-sky-200",
  EPA:       "bg-orange-50 text-orange-700 border-orange-200",
  Climatiq:  "bg-teal-50 text-teal-700 border-teal-200",
  Custom:    "bg-gray-100 text-gray-600 border-gray-200",
};

interface EFTableProps {
  factors: EmissionFactorWithCategory[];
  onEdit: (ef: EmissionFactorWithCategory) => void;
  onDelete: (id: string, name: string) => void;
}

export function EFTable({ factors, onEdit, onDelete }: EFTableProps) {
  if (factors.length === 0) {
    return (
      <div className="p-16 bg-white rounded-3xl border border-[#B8D6B0] flex items-center justify-center">
        <p className="text-[#AAAAAA] text-sm">No emission factors found. Create one above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#B8D6B0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#DAEDD5] bg-[#f9fdf7]">
              <th className="text-left px-5 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Scope</th>
              <th className="text-left px-4 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Category</th>
              <th className="text-right px-4 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">CO₂e Total</th>
              <th className="text-left px-4 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Unit</th>
              <th className="text-left px-4 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Source</th>
              <th className="text-center px-4 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Year</th>
              <th className="text-right px-5 py-3 text-[#6E726E] font-semibold text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F4EE]">
            {factors.map((ef) => (
              <tr key={ef.id} className="hover:bg-[#fafffe] transition-colors">
                {/* Name + breakdown hint */}
                <td className="px-5 py-3.5">
                  <p className="text-[#141514] font-medium truncate max-w-[220px]">{ef.name}</p>
                  {ef.notes && (
                    <p className="text-[#AAAAAA] text-xs truncate max-w-[220px] mt-0.5">{ef.notes}</p>
                  )}
                </td>

                {/* Scope badge */}
                <td className="px-4 py-3.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SCOPE_BADGE[ef.category?.scope] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                    {ef.category?.scope ?? "—"}
                  </span>
                </td>

                {/* Category name */}
                <td className="px-4 py-3.5 text-[#3B3D3B]">
                  {ef.category?.name ?? "—"}
                </td>

                {/* co2e_total — most important value */}
                <td className="px-4 py-3.5 text-right">
                  <span className="text-[#1F8505] font-bold tabular-nums">
                    {ef.co2e_total.toFixed(4)}
                  </span>
                </td>

                {/* Unit */}
                <td className="px-4 py-3.5 text-[#3B3D3B] font-mono text-xs">
                  {ef.unit}
                </td>

                {/* Source badge */}
                <td className="px-4 py-3.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SOURCE_BADGE[ef.source_reference] ?? SOURCE_BADGE.Custom}`}>
                    {ef.source_reference}
                  </span>
                </td>

                {/* Year */}
                <td className="px-4 py-3.5 text-center text-[#AAAAAA] tabular-nums">
                  {ef.year_valid ?? "—"}
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(ef)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-[#79B669] hover:bg-[#f0f9ed] transition-colors cursor-pointer"
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </button>
                    <button
                      onClick={() => onDelete(ef.id, ef.name)}
                      title="Archive"
                      className="p-1.5 rounded-lg text-[#AAAAAA] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <ArchiveIcon sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
