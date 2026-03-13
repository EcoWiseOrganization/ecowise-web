"use server";

/**
 * sustainability.actions.ts
 * Server Actions for EmissionFactors and CalculationTemplates management.
 * Uses the service-role client to bypass RLS (admin-only operations are
 * protected at the action level by checking is_admin on the User record).
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  EmissionCategory,
  EmissionFactor,
  EmissionFactorWithCategory,
  CalculationTemplate,
  CalculationTemplateWithRelations,
  CreateEmissionFactorInput,
  CreateCalculationTemplateInput,
} from "@/types/sustainability";

// ── Auth guard ───────────────────────────────────────────────────────────────

/** Throws if the calling user is not a system admin */
async function requireAdmin(): Promise<string> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const db = createServiceClient();
  const { data: profile } = await db
    .from("User")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Insufficient permissions: system_admin required");
  return user.id;
}

// ── EmissionCategories ───────────────────────────────────────────────────────

export async function getEmissionCategoriesAction(): Promise<EmissionCategory[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionCategories")
    .select("*")
    .eq("is_active", true)
    .order("scope")
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as EmissionCategory[];
}

// ── EmissionFactors ──────────────────────────────────────────────────────────

export async function getEmissionFactorsAction(): Promise<EmissionFactorWithCategory[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionFactors")
    .select(`*, category:EmissionCategories ( id, name, scope )`)
    .eq("is_active", true)
    .order("year_valid", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as EmissionFactorWithCategory[];
}

export async function createEmissionFactorAction(
  input: CreateEmissionFactorInput,
): Promise<{ data: EmissionFactor | null; error: string | null }> {
  try {
    const adminId = await requireAdmin();
    const db = createServiceClient();

    const { data, error } = await db
      .from("EmissionFactors")
      .insert({ ...input, created_by: adminId })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as EmissionFactor, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateEmissionFactorAction(
  id: string,
  input: Partial<CreateEmissionFactorInput>,
): Promise<{ data: EmissionFactor | null; error: string | null }> {
  try {
    const adminId = await requireAdmin();
    const db = createServiceClient();

    const { data, error } = await db
      .from("EmissionFactors")
      .update({ ...input, updated_by: adminId })
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as EmissionFactor, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteEmissionFactorAction(
  id: string,
): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
    const db = createServiceClient();
    // Soft delete to preserve historical calculation integrity
    const { error } = await db
      .from("EmissionFactors")
      .update({ is_active: false })
      .eq("id", id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── CalculationTemplates ─────────────────────────────────────────────────────

export async function getCalculationTemplatesAction(): Promise<CalculationTemplateWithRelations[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("CalculationTemplates")
    .select(`
      *,
      category:EmissionCategories ( id, name, scope ),
      default_ef:EmissionFactors ( id, name, unit, co2e_total )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as CalculationTemplateWithRelations[];
}

export async function createCalculationTemplateAction(
  input: CreateCalculationTemplateInput,
): Promise<{ data: CalculationTemplate | null; error: string | null }> {
  try {
    const adminId = await requireAdmin();
    const db = createServiceClient();

    const { data, error } = await db
      .from("CalculationTemplates")
      .insert({ ...input, created_by: adminId })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CalculationTemplate, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
