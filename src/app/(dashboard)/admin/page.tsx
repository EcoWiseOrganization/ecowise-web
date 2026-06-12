import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BusinessIcon from "@mui/icons-material/Business";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import Co2Icon from "@mui/icons-material/Co2";
import PaidIcon from "@mui/icons-material/Paid";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

import { getUserStats } from "@/services/user.service";
import {
  getEmissionLogStatusCounts,
  getEmissionsByScope,
  getEmissionsBySector,
  getGrowthTrends,
  getPlatformMetrics,
  getSubscriptionMix,
} from "@/services/admin-metrics.service";

import { PageHeader } from "./_components/PageHeader";
import { KpiCard } from "./_components/KpiCard";
import { DashboardSection } from "./_components/DashboardSection";
import { GrowthAreaChart } from "./_components/GrowthAreaChart";
import { ScopeDonutChart } from "./_components/ScopeDonutChart";
import { SectorBarChart } from "./_components/SectorBarChart";
import { StatusBreakdown } from "./_components/StatusBreakdown";
import { SubscriptionMixCard } from "./_components/SubscriptionMixCard";
import { AdminAuthBanner } from "./_components/AdminAuthBanner";

export default async function AdminDashboardPage() {
  const [
    userStats,
    platform,
    growth,
    scopes,
    sectors,
    statusCounts,
    subMix,
  ] = await Promise.all([
    getUserStats(),
    getPlatformMetrics(),
    getGrowthTrends(12),
    getEmissionsByScope(),
    getEmissionsBySector(),
    getEmissionLogStatusCounts(),
    getSubscriptionMix(),
  ]);

  const attentionCount =
    platform.openIssuesCount + platform.pendingContactMessages;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.dashboard.title"
        subtitleKey="admin.dashboard.subtitle"
      />

      {/* Hero KPI row — platform-wide totals */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titleKey="admin.dashboard.stats.totalUsers"
          value={userStats.totalUsers.toLocaleString()}
          icon={PeopleIcon}
          hintKey="admin.dashboard.stats.totalUsersHint"
        />
        <KpiCard
          titleKey="admin.dashboard.stats.totalOrgs"
          value={platform.totalOrgs.toLocaleString()}
          icon={BusinessIcon}
          hintKey="admin.dashboard.stats.totalOrgsHint"
        />
        <KpiCard
          titleKey="admin.dashboard.stats.totalLogs"
          value={platform.totalEmissionLogs.toLocaleString()}
          icon={ReceiptLongIcon}
          hintKey="admin.dashboard.stats.totalLogsHint"
        />
        <KpiCard
          titleKey="admin.dashboard.stats.totalCo2e"
          value={formatKg(platform.totalCo2eKg)}
          icon={Co2Icon}
          hintKey="admin.dashboard.stats.totalCo2eHint"
        />
      </section>

      {/* Secondary KPI row — operational health */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titleKey="admin.dashboard.stats.activeUsers"
          value={userStats.activeCount.toLocaleString()}
          icon={CheckCircleIcon}
          hintKey="admin.dashboard.stats.activeUsersHint"
        />
        <KpiCard
          titleKey="admin.dashboard.stats.admins"
          value={userStats.adminCount.toLocaleString()}
          icon={AdminPanelSettingsIcon}
          hintKey="admin.dashboard.stats.adminsHint"
        />
        <KpiCard
          titleKey="admin.dashboard.stats.revenue"
          value={`$${platform.monthlyRevenueUsd.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`}
          icon={PaidIcon}
          hintKey="admin.dashboard.stats.revenueHint"
        />
        <KpiCard
          titleKey="admin.dashboard.stats.needsAttention"
          value={attentionCount.toLocaleString()}
          icon={PendingActionsIcon}
          variant={attentionCount > 0 ? "alert" : "default"}
          hintKey="admin.dashboard.stats.needsAttentionHint"
          hintValue={`${platform.openIssuesCount} · ${platform.pendingContactMessages}`}
        />
      </section>

      {/* Growth trend — full width */}
      <DashboardSection
        titleKey="admin.dashboard.growth.title"
        subtitleKey="admin.dashboard.growth.subtitle"
        href="/admin/system-overview"
        hrefLabelKey="admin.dashboard.viewDetail"
      >
        <GrowthAreaChart buckets={growth} />
      </DashboardSection>

      {/* Two-column on lg: scope donut + top sectors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSection
          titleKey="admin.dashboard.scope.title"
          subtitleKey="admin.dashboard.scope.subtitle"
        >
          <ScopeDonutChart scopes={scopes} />
        </DashboardSection>

        <DashboardSection
          titleKey="admin.dashboard.sectors.title"
          subtitleKey="admin.dashboard.sectors.subtitle"
        >
          <SectorBarChart sectors={sectors} />
        </DashboardSection>
      </div>

      {/* Workflow status + subscriptions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardSection
          titleKey="admin.dashboard.status.title"
          subtitleKey="admin.dashboard.status.subtitle"
          className="lg:col-span-2"
        >
          <StatusBreakdown counts={statusCounts} />
        </DashboardSection>

        <DashboardSection
          titleKey="admin.dashboard.subs.title"
          subtitleKey="admin.dashboard.subs.subtitle"
          href="/admin/subscriptions"
          hrefLabelKey="admin.dashboard.viewDetail"
        >
          <SubscriptionMixCard mix={subMix} />
        </DashboardSection>
      </div>

      <AdminAuthBanner />
    </div>
  );
}

/** Compact CO₂e formatter: tonnes once we cross the 1,000-kg mark. */
function formatKg(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })} tCO₂e`;
  }
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}
