"use client";

import { useState } from "react";
import { useWorkspace } from "../../_context/WorkspaceContext";
import { DashboardHeader } from "../../_components/DashboardHeader";
import { AddEmissionModal } from "../../_components/AddEmissionModal";
import { ActivityHistoryDashboard } from "../../_components/ActivityHistoryDashboard";
import { TotalFootprintCard } from "../../_components/cards/TotalFootprintCard";
import { Scope1Card } from "../../_components/cards/Scope1Card";
import { Scope2Card } from "../../_components/cards/Scope2Card";
import { Scope3Card } from "../../_components/cards/Scope3Card";
import { EmissionHotspots } from "../../_components/EmissionHotspots";
import { Scope3Composition } from "../../_components/Scope3Composition";
import { NetZeroCard } from "../../_components/NetZeroCard";
import { IntensityMetrics } from "../../_components/IntensityMetrics";
import { ReportingCompliance } from "../../_components/ReportingCompliance";
import { RecentEntries } from "../../_components/RecentEntries";

export default function DashboardPage() {
  const { selectedOrg } = useWorkspace();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Bumped every time an entry is saved to trigger ActivityHistoryDashboard refresh
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Header */}
      <DashboardHeader onAddEmission={() => setIsModalOpen(true)} />

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
          {/* Individual / mock dashboard */}
          <div className="flex gap-6">
            <TotalFootprintCard />
            <Scope1Card />
            <Scope2Card />
            <Scope3Card />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-6">
            <div className="flex flex-col gap-6 min-w-0">
              <EmissionHotspots />
              <Scope3Composition />
              <RecentEntries />
            </div>
            <div className="w-[482px] flex flex-col gap-6">
              <NetZeroCard />
              <IntensityMetrics />
              <ReportingCompliance />
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
              Select an Organization
            </p>
            <p className="text-[#AAAAAA] text-sm mb-5">
              Please select an organization from the workspace selector in the sidebar before
              logging an emission.
            </p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 bg-[#1F8505] text-white text-sm font-bold rounded-xl border-none cursor-pointer hover:brightness-110 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
