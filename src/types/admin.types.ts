export interface PlatformMetrics {
  totalOrgs: number;
  activeUsers: number;
  totalEmissionLogs: number;
  totalCo2eKg: number;
  monthlyRevenueUsd: number;
  pendingContactMessages: number;
  openIssuesCount: number;
}

export interface GrowthBucket {
  month: string;
  newUsers: number;
  newOrganizations: number;
  newEmissionLogs: number;
}

export interface SectorTotal {
  industry: string;
  total_co2e_kg: number;
  org_count: number;
}

// Re-use canonical enums from the org types module instead of re-declaring
// string fields here. Drift between the two definitions was the original
// concern raised in REVIEW.md type-safety §.
import type {
  MemberStatus,
  OrgType,
  OrgVerificationStatus,
} from "@/types/organization.types";

export interface AdminOrganizationRow {
  id: string;
  legal_name: string | null;
  tax_code: string | null;
  org_type: OrgType | null;
  industry: string | null;
  contact_email: string | null;
  verification_status: OrgVerificationStatus | null;
  created_at: string;
  member_count: number;
  active_subscription: string | null;
}

export interface AdminOrganizationDetail {
  org: AdminOrganizationRow;
  members: Array<{
    user_id: string;
    email: string;
    full_name: string | null;
    role_id: string;
    status: MemberStatus;
  }>;
  recentLogs: Array<{
    id: string;
    activity_name: string;
    scope: string;
    co2e_result: number | null;
    status: string;
    reporting_date: string;
  }>;
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    amount: number;
    status: string;
    issue_date: string;
  }>;
  recentAudits: Array<{
    id: string;
    action: string;
    actor_user_id: string | null;
    status: string;
    created_at: string;
  }>;
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: "new" | "read" | "archived" | "spam";
  ip_address: string | null;
  created_at: string;
}
