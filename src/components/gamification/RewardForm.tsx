"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { upsertRewardAction } from "@/app/actions/gamification.actions";
import type {
  Reward,
  RewardFulfillment,
  RewardStatus,
  UpsertRewardInput,
} from "@/types/gamification.types";

const FULFILL: RewardFulfillment[] = ["Digital", "Physical", "Donation"];
const STATUSES: RewardStatus[] = ["Active", "LowStock", "Inactive"];

export function RewardForm({
  initial,
  redirectTo,
}: {
  initial?: Reward;
  redirectTo: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [points, setPoints] = useState(String(initial?.points_cost ?? 100));
  const [stock, setStock] = useState(String(initial?.total_stock ?? 10));
  const [fulfillment, setFulfillment] = useState<RewardFulfillment>(
    initial?.fulfillment ?? "Digital"
  );
  const [status, setStatus] = useState<RewardStatus>(initial?.status ?? "Active");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: UpsertRewardInput = {
      name: name.trim(),
      category: category.trim() || undefined,
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      points_cost: Number(points) || 1,
      total_stock: Number(stock) || 0,
      fulfillment,
      status,
    };
    startTransition(async () => {
      const res = await upsertRewardAction({ id: initial?.id, input });
      if (res.error || !res.data) {
        setError(res.error ?? "unknown");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#DAEDD5] rounded-2xl p-6 max-w-3xl space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t("admin.rewardForm.name")}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.rewardForm.category")}>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            placeholder={t("admin.rewardForm.categoryPlaceholder")}
          />
        </Field>
        <Field label={t("admin.rewardForm.sku")}>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            maxLength={60}
            disabled={Boolean(initial)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-mono disabled:bg-gray-50"
          />
        </Field>
        <Field label={t("admin.rewardForm.imageUrl")}>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.rewardForm.pointsCost")}>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.rewardForm.totalStock")}>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.rewardForm.fulfillment")}>
          <select
            value={fulfillment}
            onChange={(e) =>
              setFulfillment(e.target.value as RewardFulfillment)
            }
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {FULFILL.map((f) => (
              <option key={f} value={f}>
                {t(`admin.rewardForm.fulfill.${f}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("admin.rewardForm.status")}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RewardStatus)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.rewardForm.statusOpt.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label={t("admin.rewardForm.description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
            />
          </Field>
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
              ? t("admin.rewardForm.saveReward")
              : t("admin.rewardForm.createReward")}
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
      <span className="block text-xs font-medium text-[#6E726E] mb-1">{label}</span>
      {children}
    </label>
  );
}
