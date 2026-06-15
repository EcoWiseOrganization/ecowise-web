"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  createPlanAction,
  updatePlanAction,
} from "@/app/actions/subscription.actions";
import type {
  PlanFeature,
  SubscriptionPlan,
  UpsertSubscriptionPlanInput,
} from "@/types/subscription.types";

interface Props {
  initial?: SubscriptionPlan;
}

export function PlanForm({ initial }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [planCode, setPlanCode] = useState(initial?.plan_code ?? "");
  const [planName, setPlanName] = useState(initial?.plan_name ?? "");
  const [target, setTarget] = useState<"B2B" | "B2C">(
    initial?.target_customer ?? "B2B"
  );
  const [price, setPrice] = useState(String(initial?.base_price_usd ?? "0"));
  const [cycle, setCycle] = useState<"Monthly" | "Annual">(
    initial?.billing_cycle ?? "Monthly"
  );
  const [trialDays, setTrialDays] = useState(String(initial?.trial_days ?? 0));
  const [maxUsers, setMaxUsers] = useState(
    initial?.max_users === null || initial?.max_users === undefined
      ? ""
      : String(initial.max_users)
  );
  const [maxEvents, setMaxEvents] = useState(
    initial?.max_events === null || initial?.max_events === undefined
      ? ""
      : String(initial.max_events)
  );
  const [status, setStatus] = useState<"Active" | "Inactive">(
    initial?.status ?? "Active"
  );
  const [features, setFeatures] = useState<PlanFeature[]>(initial?.features ?? []);
  const [newFeatureKey, setNewFeatureKey] = useState("");
  const [newFeatureLabel, setNewFeatureLabel] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: UpsertSubscriptionPlanInput = {
      plan_code: planCode.trim(),
      plan_name: planName.trim(),
      target_customer: target,
      base_price_usd: Number(price),
      billing_cycle: cycle,
      trial_days: Number(trialDays) || 0,
      max_users: maxUsers === "" ? null : Number(maxUsers),
      max_events: maxEvents === "" ? null : Number(maxEvents),
      features,
      status,
    };
    startTransition(async () => {
      const res = initial
        ? await updatePlanAction(initial.id, input)
        : await createPlanAction(input);
      if (res.error || !res.data) {
        setError(res.error ?? "unknown");
        return;
      }
      router.push("/admin/subscriptions");
      router.refresh();
    });
  };

  const addFeature = () => {
    if (!newFeatureKey.trim() || !newFeatureLabel.trim()) return;
    setFeatures((f) => [
      ...f,
      { key: newFeatureKey.trim(), label: newFeatureLabel.trim() },
    ]);
    setNewFeatureKey("");
    setNewFeatureLabel("");
  };

  const removeFeature = (key: string) => {
    setFeatures((f) => f.filter((x) => x.key !== key));
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-[#DAEDD5] p-6 max-w-3xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t("admin.planForm.planCode")}>
          <input
            type="text"
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value)}
            disabled={Boolean(initial)}
            required
            maxLength={50}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-mono uppercase disabled:bg-gray-50"
            placeholder="B2B_PRO"
          />
        </Field>
        <Field label={t("admin.planForm.planName")}>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            required
            maxLength={120}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.planForm.target")}>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as "B2B" | "B2C")}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
        </Field>
        <Field label={t("admin.planForm.cycle")}>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as "Monthly" | "Annual")}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            <option value="Monthly">{t("admin.planForm.cycleMonthly")}</option>
            <option value="Annual">{t("admin.planForm.cycleAnnual")}</option>
          </select>
        </Field>
        <Field label={t("admin.planForm.price")}>
          <input
            type="number"
            step="any"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.planForm.trial")}>
          <input
            type="number"
            min={0}
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.planForm.maxUsers")}>
          <input
            type="number"
            min={0}
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.planForm.maxEvents")}>
          <input
            type="number"
            min={0}
            value={maxEvents}
            onChange={(e) => setMaxEvents(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.planForm.status")}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            <option value="Active">{t("admin.planForm.statusActive")}</option>
            <option value="Inactive">{t("admin.planForm.statusInactive")}</option>
          </select>
        </Field>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#155A03] mb-2">{t("admin.planForm.features")}</h3>
        <ul className="space-y-1 text-sm">
          {features.map((f, i) => (
            <li
              key={`${f.key ?? "feat"}-${i}`}
              className="flex items-center justify-between bg-[#F0FDF4] border border-[#DAEDD5] rounded px-3 py-1.5"
            >
              <span>
                <span className="font-mono text-xs text-[#6E726E]">
                  {f.key}
                </span>{" "}
                — {f.label}
              </span>
              <button
                type="button"
                onClick={() => removeFeature(f.key)}
                className="text-xs text-red-600 hover:underline"
              >
                {t("admin.planForm.removeFeature")}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newFeatureKey}
            onChange={(e) => setNewFeatureKey(e.target.value)}
            placeholder={t("admin.planForm.featureKeyPlaceholder")}
            className="px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-mono w-32"
          />
          <input
            type="text"
            value={newFeatureLabel}
            onChange={(e) => setNewFeatureLabel(e.target.value)}
            placeholder={t("admin.planForm.featureLabelPlaceholder")}
            className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
          <button
            type="button"
            onClick={addFeature}
            className="px-4 py-2 rounded-lg border border-[#DAEDD5] text-sm"
          >
            {t("admin.planForm.addFeature")}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-lg bg-[#155A03] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending
            ? t("common.saving")
            : initial
              ? t("admin.planForm.savePlan")
              : t("admin.planForm.createPlan")}
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
