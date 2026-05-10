"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";
import type {
  SustainabilityStats,
  UpdateProfileInput,
  User,
} from "@/types/user.types";

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-800",
  Silver: "bg-gray-200 text-gray-800",
  Gold: "bg-yellow-100 text-yellow-800",
  Platinum: "bg-violet-100 text-violet-800",
};

export function ProfileForm() {
  const { t } = useTranslation();
  const { user, stats, loading, error, saving, uploading, update, uploadAvatar } =
    useProfile();

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-[#B8D6B0] p-12 text-center text-sm text-[#6E726E]">
        {t("common.loading")}
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-white rounded-3xl border border-red-200 p-6 text-sm text-red-700">
        {t(`error.${error ?? "unknown"}`, {
          defaultValue: error ?? "Unknown error",
        })}
      </div>
    );
  }

  // Re-mount the editable form whenever the user id changes so initial values
  // come from the latest data without a setState-in-effect anti-pattern.
  return (
    <EditableForm
      key={user.id}
      user={user}
      stats={stats}
      saving={saving}
      uploading={uploading}
      onSave={update}
      onUploadAvatar={uploadAvatar}
    />
  );
}

interface EditableFormProps {
  user: User;
  stats: SustainabilityStats | null;
  saving: boolean;
  uploading: boolean;
  onSave: (input: UpdateProfileInput) => Promise<{ ok: boolean; error: string | null }>;
  onUploadAvatar: (file: File) => Promise<{ ok: boolean; error: string | null }>;
}

function EditableForm({
  user,
  stats,
  saving,
  uploading,
  onSave,
  onUploadAvatar,
}: EditableFormProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [userName, setUserName] = useState(user.user_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const res = await onSave({ full_name: fullName, user_name: userName, phone, bio });
    if (res.ok) setStatusMsg("settings.profile.saved");
    else setStatusMsg(`error.${res.error ?? "unknown"}`);
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setStatusMsg(null);
    const res = await onUploadAvatar(f);
    if (!res.ok) setStatusMsg(`error.${res.error ?? "unknown"}`);
    e.target.value = "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Avatar + sustainability stats */}
      <aside className="bg-white rounded-3xl border border-[#B8D6B0] p-6 flex flex-col items-center gap-4">
        <div className="relative">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.full_name ?? "Avatar"}
              width={128}
              height={128}
              className="w-32 h-32 rounded-full object-cover border-4 border-[#B8D6B0]"
              unoptimized
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-[#E8F5E2] border-4 border-[#B8D6B0] flex items-center justify-center text-3xl font-semibold text-[#155A03]">
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={handlePickFile}
          disabled={uploading}
          className="text-sm text-[#155A03] hover:underline disabled:opacity-50"
        >
          {uploading ? t("settings.profile.uploading") : t("settings.profile.changeAvatar")}
        </button>

        {stats && (
          <div className="w-full mt-2 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6E726E]">{t("settings.profile.tier")}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  TIER_COLORS[stats.tier] ?? "bg-gray-100"
                }`}
              >
                {stats.tier}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E726E]">{t("settings.profile.greenPoints")}</span>
              <span className="font-medium">{stats.greenPoints.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E726E]">{t("settings.profile.totalLogs")}</span>
              <span className="font-medium">{stats.totalLogs.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E726E]">{t("settings.profile.co2eLogged")}</span>
              <span className="font-medium">
                {stats.totalCo2eKg.toFixed(2)} kg
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Editable form */}
      <form
        onSubmit={handleSave}
        className="lg:col-span-2 bg-white rounded-3xl border border-[#B8D6B0] p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-[#155A03]">
          {t("settings.profile.heading")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t("settings.profile.email")}>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-gray-50 text-sm"
            />
          </Field>
          <Field label={t("settings.profile.userName")}>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
              maxLength={64}
            />
          </Field>
          <Field label={t("settings.profile.fullName")}>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
              maxLength={128}
            />
          </Field>
          <Field label={t("settings.profile.phone")}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
              maxLength={20}
              placeholder="+84..."
            />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("settings.profile.bio")}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {statusMsg ? (
            <p
              className={`text-sm ${
                statusMsg === "settings.profile.saved"
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {t(statusMsg, { defaultValue: statusMsg })}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#155A03] text-white rounded-lg text-sm font-medium hover:bg-[#0e4302] disabled:opacity-50"
          >
            {saving ? t("settings.profile.saving") : t("settings.profile.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[#6E726E] mb-1">{label}</span>
      {children}
    </label>
  );
}
