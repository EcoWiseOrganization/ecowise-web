export type ReportFormat = "pdf" | "xlsx" | "csv";
export type ReportKind = "emission_summary" | "compliance" | "personal";
export type ReportLanguage = "en" | "vi";
export type ComplianceRegulation = "GHG_PROTOCOL" | "GRI" | "TCFD";

export interface ReportPeriod {
  start: string; // ISO YYYY-MM-DD inclusive
  end: string; // ISO YYYY-MM-DD inclusive
}

export interface ReportLogRow {
  id: string;
  activity_name: string;
  scope: string;
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result: number;
  status: string;
  category: string | null;
  created_by_email: string | null;
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  total_co2e_kg: number;
  log_count: number;
}

export interface CategoryTotal {
  name: string;
  co2e_kg: number;
  share_pct: number;
}

export interface EmissionReportData {
  org: {
    id: string;
    legal_name: string;
    org_type: string | null;
    industry: string | null;
  };
  period: ReportPeriod;
  language: ReportLanguage;
  generatedAt: string; // ISO timestamp
  generatedBy: string | null;
  summary: {
    totalCo2eKg: number;
    scope1Kg: number;
    scope2Kg: number;
    scope3Kg: number;
    logCount: number;
    verifiedCount: number;
    pendingCount: number;
    completenessPct: number;
  };
  monthlyTrend: MonthlyTotal[];
  byCategory: CategoryTotal[];
  logs: ReportLogRow[];
}

export interface ComplianceChecklistItem {
  id: string;
  labelKey: string;
  passed: boolean;
  detailKey?: string;
}

export interface ComplianceReportData extends EmissionReportData {
  regulation: ComplianceRegulation;
  checklist: ComplianceChecklistItem[];
}

export interface PersonalReportData {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  period: ReportPeriod;
  language: ReportLanguage;
  generatedAt: string;
  summary: {
    totalCo2eKg: number;
    scope1Kg: number;
    scope2Kg: number;
    scope3Kg: number;
    logCount: number;
  };
  monthlyTrend: MonthlyTotal[];
  byCategory: CategoryTotal[];
  logs: ReportLogRow[];
}

export interface ReportArchive {
  id: string;
  org_id: string | null;
  user_id: string | null;
  kind: ReportKind;
  format: ReportFormat;
  storage_path: string;
  period_start: string | null;
  period_end: string | null;
  total_co2e_kg: number | null;
  log_count: number | null;
  created_at: string;
  created_by: string | null;
}
