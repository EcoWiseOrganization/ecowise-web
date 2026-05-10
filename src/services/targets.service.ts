/**
 * Server-only carbon-target helpers (Phase 4 — UC-15, UC-19).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { targetProgress } from "@/lib/targets";
import type {
  CarbonTarget,
  CarbonTargetWithProgress,
  CreateCarbonTargetInput,
} from "@/types/target.types";

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function listMyTargets(userId: string): Promise<CarbonTarget[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("CarbonTargets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CarbonTarget[];
}

export async function getActiveTarget(
  userId: string
): Promise<CarbonTarget | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("CarbonTargets")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CarbonTarget) ?? null;
}

export async function createPersonalTarget(
  userId: string,
  input: CreateCarbonTargetInput
): Promise<CarbonTarget> {
  if (input.target_co2e > input.baseline_co2e) {
    // Allow but warn — targets are reductions; if user enters target > baseline
    // they likely mis-entered. Reject for clarity.
    throw new Error("INVALID_TARGET_GTE_BASELINE");
  }

  // Mark any existing Active targets as Archived to enforce single active.
  const db = createServiceClient();
  await db
    .from("CarbonTargets")
    .update({ status: "Archived" })
    .eq("user_id", userId)
    .eq("status", "Active");

  const { data, error } = await db
    .from("CarbonTargets")
    .insert({
      user_id: userId,
      org_id: null,
      name: input.name.trim(),
      baseline_co2e: input.baseline_co2e,
      target_co2e: input.target_co2e,
      start_date: input.start_date,
      end_date: input.end_date,
      notes: input.notes ?? null,
      status: "Active",
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CarbonTarget;
}

export async function archiveTarget(userId: string, id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("CarbonTargets")
    .update({ status: "Archived" })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Progress (UC-15) ──────────────────────────────────────────────────────

/**
 * Returns the active target plus computed progress fields. Pulls aggregated
 * CO₂e from EmissionLogs inside the target window (personal logs only).
 */
export async function getActiveTargetWithProgress(
  userId: string,
  now: Date = new Date()
): Promise<CarbonTargetWithProgress | null> {
  const target = await getActiveTarget(userId);
  if (!target) return null;

  const db = createServiceClient();
  const { data } = await db
    .from("EmissionLogs")
    .select("co2e_result")
    .is("org_id", null)
    .eq("created_by", userId)
    .gte("reporting_date", target.start_date)
    .lte("reporting_date", target.end_date);

  const current = ((data ?? []) as Array<{ co2e_result: number | null }>).reduce(
    (s, r) => s + (Number(r.co2e_result) || 0),
    0
  );

  const p = targetProgress({
    baseline: Number(target.baseline_co2e),
    target: Number(target.target_co2e),
    current,
    startDate: new Date(target.start_date),
    endDate: new Date(target.end_date),
    now,
  });

  return {
    ...target,
    current_co2e: current,
    elapsed_days: p.elapsedDays,
    total_days: p.totalDays,
    progress_pct: p.progressPct,
    on_track: p.onTrack,
  };
}

// ── Period comparison (UC-19) ─────────────────────────────────────────────

export async function getPersonalPeriodTotal(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ total: number; logCount: number }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionLogs")
    .select("co2e_result")
    .is("org_id", null)
    .eq("created_by", userId)
    .gte("reporting_date", startDate)
    .lte("reporting_date", endDate);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ co2e_result: number | null }>;
  return {
    total: rows.reduce((s, r) => s + (Number(r.co2e_result) || 0), 0),
    logCount: rows.length,
  };
}
