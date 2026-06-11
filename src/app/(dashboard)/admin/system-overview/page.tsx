import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import {
  getEmissionsBySector,
  getGrowthTrends,
  getPlatformMetrics,
} from "@/services/admin-metrics.service";
import { searchAuditLogs } from "@/services/audit.service";
import { PageHeader } from "../_components/PageHeader";
import { T } from "@/components/shared/TranslatedText";

export default async function SystemOverviewPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }

  const [metrics, growth, sectors, recentAuditRes] = await Promise.all([
    getPlatformMetrics(),
    getGrowthTrends(12),
    getEmissionsBySector(),
    searchAuditLogs({ pageSize: 10 }),
  ]);
  const recentAudits = recentAuditRes.data;

  const fmtKg = (kg: number) =>
    kg >= 1000
      ? `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e`
      : `${kg.toFixed(1)} kg`;

  const maxBucket = Math.max(
    1,
    ...growth.map((g) => g.newUsers + g.newOrganizations + g.newEmissionLogs)
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.systemOverview.title"
        subtitleKey="admin.systemOverview.subtitle"
      />

      {/* Metric tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile labelKey="admin.systemOverview.tile.organizations" value={metrics.totalOrgs.toLocaleString()} />
        <Tile labelKey="admin.systemOverview.tile.activeUsers" value={metrics.activeUsers.toLocaleString()} />
        <Tile
          labelKey="admin.systemOverview.tile.activityLogs"
          value={metrics.totalEmissionLogs.toLocaleString()}
        />
        <Tile labelKey="admin.systemOverview.tile.co2eTracked" value={fmtKg(metrics.totalCo2eKg)} />
        <Tile
          labelKey="admin.systemOverview.tile.revenue"
          value={`$${metrics.monthlyRevenueUsd.toFixed(2)}`}
        />
        <Tile
          labelKey="admin.systemOverview.tile.openReviews"
          value={metrics.openIssuesCount.toLocaleString()}
          accent={metrics.openIssuesCount > 0 ? "alert" : undefined}
        />
        <Tile
          labelKey="admin.systemOverview.tile.pendingContact"
          value={metrics.pendingContactMessages.toLocaleString()}
          accent={metrics.pendingContactMessages > 0 ? "alert" : undefined}
        />
        <Tile labelKey="admin.systemOverview.tile.monthsInTrend" value={String(growth.length)} />
      </section>

      {/* Growth trend (12 months) */}
      <section className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[#155A03] text-lg font-semibold">
            <T k="admin.systemOverview.growthTitle" />
          </h2>
          <span className="text-xs text-[#AAAAAA]">
            <T k="admin.systemOverview.growthLegend" />
          </span>
        </div>
        <div className="grid grid-cols-12 gap-2">
          {growth.map((b) => {
            const total = b.newUsers + b.newOrganizations + b.newEmissionLogs;
            const h = Math.max(2, Math.round((total / maxBucket) * 100));
            return (
              <div key={b.month} className="flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#1F8505]/15 rounded-t"
                  style={{ height: `${h}px`, minHeight: 2 }}
                  title={`${b.month}: ${total}`}
                />
                <span className="text-[10px] text-[#AAAAAA]">
                  {b.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Emissions by sector */}
      <section className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <h2 className="text-[#155A03] text-lg font-semibold mb-3">
          <T k="admin.systemOverview.sectorsTitle" />
        </h2>
        {sectors.length === 0 ? (
          <p className="text-sm text-[#AAAAAA]">
            <T k="admin.systemOverview.sectorsEmpty" />
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[#6E726E] text-xs uppercase">
              <tr className="border-b border-gray-100">
                <th className="px-2 py-2"><T k="admin.systemOverview.sectorsCol.industry" /></th>
                <th className="px-2 py-2"><T k="admin.systemOverview.sectorsCol.organizations" /></th>
                <th className="px-2 py-2"><T k="admin.systemOverview.sectorsCol.totalCo2e" /></th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.industry} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-2 font-medium">{s.industry}</td>
                  <td className="px-2 py-2">{s.org_count}</td>
                  <td className="px-2 py-2 font-semibold text-[#155A03]">
                    {fmtKg(s.total_co2e_kg)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent audit log */}
      <section className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#155A03] text-lg font-semibold">
            <T k="admin.systemOverview.auditTitle" />
          </h2>
          <Link
            href="/admin/audit-logs"
            className="text-sm text-[#1F8505] hover:underline"
          >
            <T k="admin.systemOverview.viewAllAudit" />
          </Link>
        </div>
        {recentAudits.length === 0 ? (
          <p className="text-sm text-[#AAAAAA]">
            <T k="admin.systemOverview.auditEmpty" />
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recentAudits.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between border-b border-gray-50 last:border-0 py-1.5"
              >
                <div>
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="text-[#AAAAAA] text-xs ml-2">
                    {a.resource_type}
                  </span>
                </div>
                <span className="text-xs text-[#AAAAAA]">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({
  labelKey,
  value,
  accent,
}: {
  labelKey: string;
  value: string;
  accent?: "alert";
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 border ${
        accent === "alert" ? "border-orange-300" : "border-[#DAEDD5]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-[#6E726E]">
        <T k={labelKey} />
      </div>
      <div className="text-xl font-bold text-[#155A03] mt-1">{value}</div>
    </div>
  );
}
