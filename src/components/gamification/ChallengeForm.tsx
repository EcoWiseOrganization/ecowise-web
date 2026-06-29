"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { upsertChallengeAction, uploadChallengeImageAction } from "@/app/actions/gamification.actions";
import type {
  Challenge,
  ChallengeStatus,
  ChallengeVerification,
  UpsertChallengeInput,
} from "@/types/gamification.types";

interface Props {
  /** Pre-fill for edit. */
  initial?: Challenge;
  /** When defined, the challenge is org-scoped (Phase 9.5 — Org Admin). */
  orgId?: string | null;
  redirectTo: string;
}

const STATUSES: ChallengeStatus[] = [
  "Draft",
  "Upcoming",
  "Active",
  "Completed",
  "Archived",
];
const VERIFY: ChallengeVerification[] = ["Honor", "Photo", "Auto"];

export function ChallengeForm({ initial, orgId, redirectTo }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [targetAudience, setTargetAudience] = useState(
    initial?.target_audience ?? "all"
  );
  const [points, setPoints] = useState(String(initial?.points_reward ?? 50));
  const [duration, setDuration] = useState(String(initial?.duration_days ?? 7));
  const [verification, setVerification] = useState<ChallengeVerification>(
    initial?.verification_method ?? "Honor"
  );
  const [status, setStatus] = useState<ChallengeStatus>(initial?.status ?? "Draft");
  const [startDate, setStartDate] = useState(
    () => initial?.start_date ?? new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    () =>
      initial?.end_date ??
      new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  );
  const [requiredCount, setRequiredCount] = useState(
    String(((initial?.rules ?? {}) as Record<string, unknown>).required_count ?? 1)
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let finalImageUrl = imageUrl;
      
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadRes = await uploadChallengeImageAction(formData);
        if (uploadRes.error || !uploadRes.url) {
          setError(uploadRes.error ?? "Failed to upload image");
          return;
        }
        finalImageUrl = uploadRes.url;
      }

      const input: UpsertChallengeInput = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        image_url: finalImageUrl || undefined,
        target_audience: targetAudience,
        points_reward: Number(points) || 0,
        duration_days: Number(duration) || 1,
        verification_method: verification,
        status,
        start_date: startDate,
        end_date: endDate,
        org_id: orgId ?? null,
        rules: { required_count: Number(requiredCount) || 1 },
      };

      const res = await upsertChallengeAction({
        id: initial?.id,
        input,
      });
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
        <Field label={t("admin.challengeForm.name")}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.category")}>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.targetAudience")}>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.pointsReward")}>
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.duration")}>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.requiredActivities")}>
          <input
            type="number"
            min={1}
            value={requiredCount}
            onChange={(e) => setRequiredCount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.verification")}>
          <select
            value={verification}
            onChange={(e) =>
              setVerification(e.target.value as ChallengeVerification)
            }
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {VERIFY.map((v) => (
              <option key={v} value={v}>
                {t(`admin.challengeForm.verify.${v}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("admin.challengeForm.status")}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ChallengeStatus)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.challengeForm.statusOpt.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("admin.challengeForm.startDate")}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <Field label={t("admin.challengeForm.endDate")}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("admin.challengeForm.description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
            />
          </Field>
        </div>
        
        <div className="md:col-span-2">
          <Field label={t("admin.challengeForm.coverImage", "Cover Image")}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
          </Field>
          {(file || imageUrl) && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file ? URL.createObjectURL(file) : imageUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}
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
              ? t("admin.challengeForm.saveChallenge")
              : t("admin.challengeForm.createChallenge")}
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
