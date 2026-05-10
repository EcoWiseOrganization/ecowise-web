/**
 * Pure aggregator helpers (Phase 6). Used to shape raw EmissionLogs rows
 * into the report data structures consumed by the PDF / XLSX / CSV builders.
 *
 * No I/O — easy to unit-test.
 */

import type {
  CategoryTotal,
  ComplianceChecklistItem,
  EmissionReportData,
  MonthlyTotal,
  ReportLogRow,
} from "@/types/report.types";

export interface RawLogRow {
  id: string;
  activity_name: string;
  scope: "Scope 1" | "Scope 2" | "Scope 3";
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result: number | null;
  status: string;
  category_name: string | null;
  created_by_email: string | null;
}

export function buildSummary(rows: RawLogRow[]) {
  const totalCo2eKg = rows.reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);
  const scope1Kg = rows
    .filter((r) => r.scope === "Scope 1")
    .reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);
  const scope2Kg = rows
    .filter((r) => r.scope === "Scope 2")
    .reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);
  const scope3Kg = rows
    .filter((r) => r.scope === "Scope 3")
    .reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);

  const logCount = rows.length;
  const verifiedCount = rows.filter(
    (r) => r.status === "Verified" || r.status === "Published" || r.status === "Exported"
  ).length;
  const pendingCount = rows.filter(
    (r) => r.status === "Pending" || r.status === "Review"
  ).length;
  const completenessPct =
    logCount === 0 ? 0 : Math.round((verifiedCount / logCount) * 100);

  return {
    totalCo2eKg: round2(totalCo2eKg),
    scope1Kg: round2(scope1Kg),
    scope2Kg: round2(scope2Kg),
    scope3Kg: round2(scope3Kg),
    logCount,
    verifiedCount,
    pendingCount,
    completenessPct,
  };
}

export function buildMonthlyTrend(rows: RawLogRow[]): MonthlyTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const month = (r.reporting_date ?? "").slice(0, 7);
    if (!month) continue;
    const cur = map.get(month) ?? { total: 0, count: 0 };
    cur.total += Number(r.co2e_result) || 0;
    cur.count += 1;
    map.set(month, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      total_co2e_kg: round2(v.total),
      log_count: v.count,
    }));
}

export function buildCategoryShares(rows: RawLogRow[]): CategoryTotal[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const co2 = Number(r.co2e_result) || 0;
    total += co2;
    const name = r.category_name?.trim() || "Other";
    map.set(name, (map.get(name) ?? 0) + co2);
  }
  if (total === 0) return [];
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, co2]) => ({
      name,
      co2e_kg: round2(co2),
      share_pct: Math.round((co2 / total) * 1000) / 10,
    }));
}

export function buildLogRows(rows: RawLogRow[]): ReportLogRow[] {
  return rows.map((r) => ({
    id: r.id,
    activity_name: r.activity_name,
    scope: r.scope,
    reporting_date: r.reporting_date,
    quantity: Number(r.quantity) || 0,
    unit: r.unit,
    co2e_result: round2(Number(r.co2e_result) || 0),
    status: r.status,
    category: r.category_name,
    created_by_email: r.created_by_email,
  }));
}

/** GHG Protocol minimal compliance checklist (Phase 6 v1). */
export function buildGhgChecklist(
  data: EmissionReportData
): ComplianceChecklistItem[] {
  const hasScope1Data = data.summary.scope1Kg > 0;
  const hasScope2Data = data.summary.scope2Kg > 0;
  const hasScope3Data = data.summary.scope3Kg > 0;
  const dataCompleteness = data.summary.completenessPct >= 80;

  return [
    {
      id: "scope1",
      labelKey: "compliance.checklist.scope1",
      passed: hasScope1Data,
    },
    {
      id: "scope2",
      labelKey: "compliance.checklist.scope2",
      passed: hasScope2Data,
    },
    {
      id: "scope3",
      labelKey: "compliance.checklist.scope3",
      passed: hasScope3Data,
    },
    {
      id: "completeness",
      labelKey: "compliance.checklist.completeness",
      passed: dataCompleteness,
    },
    {
      id: "frozen",
      labelKey: "compliance.checklist.frozen",
      passed: true, // BR-06 enforced at DB level
    },
    {
      id: "audit",
      labelKey: "compliance.checklist.audit",
      passed: true, // BR-16 enforced at DB level
    },
  ];
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
