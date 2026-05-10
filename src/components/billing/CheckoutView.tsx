"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { confirmMockPaymentAction } from "@/app/actions/subscription.actions";
import { QrCode } from "@/components/ui/QrCode";
import type { Invoice, PaymentIntent } from "@/types/subscription.types";

interface Props {
  intent: PaymentIntent;
  invoice: Invoice;
  /** Where to navigate after successful payment. */
  successHref: string;
}

export function CheckoutView({ intent, invoice, successHref }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(intent.status === "Paid");

  // Live countdown
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (paid) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paid]);

  const expiresAt = new Date(intent.expires_at).getTime();
  const remainSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const expired = remainSec === 0 && !paid;
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await confirmMockPaymentAction(intent.id);
      if (!res.data) {
        setError(res.error ?? "unknown");
        return;
      }
      setPaid(true);
      setTimeout(() => {
        router.push(successHref);
        router.refresh();
      }, 800);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Order summary */}
      <section className="bg-white border border-[#DAEDD5] rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-xs uppercase text-[#6E726E]">
            {t("billing.checkout.invoice")}
          </p>
          <p className="font-mono text-[#155A03] font-semibold">
            {invoice.invoice_number}
          </p>
        </div>
        <ul className="space-y-2">
          {invoice.line_items.map((li, idx) => (
            <li key={idx} className="flex justify-between text-sm">
              <span>
                {li.description} × {li.quantity}
              </span>
              <span className="font-semibold">
                ${Number(li.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold">
          <span>{t("billing.checkout.total")}</span>
          <span>
            ${Number(invoice.amount).toFixed(2)} {invoice.currency}
          </span>
        </div>
        {!paid && !expired && (
          <p className="text-xs text-[#AAAAAA]">
            {t("billing.checkout.expiresIn", { time: `${mm}:${ss}` })}
          </p>
        )}
      </section>

      {/* QR + confirm (mock) */}
      <section className="bg-white border border-[#DAEDD5] rounded-2xl p-6 flex flex-col items-center text-center gap-3">
        <p className="text-sm text-[#6E726E]">
          {t("billing.checkout.scanInstructions")}
        </p>
        <QrCode value={intent.qr_payload ?? intent.id} size={200} />
        <p className="font-mono text-[10px] text-[#AAAAAA] break-all">
          {intent.qr_payload}
        </p>

        {paid ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 w-full">
            {t("billing.checkout.paid")}
          </div>
        ) : expired ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700 w-full">
            {t("billing.checkout.expired")}
          </div>
        ) : (
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="w-full px-4 py-3 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
          >
            {pending
              ? t("billing.checkout.confirming")
              : t("billing.checkout.confirmMock")}
          </button>
        )}
        {error && (
          <p className="text-sm text-red-700 w-full">
            {t(`error.${error}`, { defaultValue: error })}
          </p>
        )}
        <p className="text-[10px] text-[#AAAAAA]">
          {t("billing.checkout.mockHint")}
        </p>
      </section>
    </div>
  );
}
