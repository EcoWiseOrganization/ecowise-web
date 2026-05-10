"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import GroupIcon from "@mui/icons-material/Group";
import EventNoteIcon from "@mui/icons-material/EventNote";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import VerifiedIcon from "@mui/icons-material/Verified";
import type {
  EmployeeActivityRow,
  Organization,
  OrgMetricsSummary,
} from "@/types/organization.types";
import type { Event } from "@/types/event.types";
import { ROLE_ADMIN_ID } from "@/lib/roles";

interface OverviewBodyProps {
  org: Organization;
  metrics: OrgMetricsSummary;
  employees: EmployeeActivityRow[];
  events: Event[];
  isAdmin: boolean;
}

export function OverviewBody({
  org,
  metrics,
  employees,
  events,
  isAdmin,
}: OverviewBodyProps) {
  const { t } = useTranslation();
  const base = `/dashboard/organization/${org.id}`;

  const fmt = (kg: number) =>
    `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

  const topEmployees = [...employees]
    .sort((a, b) => b.total_co2e_kg - a.total_co2e_kg)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics summary */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={LocalFireDepartmentIcon}
          labelKey="org.overview.totalEmissions"
          value={fmt(metrics.totalEmissionsKg)}
        />
        <MetricCard
          icon={GroupIcon}
          labelKey="org.overview.activeEmployees"
          value={`${metrics.activeEmployees}`}
          sub={
            metrics.pendingMembers
              ? t("org.overview.pendingMembers", { count: metrics.pendingMembers })
              : undefined
          }
        />
        <MetricCard
          icon={EventNoteIcon}
          labelKey="org.overview.activeEvents"
          value={`${metrics.activeEvents}/${metrics.totalEvents}`}
        />
        <MetricCard
          icon={VerifiedIcon}
          labelKey="org.overview.pendingReviews"
          value={`${metrics.pendingReviews}`}
          accent={metrics.pendingReviews > 0 ? "alert" : undefined}
        />
      </section>

      {/* Scope breakdown */}
      <section className="bg-white rounded-2xl border border-[#DAEDD5] p-6">
        <h2 className="text-[#155A03] text-lg font-semibold mb-4">
          {t("org.overview.scopeBreakdown")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScopeRow
            label={t("emission.scope1")}
            value={metrics.scope1Kg}
            total={metrics.totalEmissionsKg}
            color="#1F8505"
          />
          <ScopeRow
            label={t("emission.scope2")}
            value={metrics.scope2Kg}
            total={metrics.totalEmissionsKg}
            color="#79B669"
          />
          <ScopeRow
            label={t("emission.scope3")}
            value={metrics.scope3Kg}
            total={metrics.totalEmissionsKg}
            color="#B8D6B0"
          />
        </div>
      </section>

      {/* Two-column: top contributors + event status */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#DAEDD5] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#155A03] text-lg font-semibold">
              {t("org.overview.topContributors")}
            </h2>
            {isAdmin && (
              <Link
                href={`${base}/employees`}
                className="text-sm text-[#1F8505] hover:underline"
              >
                {t("org.overview.manageEmployees")}
              </Link>
            )}
          </div>
          {topEmployees.length === 0 ? (
            <p className="text-[#6E726E] text-sm">{t("org.overview.noActivity")}</p>
          ) : (
            <ul className="space-y-2">
              {topEmployees.map((row) => (
                <li
                  key={row.user_id}
                  className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-[#141514] font-medium">
                      {row.full_name ?? row.email}
                    </span>
                    <span className="text-[#AAAAAA] text-xs">
                      {row.role_id === ROLE_ADMIN_ID
                        ? t("org.roleAdmin")
                        : t("org.roleMember")}{" "}
                      • {row.total_logs} {t("org.overview.logs")}
                    </span>
                  </div>
                  <span className="text-[#155A03] font-semibold">
                    {fmt(row.total_co2e_kg)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#DAEDD5] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#155A03] text-lg font-semibold">
              {t("org.overview.events")}
            </h2>
            <Link href={`${base}`} className="text-sm text-[#1F8505] hover:underline">
              {t("org.overview.viewAll")}
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-[#6E726E] text-sm">{t("org.noEvents")}</p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 5).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-[#141514] font-medium truncate">{ev.name}</span>
                  <span className="text-[#AAAAAA] text-xs">
                    {ev.start_date} → {ev.end_date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  labelKey,
  value,
  sub,
  accent,
}: {
  icon: typeof GroupIcon;
  labelKey: string;
  value: string;
  sub?: string;
  accent?: "alert";
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`bg-white border ${
        accent === "alert" ? "border-orange-300" : "border-[#DAEDD5]"
      } rounded-2xl p-5`}
    >
      <div className="flex items-center gap-2 text-[#1F8505] mb-2">
        <Icon sx={{ fontSize: 20 }} />
        <span className="text-xs uppercase tracking-wide text-[#6E726E]">
          {t(labelKey)}
        </span>
      </div>
      <div className="text-[#141514] text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-[#6E726E] mt-1">{sub}</div>}
    </div>
  );
}

function ScopeRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-[#3B3D3B] font-medium">{label}</span>
        <span className="text-[#155A03] font-semibold">
          {value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-[#AAAAAA]">{pct}%</span>
    </div>
  );
}
