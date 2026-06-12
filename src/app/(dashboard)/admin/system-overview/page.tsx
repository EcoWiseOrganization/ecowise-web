import Link from "next/link";
import { redirect } from "next/navigation";

import FactCheckIcon from "@mui/icons-material/FactCheck";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import GroupIcon from "@mui/icons-material/Group";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { getAuditOverview, searchAuditLogs } from "@/services/audit.service";
import { formatInt } from "@/lib/format-number";

import { PageHeader } from "../_components/PageHeader";
import { KpiCard } from "../_components/KpiCard";
import { DashboardSection } from "../_components/DashboardSection";
import { AuditDailyChart } from "../_components/AuditDailyChart";
import { TopActionsList } from "../_components/TopActionsList";
import { ActorRoleSplit } from "../_components/ActorRoleSplit";
import { T } from "@/components/shared/TranslatedText";

/**
 * Audit & governance view.
 *
 * Scope is intentionally narrow: anything that already lives on /admin
 * (totals, growth, sectors, scope, status) is **not** repeated here. This
 * page answers "who did what on the platform, and when — and is anything
 * going wrong?". Platform-wide KPIs belong on the dashboard.
 */
export default async function SystemOverviewPage() {
  try {
    await requireSystemAdmin();
  } catch (err) {
    if (err instanceof AuthError) redirect("/dashboard");
    throw err;
  }

  const WINDOW_DAYS = 30;
  const [overview, recentAuditRes] = await Promise.all([
    getAuditOverview(WINDOW_DAYS),
    searchAuditLogs({ pageSize: 12 }),
  ]);
  const recentAudits = recentAuditRes.data;

  const failureRateLabel = `${overview.failureRate.toFixed(2)}%`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titleKey="admin.systemOverview.title"
        subtitleKey="admin.systemOverview.subtitle"
      />

      {/* Audit-focused KPI strip (window-bound, no overlap with dashboard) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titleKey="admin.systemOverview.audit.kpi.total"
          value={formatInt(overview.totalAudits)}
          icon={FactCheckIcon}
          hintKey="admin.systemOverview.audit.kpi.windowHint"
          hintValue={`${overview.windowDays}d`}
        />
        <KpiCard
          titleKey="admin.systemOverview.audit.kpi.failed"
          value={formatInt(overview.failedCount)}
          icon={ErrorOutlineIcon}
          hintKey="admin.systemOverview.audit.kpi.failureRate"
          hintValue={failureRateLabel}
          variant={overview.failedCount > 0 ? "alert" : "default"}
        />
        <KpiCard
          titleKey="admin.systemOverview.audit.kpi.actors"
          value={formatInt(overview.uniqueActors)}
          icon={GroupIcon}
          hintKey="admin.systemOverview.audit.kpi.actorsHint"
        />
        <KpiCard
          titleKey="admin.systemOverview.audit.kpi.warnings"
          value={formatInt(overview.byStatus.warning)}
          icon={ReportProblemIcon}
          hintKey="admin.systemOverview.audit.kpi.warningsHint"
          variant={overview.byStatus.warning > 0 ? "alert" : "default"}
        />
      </section>

      {/* Daily activity chart */}
      <DashboardSection
        titleKey="admin.systemOverview.audit.dailyTitle"
        subtitleKey="admin.systemOverview.audit.dailySubtitle"
      >
        <AuditDailyChart buckets={overview.dailyBuckets} />
      </DashboardSection>

      {/* Two-column: actions ranking + actor role split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSection
          titleKey="admin.systemOverview.audit.topActionsTitle"
          subtitleKey="admin.systemOverview.audit.topActionsSubtitle"
        >
          <TopActionsList actions={overview.topActions} />
        </DashboardSection>

        <DashboardSection
          titleKey="admin.systemOverview.audit.byRoleTitle"
          subtitleKey="admin.systemOverview.audit.byRoleSubtitle"
        >
          <ActorRoleSplit rows={overview.byActorRole} />
        </DashboardSection>
      </div>

      {/* Recent audit trail */}
      <DashboardSection
        titleKey="admin.systemOverview.auditTitle"
        subtitleKey="admin.systemOverview.audit.recentSubtitle"
        href="/admin/audit-logs"
        hrefLabelKey="admin.systemOverview.viewAllAudit"
      >
        {recentAudits.length === 0 ? (
          <p className="text-neutral-soft text-sm">
            <T k="admin.systemOverview.auditEmpty" />
          </p>
        ) : (
          <ul className="divide-brand-50 divide-y">
            {recentAudits.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-brand-700 truncate font-mono text-xs font-semibold">
                    {a.action}
                  </span>
                  <span className="text-neutral-soft truncate text-xs">
                    {a.resource_type}
                    {a.actor_role ? ` · ${a.actor_role}` : ""}
                  </span>
                </div>
                <span className="text-neutral-soft shrink-0 text-xs">
                  {formatIsoTime(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="text-neutral-soft pt-2 text-right text-xs">
          <Link href="/admin/audit-logs" className="text-brand-500 hover:underline">
            <T k="admin.systemOverview.viewAllAudit" />
          </Link>
        </div>
      </DashboardSection>
    </div>
  );
}

/** UTC "YYYY-MM-DD HH:mm" so SSR and client agree byte-for-byte. */
function formatIsoTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
