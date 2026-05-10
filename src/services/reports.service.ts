/**
 * Server-only report data service (Phase 6).
 * Loads raw EmissionLogs rows scoped to org or user, joins category names,
 * and shapes the result via pure aggregator helpers.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildCategoryShares,
  buildLogRows,
  buildMonthlyTrend,
  buildSummary,
  type RawLogRow,
} from "@/lib/report-aggregator";
import type {
  EmissionReportData,
  PersonalReportData,
  ReportLanguage,
  ReportPeriod,
} from "@/types/report.types";

interface JoinedLog {
  id: string;
  activity_name: string;
  scope: "Scope 1" | "Scope 2" | "Scope 3";
  reporting_date: string;
  quantity: number;
  unit: string;
  co2e_result: number | null;
  status: string;
  created_by: string | null;
  EmissionCategories: { name: string } | { name: string }[] | null;
}

async function fetchJoinedLogs(opts: {
  orgId?: string | null;
  userId?: string | null;
  period: ReportPeriod;
}): Promise<JoinedLog[]> {
  const db = createServiceClient();
  let query = db
    .from("EmissionLogs")
    .select(
      `id, activity_name, scope, reporting_date, quantity, unit, co2e_result, status, created_by,
       EmissionCategories ( name )`
    )
    .gte("reporting_date", opts.period.start)
    .lte("reporting_date", opts.period.end)
    .order("reporting_date", { ascending: true });

  if (opts.orgId) {
    query = query.eq("org_id", opts.orgId);
  } else if (opts.userId) {
    query = query.is("org_id", null).eq("created_by", opts.userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JoinedLog[];
}

async function resolveEmails(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (userIds.length === 0) return out;
  const db = createServiceClient();
  const { data } = await db
    .from("User")
    .select("id, email")
    .in("id", Array.from(new Set(userIds)));
  for (const r of (data ?? []) as Array<{ id: string; email: string }>) {
    out.set(r.id, r.email);
  }
  return out;
}

function joinedToRaw(rows: JoinedLog[], emailMap: Map<string, string>): RawLogRow[] {
  return rows.map((r) => {
    const cat = Array.isArray(r.EmissionCategories)
      ? r.EmissionCategories[0]
      : r.EmissionCategories;
    return {
      id: r.id,
      activity_name: r.activity_name,
      scope: r.scope,
      reporting_date: r.reporting_date,
      quantity: Number(r.quantity) || 0,
      unit: r.unit,
      co2e_result: r.co2e_result,
      status: r.status,
      category_name: cat?.name ?? null,
      created_by_email: r.created_by ? emailMap.get(r.created_by) ?? null : null,
    };
  });
}

// ── Org emission summary ──────────────────────────────────────────────────

export async function getOrgEmissionReportData(opts: {
  orgId: string;
  period: ReportPeriod;
  language: ReportLanguage;
  generatedBy: string | null;
}): Promise<EmissionReportData> {
  const db = createServiceClient();
  const { data: org, error: orgErr } = await db
    .from("Organization")
    .select("id, legal_name, org_type, industry")
    .eq("id", opts.orgId)
    .single();
  if (orgErr || !org) throw new Error(orgErr?.message ?? "ORG_NOT_FOUND");

  const joined = await fetchJoinedLogs({ orgId: opts.orgId, period: opts.period });
  const emails = await resolveEmails(joined.map((r) => r.created_by ?? "").filter(Boolean));
  const raw = joinedToRaw(joined, emails);

  return {
    org: org as EmissionReportData["org"],
    period: opts.period,
    language: opts.language,
    generatedAt: new Date().toISOString(),
    generatedBy: opts.generatedBy,
    summary: buildSummary(raw),
    monthlyTrend: buildMonthlyTrend(raw),
    byCategory: buildCategoryShares(raw),
    logs: buildLogRows(raw),
  };
}

// ── Personal report ───────────────────────────────────────────────────────

export async function getPersonalReportData(opts: {
  userId: string;
  period: ReportPeriod;
  language: ReportLanguage;
}): Promise<PersonalReportData> {
  const db = createServiceClient();
  const { data: userRow } = await db
    .from("User")
    .select("id, email, full_name")
    .eq("id", opts.userId)
    .single();

  const joined = await fetchJoinedLogs({ userId: opts.userId, period: opts.period });
  const raw = joinedToRaw(joined, new Map());

  return {
    user: {
      id: opts.userId,
      email: (userRow as { email?: string } | null)?.email ?? "",
      full_name: (userRow as { full_name?: string | null } | null)?.full_name ?? null,
    },
    period: opts.period,
    language: opts.language,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(raw),
    monthlyTrend: buildMonthlyTrend(raw),
    byCategory: buildCategoryShares(raw),
    logs: buildLogRows(raw),
  };
}

// ── BR-07 Published lock helper ───────────────────────────────────────────

/**
 * Mark all org logs inside the period as `Published` so subsequent edits are
 * rejected by the BR-07 trigger. Skips rows already in a terminal status.
 */
export async function markOrgLogsPublished(opts: {
  orgId: string;
  period: ReportPeriod;
}): Promise<number> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionLogs")
    .update({ status: "Published" })
    .eq("org_id", opts.orgId)
    .gte("reporting_date", opts.period.start)
    .lte("reporting_date", opts.period.end)
    .in("status", ["Pending", "Review", "Verified"])
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export async function recordReportArchive(opts: {
  orgId?: string | null;
  userId?: string | null;
  kind: "emission_summary" | "compliance" | "personal";
  format: "pdf" | "xlsx" | "csv";
  storage_path: string;
  period: ReportPeriod;
  totalCo2eKg: number;
  logCount: number;
  generatedBy: string | null;
}): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("ReportArchives")
    .insert({
      org_id: opts.orgId ?? null,
      user_id: opts.userId ?? null,
      kind: opts.kind,
      format: opts.format,
      storage_path: opts.storage_path,
      period_start: opts.period.start,
      period_end: opts.period.end,
      total_co2e_kg: opts.totalCo2eKg,
      log_count: opts.logCount,
      created_by: opts.generatedBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function getOrgArchives(orgId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("ReportArchives")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
