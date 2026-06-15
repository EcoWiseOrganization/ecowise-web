"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/format-number";
import {
  approveUpgradeRequestAction,
  listUpgradeRequestsAction,
  rejectUpgradeRequestAction,
} from "@/app/actions/upgrade-request.actions";
import type {
  PlanUpgradeRequestStatus,
  PlanUpgradeRequestWithDetails,
} from "@/types/subscription.types";

const TABS: PlanUpgradeRequestStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
];

function statusBadge(status: PlanUpgradeRequestStatus): string {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-700";
    case "Approved":
      return "bg-[#f0f9ed] text-[#1F8505]";
    case "Rejected":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function UpgradeRequestsView({
  initial,
}: {
  initial: PlanUpgradeRequestWithDetails[];
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tab, setTab] = useState<PlanUpgradeRequestStatus>("Pending");
  const [rows, setRows] = useState<PlanUpgradeRequestWithDetails[]>(initial);
  const [pending, startTransition] = useTransition();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = (status: PlanUpgradeRequestStatus) => {
    startTransition(async () => {
      const res = await listUpgradeRequestsAction(status);
      if (!res.error) setRows(res.data);
    });
  };

  const switchTab = (status: PlanUpgradeRequestStatus) => {
    setTab(status);
    setRejectId(null);
    refresh(status);
  };

  const approve = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await approveUpgradeRequestAction(id);
      setBusyId(null);
      if (res.error) {
        showToast(t(`error.${res.error}`, { defaultValue: res.error }), "error");
        return;
      }
      showToast(t("admin.upgradeRequests.approved"), "success");
      refresh(tab);
    });
  };

  const confirmReject = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await rejectUpgradeRequestAction(id, rejectReason.trim() || undefined);
      setBusyId(null);
      setRejectId(null);
      setRejectReason("");
      if (res.error) {
        showToast(t(`error.${res.error}`, { defaultValue: res.error }), "error");
        return;
      }
      showToast(t("admin.upgradeRequests.rejected"), "success");
      refresh(tab);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => switchTab(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
              tab === s
                ? "bg-[#1F8505] text-white border-[#1F8505]"
                : "bg-white text-[#6E726E] border-[#DAEDD5] hover:bg-[#f0f9ed]"
            }`}
          >
            {t(`admin.upgradeRequests.tab.${s.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6E726E] text-xs uppercase">
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.account")}</th>
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.from")}</th>
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.to")}</th>
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.amount")}</th>
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.reference")}</th>
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.requested")}</th>
              <th className="px-3 py-2">{t("admin.upgradeRequests.col.status")}</th>
              <th className="px-3 py-2 text-right">{t("admin.upgradeRequests.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#AAAAAA]">
                  {t("admin.upgradeRequests.empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-[#3B3D3B]">
                      {r.subject_label ?? r.requester_name ?? "—"}
                    </div>
                    <div className="text-xs text-[#AAAAAA]">
                      {r.requester_email ?? ""}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-[#6E726E]">
                      {r.subject_type === "Org"
                        ? t("billing.target.b2b")
                        : t("billing.target.b2c")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#6E726E]">
                    {r.current_plan?.plan_name ?? t("admin.upgradeRequests.noPlan")}
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#155A03]">
                    {r.plan?.plan_name ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {formatMoney(Number(r.amount), r.currency)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {r.transfer_note ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-[#6E726E]">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}
                    >
                      {t(`admin.upgradeRequests.tab.${r.status.toLowerCase()}`)}
                    </span>
                    {r.status === "Rejected" && r.reject_reason && (
                      <p className="text-[10px] text-red-500 mt-1 max-w-[160px]">
                        {r.reject_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {r.status === "Pending" ? (
                      rejectId === r.id ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder={t("admin.upgradeRequests.rejectReasonPlaceholder")}
                            className="w-44 px-2 py-1 rounded-lg border border-[#E5E7EB] text-xs"
                            maxLength={300}
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmReject(r.id)}
                              disabled={pending}
                              className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              {t("admin.upgradeRequests.confirmReject")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectId(null);
                                setRejectReason("");
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[#DAEDD5] text-[#6E726E] text-xs cursor-pointer"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => approve(r.id)}
                            disabled={pending && busyId === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1F8505] text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircleIcon sx={{ fontSize: 15 }} />
                            {t("admin.upgradeRequests.approve")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectId(r.id);
                              setRejectReason("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 cursor-pointer"
                          >
                            <CancelIcon sx={{ fontSize: 15 }} />
                            {t("admin.upgradeRequests.reject")}
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-[#AAAAAA]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
