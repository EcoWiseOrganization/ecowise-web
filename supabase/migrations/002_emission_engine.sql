-- ================================================================
-- EcoWise: Dynamic Emission Calculation Engine
-- Migration: 002_emission_engine
-- Standard: GHG Protocol & ISO 14064
-- Idempotent: safe to re-run multiple times.
-- ================================================================

-- ----------------------------------------------------------------
-- ENUM TYPES  (prefixed with ghg_ to avoid conflicts)
-- DO/EXCEPTION pattern = "CREATE TYPE IF NOT EXISTS" equivalent
-- ----------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE ghg_scope AS ENUM ('Scope 1', 'Scope 2', 'Scope 3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ghg_calc_method AS ENUM ('Activity-based', 'Spend-based', 'Hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ghg_ef_source AS ENUM (
    'MONRE_VN',
    'IPCC',
    'DEFRA',
    'EPA',
    'Climatiq',
    'Custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- TABLE: "EmissionCategories"
-- DROP + RECREATE ensures correct schema regardless of prior state.
-- CASCADE drops dependent tables (EmissionFactors, CalculationTemplates) too.
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS "CalculationTemplates" CASCADE;
DROP TABLE IF EXISTS "EmissionFactors"      CASCADE;
DROP TABLE IF EXISTS "EmissionCategories"   CASCADE;

CREATE TABLE "EmissionCategories" (
  id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255)   NOT NULL,
  scope       ghg_scope      NOT NULL,
  parent_id   UUID           REFERENCES "EmissionCategories"(id) ON DELETE SET NULL,
  description TEXT,
  icon        VARCHAR(100),
  sort_order  SMALLINT       DEFAULT 0,
  is_active   BOOLEAN        DEFAULT true,
  created_at  TIMESTAMPTZ    DEFAULT now(),
  created_by  UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ    DEFAULT now(),
  updated_by  UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (name, scope, parent_id)
);

-- ----------------------------------------------------------------
-- TABLE: "EmissionFactors"
-- co2e_total = co2 + (ch4 × 27.9) + (n2o × 273)  [IPCC AR6 GWP100]
-- ----------------------------------------------------------------
CREATE TABLE "EmissionFactors" (
  id               UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id      UUID           NOT NULL REFERENCES "EmissionCategories"(id) ON DELETE CASCADE,
  name             VARCHAR(255)   NOT NULL,
  unit             VARCHAR(100)   NOT NULL,
  co2_value        NUMERIC(18,8)  NOT NULL DEFAULT 0,
  ch4_value        NUMERIC(18,8)  NOT NULL DEFAULT 0,
  n2o_value        NUMERIC(18,8)  NOT NULL DEFAULT 0,
  co2e_total       NUMERIC(18,8)  NOT NULL,
  source_reference ghg_ef_source  NOT NULL DEFAULT 'Custom',
  year_valid       SMALLINT,
  is_active        BOOLEAN        DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ    DEFAULT now(),
  created_by       UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ    DEFAULT now(),
  updated_by       UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT ef_positive_co2e CHECK (co2e_total >= 0)
);

-- ----------------------------------------------------------------
-- TABLE: "CalculationTemplates"
-- formula_string example: "kwh * EF_TOTAL"
-- input_schema  example: [{"field":"kwh","type":"number","unit":"kWh","label":"Điện năng","required":true}]
-- EF_TOTAL is resolved at runtime from EmissionFactor.co2e_total
-- ----------------------------------------------------------------
CREATE TABLE "CalculationTemplates" (
  id                 UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id        UUID             NOT NULL REFERENCES "EmissionCategories"(id) ON DELETE CASCADE,
  default_ef_id      UUID             REFERENCES "EmissionFactors"(id) ON DELETE SET NULL,
  name               VARCHAR(255)     NOT NULL,
  description        TEXT,
  input_schema       JSONB            NOT NULL DEFAULT '[]'::jsonb,
  formula_string     TEXT             NOT NULL,
  calculation_method ghg_calc_method  NOT NULL DEFAULT 'Activity-based',
  result_unit        VARCHAR(50)      DEFAULT 'kgCO2e',
  is_active          BOOLEAN          DEFAULT true,
  created_at         TIMESTAMPTZ      DEFAULT now(),
  created_by         UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at         TIMESTAMPTZ      DEFAULT now(),
  updated_by         UUID             REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------
-- INDEXES  (IF NOT EXISTS = safe to re-run)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ef_category_id  ON "EmissionFactors"(category_id);
CREATE INDEX IF NOT EXISTS idx_ef_source_year  ON "EmissionFactors"(source_reference, year_valid);
CREATE INDEX IF NOT EXISTS idx_ef_active       ON "EmissionFactors"(is_active);
CREATE INDEX IF NOT EXISTS idx_cat_scope       ON "EmissionCategories"(scope);
CREATE INDEX IF NOT EXISTS idx_cat_parent      ON "EmissionCategories"(parent_id);
CREATE INDEX IF NOT EXISTS idx_tmpl_category   ON "CalculationTemplates"(category_id);
CREATE INDEX IF NOT EXISTS idx_tmpl_active     ON "CalculationTemplates"(is_active);

-- ----------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- CREATE OR REPLACE handles re-runs for the function.
-- DROP TRIGGER IF EXISTS + CREATE handles re-runs for the triggers.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION ghg_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emission_categories_updated_at ON "EmissionCategories";
CREATE TRIGGER trg_emission_categories_updated_at
  BEFORE UPDATE ON "EmissionCategories"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

DROP TRIGGER IF EXISTS trg_emission_factors_updated_at ON "EmissionFactors";
CREATE TRIGGER trg_emission_factors_updated_at
  BEFORE UPDATE ON "EmissionFactors"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

DROP TRIGGER IF EXISTS trg_calc_templates_updated_at ON "CalculationTemplates";
CREATE TRIGGER trg_calc_templates_updated_at
  BEFORE UPDATE ON "CalculationTemplates"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- READ: all authenticated users
-- WRITE: system_admin only (User.is_admin = true)
-- ----------------------------------------------------------------
ALTER TABLE "EmissionCategories"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmissionFactors"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalculationTemplates" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public."User" WHERE id = auth.uid()),
    false
  );
$$;

-- EmissionCategories policies
DROP POLICY IF EXISTS "emission_cats: read"   ON "EmissionCategories";
DROP POLICY IF EXISTS "emission_cats: insert" ON "EmissionCategories";
DROP POLICY IF EXISTS "emission_cats: update" ON "EmissionCategories";
DROP POLICY IF EXISTS "emission_cats: delete" ON "EmissionCategories";

CREATE POLICY "emission_cats: read"   ON "EmissionCategories" FOR SELECT TO authenticated USING (true);
CREATE POLICY "emission_cats: insert" ON "EmissionCategories" FOR INSERT TO authenticated WITH CHECK (is_system_admin());
CREATE POLICY "emission_cats: update" ON "EmissionCategories" FOR UPDATE TO authenticated USING (is_system_admin());
CREATE POLICY "emission_cats: delete" ON "EmissionCategories" FOR DELETE TO authenticated USING (is_system_admin());

-- EmissionFactors policies
DROP POLICY IF EXISTS "emission_factors: read"   ON "EmissionFactors";
DROP POLICY IF EXISTS "emission_factors: insert" ON "EmissionFactors";
DROP POLICY IF EXISTS "emission_factors: update" ON "EmissionFactors";
DROP POLICY IF EXISTS "emission_factors: delete" ON "EmissionFactors";

CREATE POLICY "emission_factors: read"   ON "EmissionFactors" FOR SELECT TO authenticated USING (true);
CREATE POLICY "emission_factors: insert" ON "EmissionFactors" FOR INSERT TO authenticated WITH CHECK (is_system_admin());
CREATE POLICY "emission_factors: update" ON "EmissionFactors" FOR UPDATE TO authenticated USING (is_system_admin());
CREATE POLICY "emission_factors: delete" ON "EmissionFactors" FOR DELETE TO authenticated USING (is_system_admin());

-- CalculationTemplates policies
DROP POLICY IF EXISTS "calc_templates: read"   ON "CalculationTemplates";
DROP POLICY IF EXISTS "calc_templates: insert" ON "CalculationTemplates";
DROP POLICY IF EXISTS "calc_templates: update" ON "CalculationTemplates";
DROP POLICY IF EXISTS "calc_templates: delete" ON "CalculationTemplates";

CREATE POLICY "calc_templates: read"   ON "CalculationTemplates" FOR SELECT TO authenticated USING (true);
CREATE POLICY "calc_templates: insert" ON "CalculationTemplates" FOR INSERT TO authenticated WITH CHECK (is_system_admin());
CREATE POLICY "calc_templates: update" ON "CalculationTemplates" FOR UPDATE TO authenticated USING (is_system_admin());
CREATE POLICY "calc_templates: delete" ON "CalculationTemplates" FOR DELETE TO authenticated USING (is_system_admin());

-- ================================================================
-- SEED DATA (ON CONFLICT DO NOTHING = idempotent)
-- ================================================================

INSERT INTO "EmissionCategories" (id, name, scope, description) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Electricity',        'Scope 2', 'Purchased electricity consumption (grid)'),
  ('c1000000-0000-0000-0000-000000000002', 'Business Travel',    'Scope 3', 'Employee travel for work purposes'),
  ('c1000000-0000-0000-0000-000000000003', 'Fuel Combustion',    'Scope 1', 'Direct combustion of fuel on-site'),
  ('c1000000-0000-0000-0000-000000000004', 'Supply Chain Spend', 'Scope 3', 'Spend-based upstream emissions (EEIO method)')
;

INSERT INTO "EmissionFactors"
  (id, category_id, name, unit, co2_value, ch4_value, n2o_value, co2e_total, source_reference, year_valid, notes)
VALUES
  (
    'ef000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Vietnam National Grid 2022', 'kgCO2e/kWh',
    0.5571, 0.0, 0.0, 0.5571,
    'MONRE_VN', 2022,
    'Hệ số phát thải lưới điện quốc gia VN 2022 - Quyết định 01/2022/QĐ-TTg'
  ),
  (
    'ef000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'Petrol Car – Average (DEFRA 2022)', 'kgCO2e/km',
    0.1704, 0.000005, 0.000056, 0.1900,
    'DEFRA', 2022,
    'Average petrol car per km (DEFRA 2022 GHG Conversion Factors)'
  )
;

INSERT INTO "CalculationTemplates"
  (id, category_id, default_ef_id, name, description, input_schema, formula_string, calculation_method, result_unit)
VALUES
  (
    'ab100000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'ef000000-0000-0000-0000-000000000001',
    'Điện năng tiêu thụ (kWh)',
    'Tính phát thải Scope 2 từ điện năng tiêu thụ. Công thức: kWh × EF_TOTAL',
    '[{"field":"kwh","type":"number","unit":"kWh","label":"Điện năng tiêu thụ","required":true,"min":0}]'::jsonb,
    'kwh * EF_TOTAL',
    'Activity-based', 'kgCO2e'
  ),
  (
    'ab100000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'ef000000-0000-0000-0000-000000000002',
    'Di chuyển công tác bằng xe ô tô',
    'Tính phát thải Scope 3 từ di chuyển công tác. Công thức: (distance_km / passengers) × EF_TOTAL',
    '[{"field":"distance_km","type":"number","unit":"km","label":"Tổng quãng đường","required":true,"min":0},{"field":"passengers","type":"number","unit":"người","label":"Số hành khách","required":true,"min":1,"default_value":1}]'::jsonb,
    '(distance_km / passengers) * EF_TOTAL',
    'Activity-based', 'kgCO2e'
  )
;
