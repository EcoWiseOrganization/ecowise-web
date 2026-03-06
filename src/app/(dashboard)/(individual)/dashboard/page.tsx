import { DashboardHeader } from "../../_components/DashboardHeader";
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
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <DashboardHeader />

      {/* Summary Stats Row */}
      <div className="flex gap-6">
        <TotalFootprintCard />
        <Scope1Card />
        <Scope2Card />
        <Scope3Card />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-[1fr_auto] gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6 min-w-0">
          <EmissionHotspots />
          <Scope3Composition />
          <RecentEntries />
        </div>

        {/* Right Column */}
        <div className="w-[482px] flex flex-col gap-6">
          <NetZeroCard />
          <IntensityMetrics />
          <ReportingCompliance />
        </div>
      </div>
    </div>
  );
}
