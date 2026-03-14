import type { EmissionCategory } from "./sustainability";

export type EmissionLogStatus = "Pending" | "Review" | "Verified";
export type GhgScope = "Scope 1" | "Scope 2" | "Scope 3";

export interface EmissionLog {
  id: string;
  org_id: string;
  activity_name: string;
  scope: GhgScope;
  source_type_id: string | null;
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result: number | null;
  status: EmissionLogStatus;
  evidence_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EmissionLogWithCategory extends EmissionLog {
  category: Pick<EmissionCategory, "id" | "name" | "scope"> | null;
}

export interface CreateEmissionLogInput {
  org_id: string;
  activity_name: string;
  scope: GhgScope;
  source_type_id?: string;
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result?: number;
  status?: EmissionLogStatus;
  evidence_url?: string;
}

export interface EmissionLogFilters {
  scope?: GhgScope | "";
  status?: EmissionLogStatus | "";
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface EmissionLogStats {
  totalEmissions: number;
  pendingReviews: number;
  verifiedActivities: number;
}
