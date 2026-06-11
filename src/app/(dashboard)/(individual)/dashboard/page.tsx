"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "../../_context/WorkspaceContext";
import { DashboardHeader } from "../../_components/DashboardHeader";
import { AddEmissionModal } from "../../_components/AddEmissionModal";
import { ActivityHistoryDashboard } from "../../_components/ActivityHistoryDashboard";
import { TotalFootprintCard } from "../../_components/cards/TotalFootprintCard";
import { Scope1Card } from "../../_components/cards/Scope1Card";
import { Scope2Card } from "../../_components/cards/Scope2Card";
import { Scope3Card } from "../../_components/cards/Scope3Card";
import { EmissionHotspots } from "../../_components/EmissionHotspots";
import { NetZeroCard } from "../../_components/NetZeroCard";
import { RecentEntries } from "../../_components/RecentEntries";
import { useDashboardData } from "../../_hooks/useDashboardData";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { selectedOrg } = useWorkspace();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Bumped every time an entry is saved to trigger ActivityHistoryDashboard
  // refresh *and* the personal-dashboard data fetch.
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  const dash = useDashboardData(refreshKey);

  // ── Personal dashboard derived values (kg → display) ──────────────────
  const total = dash.stats?.total ?? 0;
  const scope1Kg = dash.stats?.byScope["Scope 1"] ?? 0;
  const scope2Kg = dash.stats?.byScope["Scope 2"] ?? 0;
  const scope3Kg = dash.stats?.byScope["Scope 3"] ?? 0;
  const logCount = dash.stats?.logCount ?? 0;
  const buckets = dash.stats?.byCategory ?? [];
  // Largest Scope 3 contributor is the category whose name comes from a
  // Scope-3-mapped EmissionCategory. We don't have the scope per category
  // in `byCategory`, so the dashboard summary already aggregates all
  // categories — pick the largest one as the Scope 3 hotspot label.
  const topScope3 =
    [...buckets].sort((a, b) => b.co2eKg - a.co2eKg)[0]?.name ?? null;

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Header */}
      <DashboardHeader
        onAddEmission={() => setIsModalOpen(true)}
        year={dash.period.year}
        rangeStart={dash.period.start}
        rangeEnd={dash.period.end}
        onRangeChange={dash.setRange}
      />

      {/* Org info banner */}
      {selectedOrg && (
        <div className="bg-[#DAEDD5] rounded-xl px-5 py-4 flex flex-col gap-1">
          <h2 className="text-[#155A03] text-base font-semibold leading-6">
            {selectedOrg.legal_name}
          </h2>
          <div className="flex flex-wrap gap-3 text-xs text-[#4a7c3f]">
            {selectedOrg.org_type && <span>{selectedOrg.org_type}</span>}
            {selectedOrg.address && <span>· {selectedOrg.address}</span>}
            {selectedOrg.contact_email && <span>· {selectedOrg.contact_email}</span>}
          </div>
        </div>
      )}

      {/* Activity History (visible only when an org is selected) */}
      {selectedOrg ? (
        <ActivityHistoryDashboard orgId={selectedOrg.id} refreshKey={refreshKey} />
      ) : (
        <>
          {/* Loading state shows a subtle skeleton so the cards don't
              jump in size when stats settle. */}
          {dash.loading && !dash.stats ? (
            <div className="py-10 text-center text-sm text-[#AAAAAA]">
              {t("dashboard.loading")}
            </div>
          ) : null}

          {dash.error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {t(`error.${dash.error}`, { defaultValue: dash.error })}
            </div>
          ) : null}

          {/* KPI row (real personal stats) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
            <TotalFootprintCard
              totalKg={total}
              logCount={logCount}
              year={dash.period.year}
            />
            <Scope1Card scope1Kg={scope1Kg} totalKg={total} />
            <Scope2Card scope2Kg={scope2Kg} totalKg={total} />
            <Scope3Card
              scope3Kg={scope3Kg}
              totalKg={total}
              topCategory={topScope3}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_482px] gap-6">
            <div className="flex flex-col gap-6 min-w-0">
              <EmissionHotspots buckets={buckets} />
              <RecentEntries logs={dash.recentLogs} />
            </div>
            <div className="w-full flex flex-col gap-6 min-w-0">
              <NetZeroCard target={dash.target} />
            </div>
          </div>
        </>
      )}

      {/* Add Emission slide-over modal */}
      {isModalOpen && selectedOrg && (
        <AddEmissionModal
          orgId={selectedOrg.id}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Prompt to select org if user clicks Add Emission without an org selected */}
      {isModalOpen && !selectedOrg && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <p className="text-[#155A03] text-base font-semibold mb-2">
              {t("dashboard.selectOrgTitle")}
            </p>
            <p className="text-[#AAAAAA] text-sm mb-5">
              {t("dashboard.selectOrgBody")}
            </p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 bg-[#1F8505] text-white text-sm font-bold rounded-xl border-none cursor-pointer hover:brightness-110 transition-all"
            >
              {t("common.gotIt")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
