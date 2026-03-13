"use client";

import { useState } from "react";
import BusinessIcon from "@mui/icons-material/Business";
import { useTranslation } from "react-i18next";
import {
  useCreateOrganization,
  ORG_TYPE_OPTIONS,
} from "@/hooks/useCreateOrganization";
import type { CreateOrganizationInput, OrgType } from "@/types/organization.types";
import { useToast } from "@/components/ui/Toast";

function FieldLabel({ htmlFor, children, required = false }: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[#141514] text-sm font-medium leading-5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-600 text-xs mt-1">{message}</p>;
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-[#DAEDD5] bg-white text-[#141514] " +
  "text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] " +
  "focus:ring-2 focus:ring-[#79B669]/20 transition-colors";

interface CreateOrgFormProps {
  userId: string;
  onSuccess?: (org: import("@/types/organization.types").Organization) => void;
  onCancel?: () => void;
}

export function CreateOrgForm({ userId, onSuccess, onCancel }: CreateOrgFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { loading, errors, generalError, handleSubmit, clearErrors } =
    useCreateOrganization();

  const [values, setValues] = useState<CreateOrganizationInput>({
    legal_name: "",
    tax_code: "",
    org_type: "" as OrgType,
  });

  const set = (field: keyof CreateOrganizationInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      clearErrors();
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(values, userId, (org) => {
      showToast(`${t("org.form.title")}: "${org.legal_name}" ✓`, "success");
      onSuccess?.(org);
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
          <BusinessIcon sx={{ fontSize: 20, color: "#1F8505" }} />
        </div>
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold leading-6">
            {t("org.form.title")}
          </h2>
          <p className="text-[#AAAAAA] text-xs">
            {t("form.requiredHint")}
          </p>
        </div>
      </div>

      {generalError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {generalError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="org-name" required>{t("org.form.legalName")}</FieldLabel>
        <input
          id="org-name"
          type="text"
          placeholder={t("org.form.legalNamePlaceholder")}
          value={values.legal_name}
          onChange={set("legal_name")}
          className={inputCls}
          maxLength={200}
        />
        <FieldError message={errors.legal_name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="tax-code" required>{t("org.form.taxCode")}</FieldLabel>
        <input
          id="tax-code"
          type="text"
          placeholder={t("org.form.taxCodePlaceholder")}
          value={values.tax_code}
          onChange={set("tax_code")}
          className={inputCls}
          maxLength={50}
        />
        <FieldError message={errors.tax_code} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="org-type" required>{t("org.form.type")}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {ORG_TYPE_OPTIONS.map(({ value, labelKey }) => {
            const active = values.org_type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setValues((prev) => ({ ...prev, org_type: value })); clearErrors(); }}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "border-[#1F8505] bg-[#f0f9ed] text-[#1F8505]"
                    : "border-[#DAEDD5] text-[#3B3D3B] hover:border-[#79B669]"
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
        <FieldError message={errors.org_type} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("common.creating") : t("org.form.title")}
        </button>
      </div>
    </form>
  );
}
