"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@/types/subscription.types";

const STATUS_COLOR: Record<Invoice["status"], string> = {
  Paid: "bg-[#f0f9ed] text-[#1F8505]",
  PendingPayment: "bg-orange-50 text-orange-700",
  PastDue: "bg-red-50 text-red-700",
  Refunded: "bg-blue-50 text-blue-700",
  Voided: "bg-gray-100 text-gray-600",
};

export function InvoiceList({
  invoices,
  detailBase,
}: {
  invoices: Invoice[];
  detailBase: string;
}) {
  const { t } = useTranslation();

  if (invoices.length === 0) {
    return (
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-12 text-center text-sm text-[#6E726E]">
        {t("billing.invoices.empty")}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#DAEDD5] rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-[#6E726E] text-xs uppercase">
          <tr className="border-b border-gray-100">
            <th className="px-3 py-2">{t("billing.invoices.col.number")}</th>
            <th className="px-3 py-2">{t("billing.invoices.col.date")}</th>
            <th className="px-3 py-2">{t("billing.invoices.col.reason")}</th>
            <th className="px-3 py-2">{t("billing.invoices.col.amount")}</th>
            <th className="px-3 py-2">{t("billing.invoices.col.status")}</th>
            <th className="px-3 py-2 text-right" />
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-gray-50 last:border-0">
              <td className="px-3 py-2 font-mono">{inv.invoice_number}</td>
              <td className="px-3 py-2">{inv.issue_date}</td>
              <td className="px-3 py-2">{inv.billing_reason}</td>
              <td className="px-3 py-2 font-semibold text-[#155A03]">
                ${Number(inv.amount).toFixed(2)} {inv.currency}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    STATUS_COLOR[inv.status] ?? "bg-gray-100"
                  }`}
                >
                  {inv.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`${detailBase}/${inv.id}`}
                  className="text-[#1F8505] text-xs hover:underline"
                >
                  {t("billing.invoices.view")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
