"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import {
  useEmployeeManager,
  type MembershipRow,
} from "@/hooks/useEmployeeManager";
import type { InviteCapacity, MemberStatus } from "@/types/organization.types";
import { AddMembersForm } from "@/components/organizations/AddMembersForm";

interface Props {
  orgId: string;
  initialRows: MembershipRow[];
  capacity: InviteCapacity;
}

const STATUS_OPTIONS: MemberStatus[] = ["Active", "Pending", "Inactive"];

export function EmployeeManager({ orgId, initialRows, capacity }: Props) {
  const { t } = useTranslation();
  const { rows, pending, error, changeRole, changeStatus, remove } =
    useEmployeeManager(orgId, initialRows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.full_name ?? "").toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="bg-white rounded-2xl border border-[#DAEDD5] p-6 flex flex-col gap-4">
      {/* Header + invite */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold">
            {t("org.employees.title")}
          </h2>
          <p className="text-sm text-[#6E726E]">
            {t("org.employees.capacity", {
              current: capacity.current,
              max: capacity.max,
            })}
            {capacity.blocked && (
              <span className="ml-2 text-red-600 font-medium">
                {t("org.employees.atLimit")}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          disabled={capacity.blocked}
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("org.employees.invite")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          placeholder={t("org.employees.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "all")}
          className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
        >
          <option value="all">{t("org.employees.statusAll")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`org.memberStatus.${s.toLowerCase()}`)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-2 py-2">{t("org.employees.col.name")}</th>
              <th className="px-2 py-2">{t("org.employees.col.email")}</th>
              <th className="px-2 py-2">{t("org.employees.col.role")}</th>
              <th className="px-2 py-2">{t("org.employees.col.status")}</th>
              <th className="px-2 py-2">{t("org.employees.col.activity")}</th>
              <th className="px-2 py-2 text-right">{t("org.employees.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-[#AAAAAA]">
                  {t("org.employees.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isAdmin = r.role_id === ROLE_ADMIN_ID;
                return (
                  <tr key={r.member_id} className="border-b border-gray-50 last:border-0">
                    <td className="px-2 py-3 font-medium text-[#141514]">
                      {r.full_name ?? "—"}
                    </td>
                    <td className="px-2 py-3 text-[#6E726E]">{r.email}</td>
                    <td className="px-2 py-3">
                      <select
                        value={isAdmin ? "Organization Admin" : "Standard Member"}
                        onChange={(e) =>
                          changeRole(
                            r.member_id,
                            e.target.value as "Organization Admin" | "Standard Member"
                          )
                        }
                        disabled={pending}
                        className="px-2 py-1 rounded border border-[#E5E7EB] text-xs bg-white"
                      >
                        <option value="Organization Admin">
                          {t("org.roleAdmin")}
                        </option>
                        <option value="Standard Member">
                          {t("org.roleMember")}
                        </option>
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          changeStatus(r.member_id, e.target.value as MemberStatus)
                        }
                        disabled={pending}
                        className="px-2 py-1 rounded border border-[#E5E7EB] text-xs bg-white"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {t(`org.memberStatus.${s.toLowerCase()}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3 text-[#6E726E] text-xs">
                      {r.total_logs} {t("org.overview.logs")} •{" "}
                      {r.total_co2e_kg.toFixed(1)} kg
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(r.member_id)}
                        disabled={pending}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-xs"
                      >
                        {t("org.employees.remove")}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInvite(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <AddMembersForm
              orgId={orgId}
              onAdded={() => {
                setShowInvite(false);
                window.location.reload();
              }}
              onCancel={() => setShowInvite(false)}
            />
          </div>
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          message={t("org.employees.confirmRemove")}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            remove(confirmRemove);
            setConfirmRemove(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-[#141514] text-sm mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-[#E5E7EB]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {t("org.employees.remove")}
          </button>
        </div>
      </div>
    </div>
  );
}
