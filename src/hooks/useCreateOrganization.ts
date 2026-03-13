"use client";

import { useState } from "react";
import { createOrganizationAction } from "@/app/actions/organization.actions";
import type { CreateOrganizationInput } from "@/services/organizationService";
import type { Organization, OrgType } from "@/types/database.types";

// ── Validation ───────────────────────────────────────────────────

export interface OrgFormErrors {
  name?: string;
  tax_code?: string;
  industry?: string;
  org_type?: string;
}

function validate(values: CreateOrganizationInput): OrgFormErrors {
  const errors: OrgFormErrors = {};

  // MSG01: required field validation
  if (!values.name.trim()) {
    errors.name = "MSG01: Registered Legal Name is required.";
  }
  if (!values.tax_code.trim()) {
    errors.tax_code = "MSG01: Tax or Registration Code is required.";
  }
  if (!values.industry) {
    errors.industry = "MSG01: Please select an industry sector.";
  }
  if (!values.org_type) {
    errors.org_type = "MSG01: Please select an organization type.";
  }

  return errors;
}

// ── Hook ─────────────────────────────────────────────────────────

interface UseCreateOrganizationReturn {
  loading: boolean;
  errors: OrgFormErrors;
  generalError: string;
  handleSubmit: (
    values: CreateOrganizationInput,
    userId: string,
    onSuccess?: (org: Organization) => void
  ) => Promise<void>;
  clearErrors: () => void;
}

export function useCreateOrganization(): UseCreateOrganizationReturn {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<OrgFormErrors>({});
  const [generalError, setGeneralError] = useState("");

  const clearErrors = () => {
    setErrors({});
    setGeneralError("");
  };

  const handleSubmit = async (
    values: CreateOrganizationInput,
    _userId: string,
    onSuccess?: (org: Organization) => void
  ) => {
    // 1. Client-side validation
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setGeneralError("");

    // 2. Call Server Action — auth.uid() is always set server-side
    const { data: org, error: actionError } = await createOrganizationAction(values);

    if (actionError || !org) {
      setGeneralError(actionError ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // 3. Notify caller (typically shows toast + closes modal)
    onSuccess?.(org);
    setLoading(false);
  };

  return { loading, errors, generalError, handleSubmit, clearErrors };
}

// ── Constants used by the form UI ────────────────────────────────

export const INDUSTRY_OPTIONS = [
  "Logistics & Transportation",
  "Technology & Software",
  "Manufacturing",
  "Finance & Banking",
  "Healthcare",
  "Energy & Utilities",
  "Retail & E-commerce",
  "Construction & Real Estate",
  "Agriculture",
  "Other",
] as const;

export const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: "Enterprise", label: "Enterprise" },
  { value: "SMB",        label: "Small & Medium Business (SMB)" },
  { value: "NGO",        label: "Non-Governmental Organization (NGO)" },
  { value: "Startup",    label: "Startup" },
];
