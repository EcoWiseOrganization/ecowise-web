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
  InputFieldSchema,
} from "@/types/sustainability";

/**
 * Historical seeds wrote CalculationTemplates.input_schema with `key`
 * / `default` (e.g. migration 019), but the TS type and the rest of
 * the app expect `field` / `default_value`. Normalise both shapes
 * into the canonical form at the read boundary so downstream UI code
 * never has to branch on which seed the row came from. Also drops
 * malformed entries that have no usable variable name.
 */
function normalizeInputSchema(raw: unknown): InputFieldSchema[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item): InputFieldSchema => {
      const field = String(item.field ?? item.key ?? "");
      const label = String(item.label ?? field);
      const type = item.type === "select" ? "select" : "number";
      // Some seeds store the unit only inside the label, e.g.
      // "Khoảng cách bay (km)". Fall back to extracting whatever is in
      // the trailing parens so the EmissionLog `unit` column (NOT NULL)
      // still gets a meaningful value at submit time.
      const explicitUnit = typeof item.unit === "string" ? item.unit.trim() : "";
      const labelTail = label.match(/\(([^()]+)\)\s*$/);
      const unit = explicitUnit || (labelTail ? labelTail[1].trim() : "");
      const required = typeof item.required === "boolean" ? item.required : true;
      const min = typeof item.min === "number" ? item.min : undefined;
      const max = typeof item.max === "number" ? item.max : undefined;
      const defaultRaw = item.default_value ?? item.default;
      const default_value = typeof defaultRaw === "number" ? defaultRaw : undefined;
      const options = Array.isArray(item.options)
        ? (item.options as { value: string; label: string }[])
        : undefined;
      return { field, label, type, unit, required, min, max, default_value, options };
    })
    .filter((item) => item.field);
}

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
  return ((data ?? []) as unknown as CalculationTemplateWithRelations[]).map((row) => ({
    ...row,
    input_schema: normalizeInputSchema(row.input_schema as unknown),
  }));
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
