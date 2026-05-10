"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  cancelSubscriptionAction,
  reactivateAutoRenewAction,
} from "@/app/actions/subscription.actions";
import type { SubscriptionWithPlan } from "@/types/subscription.types";

const REASONS = [
  "too_expensive",
  "missing_features",
  "switched_provider",
  "temporary_pause",
  "other",
] as const;

type Reason = (typeof REASONS)[number];

interface Props {
  subscription: SubscriptionWithPlan;
  backHref: string;
}

export function CancelFlow({ subscription, backHref }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [reason, setReason] = useState<Reason>("too_expensive");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"canceled" | "reactivated" | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction(subscription.id, reason, feedback);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setDone("canceled");
      setTimeout(() => {
        router.push(backHref);
        router.refresh();
      }, 1200);
    });
  };

  const reactivate = () => {
    setError(null);
    startTransition(async () => {
      const res = await reactivateAutoRenewAction(subscription.id);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      setDone("reactivated");
      setTimeout(() => {
        router.push(backHref);
        router.refresh();
      }, 1200);
    });
  };

  if (subscription.status === "Canceled") {
    return (
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <p className="text-sm text-[#6E726E]">
          {t("billing.cancel.alreadyCanceled")}
        </p>
      </div>
    );
  }

  // If auto_renew is already off, offer to reactivate.
  if (!subscription.auto_renew) {
    return (
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6 space-y-3">
        <h2 className="text-[#155A03] text-lg font-semibold">
          {t("billing.cancel.reactivateTitle")}
        </h2>
        <p className="text-sm text-[#6E726E]">
          {t("billing.cancel.reactivateBody", {
            endsOn: subscription.current_period_end.slice(0, 10),
          })}
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {t(`error.${error}`, { defaultValue: error })}
          </div>
        )}
        {done === "reactivated" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            {t("billing.cancel.reactivated")}
          </div>
        )}
        <button
          type="button"
          onClick={reactivate}
          disabled={pending}
          className="px-5 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending
            ? t("billing.cancel.processing")
            : t("billing.cancel.reactivate")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#DAEDD5] rounded-2xl p-6 max-w-2xl space-y-4"
    >
      <h2 className="text-[#155A03] text-lg font-semibold">
        {t("billing.cancel.title")}
      </h2>
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800 space-y-1">
        <p className="font-medium">{t("billing.cancel.brTitle")}</p>
        <ul className="list-disc list-inside">
          <li>{t("billing.cancel.br1")}</li>
          <li>
            {t("billing.cancel.br2", {
              endsOn: subscription.current_period_end.slice(0, 10),
            })}
          </li>
          <li>{t("billing.cancel.br3")}</li>
        </ul>
      </div>

      <div>
        <p className="text-xs uppercase text-[#6E726E] mb-2">
          {t("billing.cancel.reason")}
        </p>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              <span>{t(`billing.cancel.reason.${r}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="block text-xs font-medium text-[#6E726E] mb-1">
          {t("billing.cancel.feedback")}
        </span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
          placeholder={t("billing.cancel.feedbackPlaceholder")}
        />
      </label>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}
      {done === "canceled" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {t("billing.cancel.canceled")}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        >
          {t("billing.cancel.keepPlan")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700"
        >
          {pending
            ? t("billing.cancel.processing")
            : t("billing.cancel.confirm")}
        </button>
      </div>
    </form>
  );
}
