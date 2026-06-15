"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/format-number";
import type { Invoice, PaymentIntent } from "@/types/subscription.types";

export function InvoiceDetail({
  invoice,
  intent,
  backHref,
  checkoutBase,
}: {
  invoice: Invoice;
  intent: PaymentIntent | null;
  backHref: string;
  checkoutBase: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-[#DAEDD5] rounded-2xl p-8 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="text-sm text-[#1F8505] hover:underline">
          ← {t("billing.invoices.backToList")}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm text-[#1F8505] hover:underline"
        >
          {t("billing.invoices.print")}
        </button>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-[#155A03]">
          {t("billing.invoices.heading")}
        </h1>
        <p className="text-sm font-mono text-[#6E726E]">{invoice.invoice_number}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label={t("billing.invoices.issueDate")} value={invoice.issue_date} />
        <Info
          label={t("billing.invoices.dueDate")}
          value={invoice.due_date ?? "—"}
        />
        <Info label={t("billing.invoices.status")} value={invoice.status} />
        <Info
          label={t("billing.invoices.amount")}
          value={formatMoney(Number(invoice.amount), invoice.currency)}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#155A03] mb-2">
          {t("billing.invoices.lineItems")}
        </h2>
        <table className="w-full text-sm border border-[#E5E7EB] rounded-lg overflow-hidden">
          <thead className="bg-[#F0FDF4] text-left text-xs uppercase text-[#6E726E]">
            <tr>
              <th className="px-3 py-2">{t("billing.invoices.description")}</th>
              <th className="px-3 py-2">{t("billing.invoices.quantity")}</th>
              <th className="px-3 py-2">{t("billing.invoices.unitPrice")}</th>
              <th className="px-3 py-2">{t("billing.invoices.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((li, idx) => (
              <tr key={idx} className="border-t border-gray-100">
                <td className="px-3 py-2">{li.description}</td>
                <td className="px-3 py-2">{li.quantity}</td>
                <td className="px-3 py-2">
                  {formatMoney(Number(li.unit_price), invoice.currency)}
                </td>
                <td className="px-3 py-2 font-semibold text-[#155A03]">
                  {formatMoney(Number(li.amount), invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F0FDF4] font-bold">
              <td className="px-3 py-2" colSpan={3}>
                {t("billing.invoices.total")}
              </td>
              <td className="px-3 py-2 text-[#155A03]">
                {formatMoney(Number(invoice.amount), invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.status === "PendingPayment" && intent && intent.status !== "Paid" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-orange-700">
            {t("billing.invoices.pendingNotice")}
          </p>
          <Link
            href={`${checkoutBase}/${intent.id}`}
            className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold"
          >
            {t("billing.invoices.payNow")}
          </Link>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F0FDF4] rounded-lg p-3">
      <p className="text-xs text-[#6E726E]">{label}</p>
      <p className="font-medium text-[#155A03]">{value}</p>
    </div>
  );
}
