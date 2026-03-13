/**
 * sustainability.service.ts
 * Client-side Supabase CRUD for EmissionCategories, EmissionFactors,
 * and CalculationTemplates.
 *
 * All table names are PascalCase and MUST be wrapped in double quotes
 * when passed to Supabase's `.from()` — Supabase forwards them as-is
 * to PostgREST which is case-sensitive.
 *
 * Uses the anon/user Supabase client (respects RLS).
 * Write operations will fail for non-admin users (RLS blocks them).
 */

import { createClient } from "@/lib/supabase/client";
import type {
  EmissionCategory,
  EmissionFactor,
  EmissionFactorWithCategory,
  CalculationTemplate,
  CalculationTemplateWithRelations,
  CreateEmissionCategoryInput,
  CreateEmissionFactorInput,
  CreateCalculationTemplateInput,
} from "@/types/sustainability";

// ── EmissionCategories ───────────────────────────────────────────────────────

export async function getEmissionCategories(): Promise<EmissionCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("EmissionCategories")
    .select("*")
    .eq("is_active", true)
    .order("scope", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EmissionCategory[];
}

export async function createEmissionCategory(
  input: CreateEmissionCategoryInput,
): Promise<EmissionCategory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("EmissionCategories")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EmissionCategory;
}

// ── EmissionFactors ──────────────────────────────────────────────────────────

export async function getEmissionFactors(
  categoryId?: string,
): Promise<EmissionFactorWithCategory[]> {
  const supabase = createClient();

  let query = supabase
    .from("EmissionFactors")
    // Join category to display scope & category name in the table
    .select(`*, category:EmissionCategories ( id, name, scope )`)
    .eq("is_active", true)
    .order("year_valid", { ascending: false });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EmissionFactorWithCategory[];
}

export async function createEmissionFactor(
  input: CreateEmissionFactorInput,
): Promise<EmissionFactor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("EmissionFactors")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EmissionFactor;
}

export async function updateEmissionFactor(
  id: string,
  input: Partial<CreateEmissionFactorInput>,
): Promise<EmissionFactor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("EmissionFactors")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EmissionFactor;
}

export async function deleteEmissionFactor(id: string): Promise<void> {
  const supabase = createClient();
  // Soft delete: set is_active = false instead of hard delete
  const { error } = await supabase
    .from("EmissionFactors")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── CalculationTemplates ─────────────────────────────────────────────────────

export async function getCalculationTemplates(
  categoryId?: string,
): Promise<CalculationTemplateWithRelations[]> {
  const supabase = createClient();

  let query = supabase
    .from("CalculationTemplates")
    .select(`
      *,
      category:EmissionCategories ( id, name, scope ),
      default_ef:EmissionFactors ( id, name, unit, co2e_total )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CalculationTemplateWithRelations[];
}

export async function createCalculationTemplate(
  input: CreateCalculationTemplateInput,
): Promise<CalculationTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("CalculationTemplates")
    .insert({
      ...input,
      // Ensure input_schema is stored as proper JSON
      input_schema: input.input_schema,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CalculationTemplate;
}

export async function updateCalculationTemplate(
  id: string,
  input: Partial<CreateCalculationTemplateInput>,
): Promise<CalculationTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("CalculationTemplates")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CalculationTemplate;
}
