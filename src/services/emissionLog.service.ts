/**
 * emissionLog.service.ts
 * Client-side Supabase CRUD for "EmissionLogs".
 * Uses the anon/user client — RLS policies apply.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  EmissionLog,
  EmissionLogWithCategory,
  CreateEmissionLogInput,
  EmissionLogFilters,
  EmissionLogStats,
} from "@/types/emission-log.types";

// ── Create ────────────────────────────────────────────────────────────────

export async function createEmissionLog(
  input: CreateEmissionLogInput
): Promise<{ data: EmissionLog | null; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("EmissionLogs")
    .insert({ ...input, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as EmissionLog, error: null };
}

// ── Evidence file upload ───────────────────────────────────────────────────

export async function uploadEvidence(
  file: File,
  orgId: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${orgId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("emission-evidence")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { url: null, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("emission-evidence").getPublicUrl(path);

  return { url: publicUrl, error: null };
}

// ── Read (paginated + filtered) ───────────────────────────────────────────

export async function getEmissionLogs(
  orgId: string,
  filters: EmissionLogFilters = {}
): Promise<{ data: EmissionLogWithCategory[]; count: number; error: string | null }> {
  const supabase = createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 15;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("EmissionLogs")
    .select(`*, category:EmissionCategories(id, name, scope)`, { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.scope) query = query.eq("scope", filters.scope);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("activity_name", `%${filters.search}%`);
  if (filters.startDate) query = query.gte("reporting_date", filters.startDate);
  if (filters.endDate) query = query.lte("reporting_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return {
    data: (data ?? []) as unknown as EmissionLogWithCategory[],
    count: count ?? 0,
    error: null,
  };
}

// ── Stats for this month ──────────────────────────────────────────────────

export async function getEmissionLogStats(orgId: string): Promise<EmissionLogStats> {
  const supabase = createClient();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data } = await supabase
    .from("EmissionLogs")
    .select("status, co2e_result")
    .eq("org_id", orgId)
    .gte("reporting_date", firstOfMonth);

  if (!data) return { totalEmissions: 0, pendingReviews: 0, verifiedActivities: 0 };

  return {
    totalEmissions: data.reduce((sum, r) => sum + (Number(r.co2e_result) || 0), 0),
    pendingReviews: data.filter((r) => r.status === "Pending" || r.status === "Review").length,
    verifiedActivities: data.filter((r) => r.status === "Verified").length,
  };
}
