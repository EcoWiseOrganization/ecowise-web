"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { reviewEmissionLogAction } from "@/app/actions/org-admin.actions";

interface PendingLog {
  id: string;
  activity_name: string;
  scope: string;
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result: number | null;
  status: string;
  evidence_url: string | null;
  category: { id: string; name: string } | null;
}

export function ReviewQueue({
  orgId,
  initialLogs,
}: {
  orgId: string;
  initialLogs: PendingLog[];
}) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState(initialLogs);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  // Tracks the evidence image the admin clicked through to see full-size.
  // Inline preview matters because Supabase Storage signed URLs typically
  // expire before an admin clicks the original "View evidence" link.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const verify = (logId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await reviewEmissionLogAction(orgId, logId, "Verified");
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    });
  };

  const reject = (logId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await reviewEmissionLogAction(
        orgId,
        logId,
        "Rejected",
        rejectReason || null
      );
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      setRejectingId(null);
      setRejectReason("");
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DAEDD5] p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-[#155A03] text-lg font-semibold">
          {t("org.review.title")}
        </h2>
        <p className="text-sm text-[#6E726E]">{t("org.review.subtitle")}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center text-sm text-[#AAAAAA] py-8">
          {t("org.review.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[#6E726E] text-xs uppercase">
              <tr className="border-b border-gray-100">
                <th className="px-2 py-2">{t("org.review.col.activity")}</th>
                <th className="px-2 py-2">{t("org.review.col.scope")}</th>
                <th className="px-2 py-2">{t("org.review.col.date")}</th>
                <th className="px-2 py-2">{t("org.review.col.quantity")}</th>
                <th className="px-2 py-2">{t("org.review.col.co2e")}</th>
                <th className="px-2 py-2 text-right">
                  {t("org.review.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-2 py-3">
                    <div className="text-[#141514] font-medium">
                      {log.activity_name}
                    </div>
                    {log.category && (
                      <div className="text-xs text-[#AAAAAA]">
                        {log.category.name}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3">{log.scope}</td>
                  <td className="px-2 py-3">{log.reporting_date}</td>
                  <td className="px-2 py-3">
                    {log.quantity} {log.unit}
                  </td>
                  <td className="px-2 py-3 font-semibold text-[#155A03]">
                    {(log.co2e_result ?? 0).toFixed(2)} kg
                  </td>
                  <td className="px-2 py-3 text-right space-x-2">
                    {log.evidence_url && (
                      <>
                        {/* Inline thumbnail — Storage signed URLs expire
                          * before an admin gets around to clicking the
                          * "View" link, so we render the image directly.
                          * The link still opens a full-size version in a
                          * new tab if the signed URL is still valid. */}
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(log.evidence_url!)}
                          className="inline-block align-middle mr-1"
                          aria-label={t("org.review.viewEvidence")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={log.evidence_url}
                            alt={t("org.review.viewEvidence")}
                            className="inline-block h-8 w-8 object-cover rounded border border-[#DAEDD5]"
                            loading="lazy"
                          />
                        </button>
                        <a
                          href={log.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#1F8505] hover:underline"
                        >
                          {t("org.review.viewEvidence")}
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => verify(log.id)}
                      disabled={pending}
                      className="px-3 py-1 bg-[#1F8505] text-white text-xs rounded-lg hover:bg-[#155A03] disabled:opacity-50"
                    >
                      {t("org.review.verify")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(log.id)}
                      disabled={pending}
                      className="px-3 py-1 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {t("org.review.reject")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingId(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-[#155A03] text-base font-semibold">
              {t("org.review.rejectTitle")}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("org.review.reasonPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-sm rounded-lg border border-[#E5E7EB]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => reject(rejectingId)}
                disabled={pending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t("org.review.reject")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size evidence preview modal — opens when an admin clicks
        * the inline thumbnail. ESC / backdrop click closes. */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4 relative"
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
              aria-label={t("common.close", { defaultValue: "Close" })}
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={t("org.review.viewEvidence")}
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
