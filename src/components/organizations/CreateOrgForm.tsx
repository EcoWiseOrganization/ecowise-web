"use client";

/**
 * CreateOrgForm.tsx
 * Form for creating a new organization.
 * Validates required fields (MSG01) and calls useCreateOrganization hook.
 */

import { useState } from "react";
import BusinessIcon from "@mui/icons-material/Business";
import {
  useCreateOrganization,
  INDUSTRY_OPTIONS,
  ORG_TYPE_OPTIONS,
} from "@/hooks/useCreateOrganization";
import type { CreateOrganizationInput } from "@/services/organizationService";
import type { OrgType } from "@/types/database.types";
import { useToast } from "@/components/ui/Toast";

// ── Shared sub-components ────────────────────────────────────────

function FieldLabel({ htmlFor, children, required = false }: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[#141514] text-sm font-medium leading-5"
    >
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

const selectCls = inputCls + " cursor-pointer appearance-none";

// ── Props ────────────────────────────────────────────────────────

interface CreateOrgFormProps {
  /** auth.uid() of the currently logged-in user */
  userId: string;
  /** Called after successful creation with the new org */
  onSuccess?: (org: import("@/types/database.types").Organization) => void;
  /** Called when the user clicks Cancel */
  onCancel?: () => void;
}

// ── Component ────────────────────────────────────────────────────

export function CreateOrgForm({ userId, onSuccess, onCancel }: CreateOrgFormProps) {
  const { showToast } = useToast();
  const { loading, errors, generalError, handleSubmit, clearErrors } =
    useCreateOrganization();

  const [values, setValues] = useState<CreateOrganizationInput>({
    name: "",
    tax_code: "",
    industry: "",
    org_type: "" as OrgType,
  });

  const set = (field: keyof CreateOrganizationInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      clearErrors();
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(values, userId, (org) => {
      showToast(`Organization "${org.name}" created successfully.`, "success");
      onSuccess?.(org);
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* Form header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f0f9ed] flex items-center justify-center shrink-0">
          <BusinessIcon sx={{ fontSize: 20, color: "#1F8505" }} />
        </div>
        <div>
          <h2 className="text-[#155A03] text-lg font-semibold leading-6">
            Create Organization
          </h2>
          <p className="text-[#AAAAAA] text-xs">
            Fields marked <span className="text-red-500">*</span> are required.
          </p>
        </div>
      </div>

      {/* General error banner */}
      {generalError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {generalError}
        </div>
      )}

      {/* Registered Legal Name */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="org-name" required>
          Registered Legal Name
        </FieldLabel>
        <input
          id="org-name"
          type="text"
          placeholder="e.g. EcoWise Technology Co., Ltd."
          value={values.name}
          onChange={set("name")}
          className={inputCls}
          maxLength={200}
        />
        <FieldError message={errors.name} />
      </div>

      {/* Tax / Registration Code */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="tax-code" required>
          Tax or Registration Code
        </FieldLabel>
        <input
          id="tax-code"
          type="text"
          placeholder="e.g. 0123456789"
          value={values.tax_code}
          onChange={set("tax_code")}
          className={inputCls}
          maxLength={50}
        />
        <FieldError message={errors.tax_code} />
      </div>

      {/* Industry Sector */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="industry" required>
          Primary Industry Sector
        </FieldLabel>
        <div className="relative">
          <select
            id="industry"
            value={values.industry}
            onChange={set("industry")}
            className={selectCls}
          >
            <option value="" disabled>
              — Select industry —
            </option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#79B669]">
            ▾
          </span>
        </div>
        <FieldError message={errors.industry} />
      </div>

      {/* Organization Type */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="org-type" required>
          Organization Type
        </FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {ORG_TYPE_OPTIONS.map(({ value, label }) => {
            const active = values.org_type === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setValues((prev) => ({ ...prev, org_type: value }));
                  clearErrors();
                }}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  active
                    ? "border-[#1F8505] bg-[#f0f9ed] text-[#1F8505]"
                    : "border-[#DAEDD5] text-[#3B3D3B] hover:border-[#79B669]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <FieldError message={errors.org_type} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-5 py-2.5 rounded-xl border border-[#DAEDD5] text-[#3B3D3B] text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-5 py-2.5 rounded-xl bg-[linear-gradient(270deg,#79B669_0%,#1F8505_100%)] text-white text-sm font-semibold hover:brightness-110 hover:shadow-[0_4px_12px_rgba(31,133,5,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Creating…" : "Create Organization"}
        </button>
      </div>
    </form>
  );
}
