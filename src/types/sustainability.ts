/**
 * sustainability.ts
 * TypeScript interfaces mirroring the PostgreSQL schema in 002_emission_engine.sql
 * Table names are PascalCase (quoted in DB); field names are snake_case.
 * GHG Protocol & ISO 14064 compliant.
 */

// ── Enum literals ──────────────────────────────────────────────────────────

/** GHG Protocol emission scope classification */
export type Scope = "Scope 1" | "Scope 2" | "Scope 3";

/** GHG Protocol calculation method */
export type CalculationMethod = "Activity-based" | "Spend-based" | "Hybrid";

/** Recognised emission factor data sources */
export type EFSource =
  | "MONRE_VN"  // Bộ Tài Nguyên Môi Trường Việt Nam
  | "IPCC"      // IPCC AR6
  | "DEFRA"     // UK DEFRA
  | "EPA"       // US EPA
  | "Climatiq"  // Climatiq cloud database
  | "Custom";   // Admin-defined

// ── Input Schema (JSONB stored in CalculationTemplates.input_schema) ────────

/**
 * Describes one user-facing input field for a CalculationTemplate.
 * This is stored as a JSONB array in the DB; serialised/deserialised
 * by the service layer.
 */
export interface InputFieldSchema {
  /** Variable name used in formula_string, e.g. "kwh", "distance_km" */
  field: string;
  /** HTML input type hint */
  type: "number" | "select";
  /** Physical unit label shown in UI, e.g. "kWh", "km", "VND" */
  unit: string;
  /** Human-readable Vietnamese label shown in the form */
  label: string;
  /** Whether the field must be filled before submission */
  required?: boolean;
  /** Minimum allowed value (for number fields) */
  min?: number;
  /** Maximum allowed value (for number fields) */
  max?: number;
  /** Pre-filled default value */
  default_value?: number;
  /** Options for select fields */
  options?: { value: string; label: string }[];
}

// ── Database row interfaces ──────────────────────────────────────────────────

/**
 * DB table: "EmissionCategories"
 * Hierarchical taxonomy: Scope 1/2/3 → category → sub-category
 */
export interface EmissionCategory {
  id: string;
  name: string;
  scope: Scope;
  /** NULL → top-level category */
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** EmissionCategory joined with its children for tree-rendering */
export interface EmissionCategoryWithChildren extends EmissionCategory {
  children?: EmissionCategory[];
}

/**
 * DB table: "EmissionFactors"
 * GHG emission factors with full CO2/CH4/N2O component breakdown.
 * co2e_total is the primary value used in calculations.
 */
export interface EmissionFactor {
  id: string;
  category_id: string;
  name: string;
  /** Denominator unit, e.g. "kgCO2e/kWh", "kgCO2e/km", "kgCO2e/VND" */
  unit: string;
  /** CO₂ component (kg per activity unit) */
  co2_value: number;
  /** CH₄ component (kg per activity unit) */
  ch4_value: number;
  /** N₂O component (kg per activity unit) */
  n2o_value: number;
  /**
   * Total CO₂ equivalent — the value substituted as EF_TOTAL in formulas.
   * = co2 + (ch4 × 27.9) + (n2o × 273)  [IPCC AR6 GWP100]
   */
  co2e_total: number;
  source_reference: EFSource;
  /** Regulatory year this factor applies to */
  year_valid: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** EmissionFactor joined with its category (for display in tables) */
export interface EmissionFactorWithCategory extends EmissionFactor {
  category: Pick<EmissionCategory, "id" | "name" | "scope">;
}

/**
 * DB table: "CalculationTemplates"
 * Dynamic formula definitions. The formula_string is evaluated at
 * runtime by FormulaEngine with user-supplied input_data and EF_TOTAL.
 */
export interface CalculationTemplate {
  id: string;
  category_id: string;
  /** Pre-linked EF; if null, user must select EF at data-entry time */
  default_ef_id: string | null;
  name: string;
  description: string | null;
  /** JSONB array of InputFieldSchema — defines the user input form */
  input_schema: InputFieldSchema[];
  /**
   * Mathematical formula string.
   * Reserved variable: EF_TOTAL (resolved from linked EmissionFactor.co2e_total)
   * Example: "kwh * EF_TOTAL"
   * Example: "(distance_km / passengers) * EF_TOTAL"
   */
  formula_string: string;
  calculation_method: CalculationMethod;
  /** Label shown as the result unit in UI */
  result_unit: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** CalculationTemplate with related data resolved for display */
export interface CalculationTemplateWithRelations extends CalculationTemplate {
  category: Pick<EmissionCategory, "id" | "name" | "scope">;
  default_ef: Pick<EmissionFactor, "id" | "name" | "unit" | "co2e_total"> | null;
}

// ── DTO types for create/update operations ──────────────────────────────────

export type CreateEmissionCategoryInput = Pick<
  EmissionCategory,
  "name" | "scope" | "description" | "icon" | "sort_order"
> & { parent_id?: string };

export type CreateEmissionFactorInput = Pick<
  EmissionFactor,
  | "category_id"
  | "name"
  | "unit"
  | "co2_value"
  | "ch4_value"
  | "n2o_value"
  | "co2e_total"
  | "source_reference"
  | "year_valid"
  | "notes"
>;

export type CreateCalculationTemplateInput = Pick<
  CalculationTemplate,
  | "category_id"
  | "name"
  | "description"
  | "input_schema"
  | "formula_string"
  | "calculation_method"
  | "result_unit"
> & { default_ef_id?: string };

// ── Runtime calculation types ────────────────────────────────────────────────

/** Parameters passed to FormulaEngine.calculate() */
export interface CalculationParams {
  template: CalculationTemplate;
  /** User-supplied activity data keyed by InputFieldSchema.field */
  input_data: Record<string, number>;
  /** The co2e_total value of the selected EmissionFactor */
  ef_value: number;
}

/** Result returned by FormulaEngine.calculate() */
export interface CalculationResult {
  /** Emission in kgCO₂e */
  result_kgco2e: number;
  /** Converted to tCO₂e for reporting */
  result_tco2e: number;
  /** Human-readable calculation trace for audit trail */
  breakdown: string;
}
