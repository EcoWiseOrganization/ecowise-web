"use client";

import { useState } from "react";
import { createOrganizationAction } from "@/app/actions/organization.actions";
import type { CreateOrganizationInput } from "@/services/organizationService";
import type { Organization, OrgType } from "@/types/database.types";

// ── Validation ───────────────────────────────────────────────────

export interface OrgFormErrors {
  legal_name?: string;
  tax_code?: string;
  org_type?: string;
}

function validate(values: CreateOrganizationInput): OrgFormErrors {
  const errors: OrgFormErrors = {};

  if (!values.legal_name.trim()) {
    errors.legal_name = "MSG01: Registered Legal Name is required.";
  }
  if (!values.tax_code.trim()) {
    errors.tax_code = "MSG01: Tax or Registration Code is required.";
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
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setGeneralError("");

    const { data: org, error: actionError } = await createOrganizationAction(values);

    if (actionError || !org) {
      setGeneralError(actionError ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    onSuccess?.(org);
    setLoading(false);
  };

  return { loading, errors, generalError, handleSubmit, clearErrors };
}

// ── Constants used by the form UI ────────────────────────────────

export const ORG_TYPE_OPTIONS: { value: OrgType; labelKey: string }[] = [
  { value: "Enterprise", labelKey: "org.type.enterprise" },
  { value: "SMB",        labelKey: "org.type.smb" },
  { value: "NGO",        labelKey: "org.type.ngo" },
  { value: "Startup",    labelKey: "org.type.startup" },
];
