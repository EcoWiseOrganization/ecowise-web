"use client";

import { useState, useEffect, useCallback } from "react";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import Co2Icon from "@mui/icons-material/Co2";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import VerifiedIcon from "@mui/icons-material/Verified";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { getEmissionLogs, getEmissionLogStats } from "@/services/emissionLog.service";
import type {
  EmissionLogWithCategory,
  EmissionLogStats,
  EmissionLogFilters,
  GhgScope,
  EmissionLogStatus,
} from "@/types/emission-log.types";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const SCOPE_OPTIONS: GhgScope[] = ["Scope 1", "Scope 2", "Scope 3"];
const STATUS_OPTIONS: EmissionLogStatus[] = ["Pending", "Review", "Verified"];

const STATUS_BADGE: Record<EmissionLogStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Review: "bg-red-100 text-red-700 border-red-200",
  Verified: "bg-[#DAEDD5] text-[#155A03] border-[#79B669]",
};

const SCOPE_BADGE: Record<GhgScope, string> = {
  "Scope 1": "bg-[#DAEDD5] text-[#155A03]",
  "Scope 2": "bg-blue-100 text-blue-700",
  "Scope 3": "bg-orange-100 text-orange-700",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  orgId: string;
  refreshKey?: number; // bump this to force a refresh after a new entry is saved
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityHistoryDashboard({ orgId, refreshKey = 0 }: Props) {
  // Data state
  const [logs, setLogs] = useState<EmissionLogWithCategory[]>([]);
  const [stats, setStats] = useState<EmissionLogStats>({
    totalEmissions: 0,
    pendingReviews: 0,
    verifiedActivities: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<GhgScope | "">("");
  const [statusFilter, setStatusFilter] = useState<EmissionLogStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    const s = await getEmissionLogStats(orgId);
    setStats(s);
  }, [orgId]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    const filters: EmissionLogFilters = {
      scope: scopeFilter || undefined,
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize: PAGE_SIZE,
    };
    const { data, count } = await getEmissionLogs(orgId, filters);
    setLogs(data);
    setTotalCount(count);
    setIsLoading(false);
  }, [orgId, scopeFilter, statusFilter, search, startDate, endDate, page]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [scopeFilter, statusFilter, search, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* ── Activity Summary Widgets ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Co2Icon sx={{ fontSize: 22, color: "#1F8505" }} />}
          label="Total Emissions (This Month)"
          value={`${stats.totalEmissions.toFixed(3)} tCO₂e`}
          bg="bg-[#DAEDD5]"
          textColor="text-[#155A03]"
        />
        <StatCard
          icon={<PendingActionsIcon sx={{ fontSize: 22, color: "#D97706" }} />}
          label="Pending Reviews"
          value={String(stats.pendingReviews)}
          bg="bg-yellow-50"
          textColor="text-yellow-700"
        />
        <StatCard
          icon={<VerifiedIcon sx={{ fontSize: 22, color: "#155A03" }} />}
          label="Verified Activities"
          value={String(stats.verifiedActivities)}
          bg="bg-[#DAEDD5]"
          textColor="text-[#155A03]"
        />
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white border border-[#DAEDD5] rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-[#DAEDD5] bg-[#FAFAFA] focus-within:border-[#79B669] transition-colors">
          <SearchIcon sx={{ fontSize: 16, color: "#AAAAAA" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity name…"
            className="flex-1 bg-transparent text-sm outline-none text-[#155A03] placeholder:text-[#AAAAAA]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterListIcon sx={{ fontSize: 16, color: "#AAAAAA" }} />

          {/* Scope filter */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as GhgScope | "")}
            className="h-9 px-3 rounded-lg border border-[#DAEDD5] bg-white text-sm text-[#155A03] outline-none focus:border-[#79B669] transition-colors cursor-pointer"
          >
            <option value="">All Scopes</option>
            {SCOPE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmissionLogStatus | "")}
            className="h-9 px-3 rounded-lg border border-[#DAEDD5] bg-white text-sm text-[#155A03] outline-none focus:border-[#79B669] transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[#DAEDD5] bg-white text-sm text-[#155A03] outline-none focus:border-[#79B669] transition-colors"
            />
            <span className="text-[#AAAAAA] text-xs">–</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[#DAEDD5] bg-white text-sm text-[#155A03] outline-none focus:border-[#79B669] transition-colors"
            />
          </div>

          {/* Clear filters */}
          {(scopeFilter || statusFilter || search || startDate || endDate) && (
            <button
              onClick={() => {
                setScopeFilter("");
                setStatusFilter("");
                setSearch("");
                setStartDate("");
                setEndDate("");
              }}
              className="h-9 px-3 rounded-lg border border-[#DAEDD5] bg-white text-xs text-[#AAAAAA] hover:text-red-500 hover:border-red-300 cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-white border border-[#DAEDD5] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7FBF5] border-b border-[#DAEDD5]">
                {[
                  "Activity Name",
                  "Category",
                  "Source Type",
                  "Period",
                  "Quantity",
                  "GHG Emissions",
                  "Status",
                  "Date Added",
                ].map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 text-[#155A03] text-xs font-bold uppercase tracking-[0.4px] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#79B669]">
                      <div className="w-5 h-5 border-2 border-[#79B669] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading entries…</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#AAAAAA] text-sm">
                    No emission records found. Use the &quot;Add Emission&quot; button to log your first activity.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#DAEDD5]/60 hover:bg-[#F7FBF5] transition-colors"
                  >
                    {/* Activity Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#155A03] font-medium max-w-[180px] truncate">
                          {log.activity_name}
                        </span>
                        {log.evidence_url && (
                          <a
                            href={log.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#79B669] hover:text-[#155A03]"
                            title="View evidence"
                          >
                            <OpenInNewIcon sx={{ fontSize: 13 }} />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Category (Scope) */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          SCOPE_BADGE[log.scope as GhgScope] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {log.scope}
                      </span>
                    </td>

                    {/* Source Type */}
                    <td className="px-4 py-3 text-[#3B3D3B] max-w-[140px] truncate">
                      {log.category?.name ?? "—"}
                    </td>

                    {/* Period */}
                    <td className="px-4 py-3 text-[#AAAAAA] whitespace-nowrap">
                      {formatDate(log.reporting_date)}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-[#3B3D3B] whitespace-nowrap">
                      {Number(log.quantity).toLocaleString()} {log.unit}
                    </td>

                    {/* GHG Emissions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.co2e_result != null ? (
                        <span className="text-[#155A03] font-semibold">
                          {Number(log.co2e_result).toFixed(4)}{" "}
                          <span className="font-normal text-[#AAAAAA]">tCO₂e</span>
                        </span>
                      ) : (
                        <span className="text-[#AAAAAA]">—</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          STATUS_BADGE[log.status as EmissionLogStatus] ??
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>

                    {/* Date Added */}
                    <td className="px-4 py-3 text-[#AAAAAA] whitespace-nowrap text-xs">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalCount > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-[#DAEDD5] flex items-center justify-between">
            <span className="text-xs text-[#AAAAAA]">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} entries
            </span>
            <div className="flex items-center gap-1">
              <PaginationBtn
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <KeyboardArrowLeftIcon sx={{ fontSize: 18 }} />
              </PaginationBtn>

              {getPaginationRange(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-[#AAAAAA] text-sm">
                    …
                  </span>
                ) : (
                  <PaginationBtn
                    key={p}
                    onClick={() => setPage(Number(p))}
                    active={page === Number(p)}
                  >
                    {p}
                  </PaginationBtn>
                )
              )}

              <PaginationBtn
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
  textColor: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-[#155A03] leading-4">{label}</span>
      </div>
      <span className={`text-2xl font-bold tabular-nums ${textColor}`}>{value}</span>
    </div>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-[#155A03] text-white border-[#155A03]"
          : "bg-white text-[#155A03] border-[#DAEDD5] hover:bg-[#DAEDD5]/50"
      }`}
    >
      {children}
    </button>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPaginationRange(
  current: number,
  total: number
): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}
