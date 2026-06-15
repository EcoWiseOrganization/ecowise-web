"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  reactivateAutoRenewAction,
  subscribeToPlanAction,
  updateBillingInfoAction,
} from "@/app/actions/subscription.actions";
import { UpgradePlanModal } from "@/components/billing/UpgradePlanModal";
import type {
  BillingInfoInput,
  PlanUpgradeRequest,
  Subscription,
  SubscriptionPlan,
  SubscriptionSubjectType,
  SubscriptionUsage,
  SubscriptionWithPlan,
} from "@/types/subscription.types";

interface Props {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  current: SubscriptionWithPlan | null;
  plans: SubscriptionPlan[];
  usage: SubscriptionUsage | null;
  invoicesHref: string;
  cancelHref: string;
  basePath: string;
  /** Most recent upgrade request for this subject — drives the "awaiting
   *  approval" banner after a QR transfer. */
  pendingRequest?: PlanUpgradeRequest | null;
}

export function SubscriptionCenter({
  subjectType,
  subjectId,
  current,
  plans,
  usage,
  invoicesHref,
  cancelHref,
  basePath,
  pendingRequest,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The paid plan the user is upgrading to (drives the QR modal). Free plans
  // skip the modal and subscribe instantly.
  const [upgradePlan, setUpgradePlan] = useState<SubscriptionPlan | null>(null);

  const choosePlan = (plan: SubscriptionPlan) => {
    if (Number(plan.base_price_usd) > 0) {
      setUpgradePlan(plan);
      return;
    }
    subscribe(plan.id);
  };

  const subscribe = (planId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await subscribeToPlanAction({ subjectType, subjectId, planId });
      if (res.error || !res.redirectTo) {
        setError(res.error ?? "unknown");
        return;
      }
      router.push(res.redirectTo);
      router.refresh();
    });
  };

  const reactivate = (sub: Subscription) => {
    setError(null);
    startTransition(async () => {
      const res = await reactivateAutoRenewAction(sub.id);
      if (!res.ok) {
        setError(res.error ?? "unknown");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <CurrentPlanCard
        current={current}
        usage={usage}
        invoicesHref={invoicesHref}
        cancelHref={cancelHref}
        onReactivate={reactivate}
        pending={pending}
      />

      {current && (
        <BillingInfoForm
          subscription={current}
          onSaved={() => router.refresh()}
        />
      )}

      {pendingRequest && pendingRequest.status === "Pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {t("upgrade.pending.title")}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {t("upgrade.pending.body")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {t(`error.${error}`, { defaultValue: error })}
        </div>
      )}

      <section>
        <h2 className="text-[#155A03] text-lg font-semibold mb-3">
          {t("billing.availablePlans")}
        </h2>
        {plans.length === 0 ? (
          <p className="text-[#AAAAAA] text-sm">{t("billing.noPlans")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={current?.plan_id === p.id}
                onSubscribe={() => choosePlan(p)}
                pending={pending}
              />
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-[#AAAAAA]">
        {t("billing.mockNotice")}
        <Link href={basePath} className="hover:underline">
          {" "}
          ↻
        </Link>
      </p>

      {upgradePlan && (
        <UpgradePlanModal
          plan={upgradePlan}
          subjectType={subjectType}
          subjectId={subjectId}
          onClose={() => setUpgradePlan(null)}
          onSubmitted={() => {
            setUpgradePlan(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CurrentPlanCard({
  current,
  usage,
  invoicesHref,
  cancelHref,
  onReactivate,
  pending,
}: {
  current: SubscriptionWithPlan | null;
  usage: SubscriptionUsage | null;
  invoicesHref: string;
  cancelHref: string;
  onReactivate: (sub: Subscription) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  if (!current) {
    return (
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <p className="text-sm text-[#6E726E]">{t("billing.noActive")}</p>
      </div>
    );
  }

  const periodEnd = new Date(current.current_period_end);
  const usersPct =
    usage?.maxUsers && usage.maxUsers > 0
      ? Math.min(100, Math.round((usage.activeUsers / usage.maxUsers) * 100))
      : 0;
  const eventsPct =
    usage?.maxEvents && usage.maxEvents > 0
      ? Math.min(100, Math.round((usage.totalEvents / usage.maxEvents) * 100))
      : 0;

  return (
    <div className="bg-white border border-[#B8D6B0] rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase text-[#6E726E]">
            {t("billing.currentPlan")}
          </p>
          <h2 className="text-[#155A03] text-xl font-bold">
            {current.plan.plan_name}
          </h2>
          <p className="text-sm text-[#6E726E]">
            {t("billing.priceLine", {
              price: Number(current.plan.base_price_usd).toFixed(2),
              cycle: current.plan.billing_cycle,
            })}
          </p>
          <span
            className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${statusColor(
              current.status
            )}`}
          >
            {current.status}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-[#6E726E]">
            {t("billing.nextBilling")}
          </p>
          <p className="text-sm font-semibold">
            {periodEnd.toLocaleDateString()}
          </p>
          <p className="text-xs text-[#AAAAAA] mt-1">
            {t("billing.autoRenew")}:{" "}
            {current.auto_renew ? t("billing.on") : t("billing.off")}
          </p>
        </div>
      </div>

      {usage && current.subject_type === "Org" && (
        <div className="grid grid-cols-2 gap-3">
          <UsageBar
            label={t("billing.usage.users")}
            current={usage.activeUsers}
            max={usage.maxUsers}
            pct={usersPct}
          />
          <UsageBar
            label={t("billing.usage.events")}
            current={usage.totalEvents}
            max={usage.maxEvents}
            pct={eventsPct}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={invoicesHref}
          className="px-4 py-2 rounded-lg border border-[#DAEDD5] text-[#1F8505] text-sm font-semibold hover:bg-[#f0f9ed]"
        >
          {t("billing.viewInvoices")}
        </Link>
        {current.auto_renew ? (
          <Link
            href={cancelHref}
            className="px-4 py-2 rounded-lg border border-orange-300 text-orange-700 text-sm font-semibold hover:bg-orange-50"
          >
            {t("billing.cancel")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onReactivate(current)}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold disabled:opacity-50"
          >
            {t("billing.cancel.reactivate")}
          </button>
        )}
      </div>
    </div>
  );
}

function UsageBar({
  label,
  current,
  max,
  pct,
}: {
  label: string;
  current: number;
  max: number | null;
  pct: number;
}) {
  return (
    <div className="bg-[#F0FDF4] border border-[#DAEDD5] rounded-lg p-3">
      <p className="text-xs text-[#6E726E]">{label}</p>
      <p className="font-semibold text-sm text-[#155A03]">
        {current} / {max === null ? "∞" : max}
      </p>
      {max !== null && (
        <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full ${pct >= 100 ? "bg-red-500" : "bg-[#1F8505]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onSubscribe,
  pending,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  onSubscribe: () => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <article
      className={`rounded-2xl p-6 border-2 flex flex-col ${
        isCurrent
          ? "border-[#1F8505] bg-[#F0FDF4]"
          : "border-[#DAEDD5] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-wide text-[#6E726E]">
            {plan.plan_code}
          </span>
          <h3 className="text-[#155A03] text-lg font-bold mt-1">{plan.plan_name}</h3>
        </div>
        {isCurrent && (
          <span className="text-xs bg-[#1F8505] text-white px-2 py-0.5 rounded-full">
            {t("billing.current")}
          </span>
        )}
      </div>
      <div className="mt-3">
        <span className="text-3xl font-bold text-[#155A03]">
          ${Number(plan.base_price_usd).toFixed(2)}
        </span>
        <span className="text-sm text-[#6E726E] ml-1">
          / {plan.billing_cycle.toLowerCase()}
        </span>
      </div>
      {plan.trial_days > 0 && (
        <span className="text-xs text-[#1F8505] mt-1">
          {t("billing.trialDays", { days: plan.trial_days })}
        </span>
      )}
      <ul className="mt-3 space-y-1 text-sm text-[#3B3D3B] flex-1">
        {plan.features.map((f) => (
          <li key={f.key} className="flex items-start gap-2">
            <span className="text-[#1F8505] mt-0.5">✓</span>
            <span>{f.label}</span>
          </li>
        ))}
        <li className="text-xs text-[#AAAAAA] mt-2">
          {t("billing.maxUsers")}:{" "}
          {plan.max_users === null ? "∞" : plan.max_users}
          {" · "}
          {t("billing.maxEvents")}:{" "}
          {plan.max_events === null ? "∞" : plan.max_events}
        </li>
      </ul>
      <button
        type="button"
        onClick={onSubscribe}
        disabled={pending || isCurrent}
        className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold ${
          isCurrent
            ? "bg-gray-100 text-gray-500 cursor-default"
            : "bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white hover:shadow-md"
        } disabled:opacity-50`}
      >
        {isCurrent ? t("billing.currentPlanLabel") : t("billing.subscribe")}
      </button>
    </article>
  );
}

function BillingInfoForm({
  subscription,
  onSaved,
}: {
  subscription: Subscription;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<BillingInfoInput>({
    billing_email: subscription.billing_email ?? "",
    billing_company_name: subscription.billing_company_name ?? "",
    billing_address: subscription.billing_address ?? "",
    billing_vat_id: subscription.billing_vat_id ?? "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      const res = await updateBillingInfoAction({
        subscriptionId: subscription.id,
        input: form,
      });
      if (res.ok) {
        setSaved(true);
        onSaved();
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#DAEDD5] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <h2 className="text-[#155A03] text-lg font-semibold md:col-span-2">
        {t("billing.info.heading")}
      </h2>
      <Field label={t("billing.info.companyName")}>
        <input
          type="text"
          value={form.billing_company_name ?? ""}
          onChange={(e) =>
            setForm((s) => ({ ...s, billing_company_name: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          maxLength={200}
        />
      </Field>
      <Field label={t("billing.info.email")}>
        <input
          type="email"
          value={form.billing_email ?? ""}
          onChange={(e) => setForm((s) => ({ ...s, billing_email: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          maxLength={320}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label={t("billing.info.address")}>
          <textarea
            value={form.billing_address ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, billing_address: e.target.value }))
            }
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
            maxLength={500}
          />
        </Field>
      </div>
      <Field label={t("billing.info.vatId")}>
        <input
          type="text"
          value={form.billing_vat_id ?? ""}
          onChange={(e) => setForm((s) => ({ ...s, billing_vat_id: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          maxLength={50}
        />
      </Field>
      <div className="md:col-span-2 flex items-center justify-end gap-2 mt-1">
        {saved && (
          <span className="text-xs text-green-700">
            {t("billing.info.saved")}
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("activity.saving") : t("billing.info.save")}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6E726E] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-[#f0f9ed] text-[#1F8505]";
    case "Trial":
      return "bg-blue-50 text-blue-700";
    case "PastDue":
      return "bg-orange-100 text-orange-700";
    case "Canceled":
    case "Suspended":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
