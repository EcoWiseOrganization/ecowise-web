"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { searchAuditLogsAction } from "@/app/actions/audit.actions";
import { auditLogsToCsv } from "@/lib/admin-metrics";
import type { ActorRole } from "@/lib/auth/roles";
import type { AuditLog, AuditLogStatus } from "@/types/audit.types";

const STATUS_COLORS: Record<string, string> = {
  success: "bg-[#f0f9ed] text-[#1F8505]",
  failure: "bg-red-50 text-red-700",
  warning: "bg-orange-50 text-orange-700",
};

interface Props {
  initial: AuditLog[];
  initialCount: number;
}

export function AuditLogTable({ initial, initialCount }: Props) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>(initial);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const apply = (nextPage = 1) => {
    setError(null);
    setPage(nextPage);
    startTransition(async () => {
      const res = await searchAuditLogsAction({
        action: search || undefined,
        actorRole: actorRole ? (actorRole as ActorRole) : undefined,
        status: statusFilter ? (statusFilter as AuditLogStatus) : undefined,
        resourceType: resourceType || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        page: nextPage,
        pageSize,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setLogs(res.data);
      setCount(res.count);
    });
  };

  const downloadCsv = () => {
    const csv = auditLogsToCsv(logs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_page${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <input
          type="text"
          placeholder={t("admin.auditLogs.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
        <select
          value={actorRole}
          onChange={(e) => setActorRole(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">{t("admin.auditLogs.filterAllActors")}</option>
          <option value="system_admin">{t("admin.auditLogs.actor.system_admin")}</option>
          <option value="org_admin">{t("admin.auditLogs.actor.org_admin")}</option>
          <option value="employee">{t("admin.auditLogs.actor.employee")}</option>
          <option value="individual">{t("admin.auditLogs.actor.individual")}</option>
          <option value="guest">{t("admin.auditLogs.actor.guest")}</option>
          <option value="system">{t("admin.auditLogs.actor.system")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">{t("admin.auditLogs.filterAllStatuses")}</option>
          <option value="success">{t("admin.auditLogs.status.success")}</option>
          <option value="failure">{t("admin.auditLogs.status.failure")}</option>
          <option value="warning">{t("admin.auditLogs.status.warning")}</option>
        </select>
        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">{t("admin.auditLogs.filterAllResources")}</option>
          <option value="auth">{t("admin.auditLogs.resource.auth")}</option>
          <option value="organization">{t("admin.auditLogs.resource.organization")}</option>
          <option value="organization_member">{t("admin.auditLogs.resource.organization_member")}</option>
          <option value="event">{t("admin.auditLogs.resource.event")}</option>
          <option value="emission_log">{t("admin.auditLogs.resource.emission_log")}</option>
          <option value="emission_factor">{t("admin.auditLogs.resource.emission_factor")}</option>
          <option value="subscription">{t("admin.auditLogs.resource.subscription")}</option>
          <option value="invoice">{t("admin.auditLogs.resource.invoice")}</option>
          <option value="challenge">{t("admin.auditLogs.resource.challenge")}</option>
          <option value="reward">{t("admin.auditLogs.resource.reward")}</option>
          <option value="report">{t("admin.auditLogs.resource.report")}</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => apply(1)}
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("common.searching") : t("admin.audit.search")}
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="px-4 py-2 rounded-lg border border-[#DAEDD5] text-[#1F8505] text-sm font-semibold"
        >
          {t("admin.auditLogs.downloadCsv")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2">{t("admin.auditLogs.col.time")}</th>
              <th className="px-3 py-2">{t("admin.auditLogs.col.action")}</th>
              <th className="px-3 py-2">{t("admin.auditLogs.col.resource")}</th>
              <th className="px-3 py-2">{t("admin.auditLogs.col.actor")}</th>
              <th className="px-3 py-2">{t("admin.auditLogs.col.status")}</th>
              <th className="px-3 py-2">{t("admin.auditLogs.col.ip")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[#AAAAAA]">
                  {t("admin.auditLogs.empty")}
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-gray-50 last:border-0 align-top"
                >
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{l.resource_type}</div>
                    {l.resource_id && (
                      <div className="text-[10px] text-[#AAAAAA] font-mono">
                        {l.resource_id.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{l.actor_role ?? "—"}</div>
                    {l.actor_user_id && (
                      <div className="text-[10px] text-[#AAAAAA] font-mono">
                        {l.actor_user_id.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[l.status] ?? "bg-gray-100"
                      }`}
                    >
                      {l.status}
                    </span>
                    {l.error_message && (
                      <div className="text-[10px] text-red-600 mt-1">
                        {l.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-[#AAAAAA]">
                    {l.ip_address ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-[#6E726E]">
          {t("admin.auditLogs.pagerSummary", {
            count,
            page,
            total: totalPages,
          })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || pending}
            onClick={() => apply(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-50"
          >
            {t("common.previous")}
          </button>
          <button
            type="button"
            disabled={page >= totalPages || pending}
            onClick={() => apply(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-50"
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      <p className="text-xs text-[#AAAAAA]">
        {t("admin.auditLogs.immutableHint")}
      </p>
    </div>
  );
}
