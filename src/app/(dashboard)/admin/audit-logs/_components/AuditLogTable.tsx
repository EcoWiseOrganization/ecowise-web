"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { searchAuditLogsAction } from "@/app/actions/audit.actions";
import { auditLogsToCsv } from "@/lib/admin-metrics";
import type { AuditLog } from "@/types/audit.types";

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
        actorRole: (actorRole || undefined) as AuditLog["actor_role"] | undefined,
        status:
          (statusFilter || undefined) as AuditLog["status"] | undefined,
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
          placeholder="Action contains…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
        <select
          value={actorRole}
          onChange={(e) => setActorRole(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">All actors</option>
          <option value="system_admin">System admin</option>
          <option value="org_admin">Org admin</option>
          <option value="employee">Employee</option>
          <option value="individual">Individual</option>
          <option value="guest">Guest</option>
          <option value="system">System</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
        </select>
        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="">All resources</option>
          <option value="auth">Auth</option>
          <option value="organization">Organization</option>
          <option value="organization_member">Organization member</option>
          <option value="event">Event</option>
          <option value="emission_log">Emission log</option>
          <option value="emission_factor">Emission factor</option>
          <option value="subscription">Subscription</option>
          <option value="invoice">Invoice</option>
          <option value="challenge">Challenge</option>
          <option value="reward">Reward</option>
          <option value="report">Report</option>
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
          {pending ? "Searching…" : t("admin.audit.search")}
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="px-4 py-2 rounded-lg border border-[#DAEDD5] text-[#1F8505] text-sm font-semibold"
        >
          Download CSV
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
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[#AAAAAA]">
                  No audit entries match your filters.
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
          {count.toLocaleString()} entries · page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || pending}
            onClick={() => apply(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || pending}
            onClick={() => apply(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <p className="text-xs text-[#AAAAAA]">
        BR-16: audit logs are immutable. This view is read-only.
      </p>
    </div>
  );
}
