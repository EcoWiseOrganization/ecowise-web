/**
 * Server-only system metrics service (Phase 10 — UC-47).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { bucketByMonth } from "@/lib/admin-metrics";
import type {
  EmissionLogStatusCounts,
  GrowthBucket,
  PlatformMetrics,
  ScopeTotal,
  SectorTotal,
  SubscriptionMix,
} from "@/types/admin.types";

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const db = createServiceClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const isoMonth = monthStart.toISOString();

  const [
    { count: totalOrgs },
    { count: activeUsers },
    { count: totalEmissionLogs },
    { data: logsAgg },
    { data: monthlyInvoices },
    { count: pendingMessages },
    { count: openIssues },
  ] = await Promise.all([
    db.from("Organization").select("id", { count: "exact", head: true }),
    db
      .from("User")
      .select("id", { count: "exact", head: true })
      .neq("status", "deleted"),
    db.from("EmissionLogs").select("id", { count: "exact", head: true }),
    db.from("EmissionLogs").select("co2e_result"),
    db
      .from("Invoices")
      .select("amount")
      .eq("status", "Paid")
      .gte("paid_at", isoMonth),
    db
      .from("ContactMessages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("EmissionLogs")
      .select("id", { count: "exact", head: true })
      .in("status", ["Pending", "Review"]),
  ]);

  const totalCo2eKg = ((logsAgg ?? []) as Array<{ co2e_result: number | null }>)
    .reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);
  const monthlyRevenueUsd = ((monthlyInvoices ?? []) as Array<{ amount: number }>)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return {
    totalOrgs: totalOrgs ?? 0,
    activeUsers: activeUsers ?? 0,
    totalEmissionLogs: totalEmissionLogs ?? 0,
    totalCo2eKg,
    monthlyRevenueUsd,
    pendingContactMessages: pendingMessages ?? 0,
    openIssuesCount: openIssues ?? 0,
  };
}

export async function getGrowthTrends(
  months: number = 12
): Promise<GrowthBucket[]> {
  const db = createServiceClient();
  const horizon = new Date();
  horizon.setUTCMonth(horizon.getUTCMonth() - months);
  horizon.setUTCDate(1);
  const since = horizon.toISOString();

  const [users, orgs, logs] = await Promise.all([
    db.from("User").select("created_at").gte("created_at", since),
    db.from("Organization").select("created_at").gte("created_at", since),
    db.from("EmissionLogs").select("created_at").gte("created_at", since),
  ]);

  const rows = [
    ...((users.data ?? []) as Array<{ created_at: string }>).map((r) => ({
      created_at: r.created_at,
      kind: "newUsers" as const,
    })),
    ...((orgs.data ?? []) as Array<{ created_at: string }>).map((r) => ({
      created_at: r.created_at,
      kind: "newOrganizations" as const,
    })),
    ...((logs.data ?? []) as Array<{ created_at: string }>).map((r) => ({
      created_at: r.created_at,
      kind: "newEmissionLogs" as const,
    })),
  ];

  return bucketByMonth({ months, rows });
}

export async function getEmissionsBySector(): Promise<SectorTotal[]> {
  const db = createServiceClient();
  const { data: orgs } = await db
    .from("Organization")
    .select("id, industry");
  const orgList = (orgs ?? []) as Array<{ id: string; industry: string | null }>;

  if (orgList.length === 0) return [];

  const { data: logs } = await db
    .from("EmissionLogs")
    .select("org_id, co2e_result")
    .not("org_id", "is", null);
  const logList = (logs ?? []) as Array<{
    org_id: string;
    co2e_result: number | null;
  }>;

  const totals = new Map<string, { co2: number; orgs: Set<string> }>();
  for (const o of orgList) {
    const key = o.industry?.trim() || "Unspecified";
    if (!totals.has(key)) totals.set(key, { co2: 0, orgs: new Set() });
    totals.get(key)!.orgs.add(o.id);
  }
  const orgToIndustry = new Map(orgList.map((o) => [o.id, o.industry?.trim() || "Unspecified"]));
  for (const l of logList) {
    const key = orgToIndustry.get(l.org_id) ?? "Unspecified";
    const t = totals.get(key);
    if (!t) continue;
    t.co2 += Number(l.co2e_result) || 0;
  }
  return Array.from(totals.entries())
    .sort(([, a], [, b]) => b.co2 - a.co2)
    .map(([industry, v]) => ({
      industry,
      total_co2e_kg: Math.round(v.co2 * 100) / 100,
      org_count: v.orgs.size,
    }));
}

/**
 * Emissions split by GHG scope (Scope 1/2/3). Includes both personal and
 * org-owned logs so the chart matches "total CO₂e tracked" on the dashboard.
 */
export async function getEmissionsByScope(): Promise<ScopeTotal[]> {
  const db = createServiceClient();
  const { data } = await db.from("EmissionLogs").select("scope, co2e_result");

  const rows = (data ?? []) as Array<{
    scope: ScopeTotal["scope"];
    co2e_result: number | null;
  }>;

  const buckets = new Map<ScopeTotal["scope"], ScopeTotal>([
    ["Scope 1", { scope: "Scope 1", log_count: 0, total_co2e_kg: 0 }],
    ["Scope 2", { scope: "Scope 2", log_count: 0, total_co2e_kg: 0 }],
    ["Scope 3", { scope: "Scope 3", log_count: 0, total_co2e_kg: 0 }],
  ]);
  for (const r of rows) {
    const b = buckets.get(r.scope);
    if (!b) continue;
    b.log_count += 1;
    b.total_co2e_kg += Number(r.co2e_result) || 0;
  }
  for (const b of buckets.values()) {
    b.total_co2e_kg = Math.round(b.total_co2e_kg * 100) / 100;
  }
  return Array.from(buckets.values());
}

/**
 * Counts of EmissionLogs in each lifecycle state — surfaces how much data is
 * waiting on the admin's attention vs already locked.
 */
export async function getEmissionLogStatusCounts(): Promise<EmissionLogStatusCounts> {
  const db = createServiceClient();
  const counters = await Promise.all(
    (["Pending", "Review", "Verified", "Published", "Exported"] as const).map(
      (status) =>
        db
          .from("EmissionLogs")
          .select("id", { count: "exact", head: true })
          .eq("status", status)
    )
  );
  const [pending, review, verified, published, exported] = counters.map(
    (r) => r.count ?? 0
  );
  return { pending, review, verified, published, exported };
}

/**
 * Snapshot of platform subscription health: total active subjects plus a
 * breakdown by plan name. Used for the "Subscription mix" chart.
 */
export async function getSubscriptionMix(): Promise<SubscriptionMix> {
  const db = createServiceClient();
  const { data } = await db
    .from("Subscriptions")
    .select("plan_id, SubscriptionPlans!inner(plan_name)")
    .eq("status", "Active");

  const rows = (data ?? []) as Array<{
    plan_id: string;
    SubscriptionPlans: { plan_name: string } | { plan_name: string }[] | null;
  }>;

  const counts = new Map<string, number>();
  for (const r of rows) {
    const planRel = Array.isArray(r.SubscriptionPlans)
      ? r.SubscriptionPlans[0]
      : r.SubscriptionPlans;
    const name = planRel?.plan_name ?? "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const byPlan = Array.from(counts.entries())
    .map(([plan_name, count]) => ({ plan_name, count }))
    .sort((a, b) => b.count - a.count);

  return { byPlan, totalActive: rows.length };
}
