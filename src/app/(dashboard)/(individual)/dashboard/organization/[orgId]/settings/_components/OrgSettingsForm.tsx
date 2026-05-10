"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { updateOrgAction } from "@/app/actions/org-admin.actions";
import type {
  OrgType,
  Organization,
  UpdateOrganizationInput,
} from "@/types/organization.types";

const ORG_TYPES: OrgType[] = ["Enterprise", "SMB", "NGO", "Startup"];

export function OrgSettingsForm({ org }: { org: Organization }) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateOrganizationInput>({
    legal_name: org.legal_name ?? "",
    org_type: (org.org_type as OrgType) ?? "SMB",
    industry: org.industry ?? "",
    website_url: org.website_url ?? "",
    address: org.address ?? "",
    contact_email: org.contact_email ?? "",
    logo_url: org.logo_url ?? "",
  });

  const handleChange = <K extends keyof UpdateOrganizationInput>(
    key: K,
    value: UpdateOrganizationInput[K]
  ) => setForm((s) => ({ ...s, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    startTransition(async () => {
      const res = await updateOrgAction(org.id, form);
      if (res.error) setStatusMsg(`error.${res.error}`);
      else setStatusMsg("org.settings.saved");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#DAEDD5] p-6 max-w-3xl space-y-4"
    >
      <h2 className="text-[#155A03] text-lg font-semibold">
        {t("org.settings.heading")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t("org.settings.legalName")}>
          <input
            type="text"
            value={form.legal_name ?? ""}
            onChange={(e) => handleChange("legal_name", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            maxLength={200}
          />
        </Field>

        <Field label={t("org.settings.taxCode")}>
          <input
            type="text"
            value={org.tax_code ?? ""}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-gray-50 text-sm"
          />
        </Field>

        <Field label={t("org.settings.orgType")}>
          <select
            value={form.org_type ?? "SMB"}
            onChange={(e) =>
              handleChange("org_type", e.target.value as OrgType)
            }
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm bg-white"
          >
            {ORG_TYPES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("org.settings.industry")}>
          <input
            type="text"
            value={form.industry ?? ""}
            onChange={(e) => handleChange("industry", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            maxLength={100}
          />
        </Field>

        <Field label={t("org.settings.contactEmail")}>
          <input
            type="email"
            value={form.contact_email ?? ""}
            onChange={(e) => handleChange("contact_email", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            maxLength={320}
          />
        </Field>

        <Field label={t("org.settings.website")}>
          <input
            type="url"
            value={form.website_url ?? ""}
            onChange={(e) => handleChange("website_url", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
            placeholder="https://"
          />
        </Field>

        <div className="md:col-span-2">
          <Field label={t("org.settings.address")}>
            <textarea
              value={form.address ?? ""}
              onChange={(e) => handleChange("address", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm resize-none"
              maxLength={500}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label={t("org.settings.logoUrl")}>
            <input
              type="url"
              value={form.logo_url ?? ""}
              onChange={(e) => handleChange("logo_url", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm"
              placeholder="https://"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-4">
        {statusMsg ? (
          <p
            className={`text-sm ${
              statusMsg === "org.settings.saved"
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {t(statusMsg, { defaultValue: statusMsg })}
          </p>
        ) : (
          <span className="text-xs text-[#AAAAAA]">
            {t("org.settings.verificationStatus")}: <b>{org.verification_status ?? "Pending"}</b>
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-[#155A03] text-white rounded-lg text-sm font-medium hover:bg-[#0e4302] disabled:opacity-50"
        >
          {pending ? t("common.creating") : t("settings.profile.save")}
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
