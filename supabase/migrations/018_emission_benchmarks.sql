-- ============================================================================
-- Migration 018 — `EmissionBenchmarks` reference table + seed
-- ----------------------------------------------------------------------------
-- Replaces the hard-coded `CITY_AVG_KG` / `GLOBAL_AVG_KG` constants the
-- mobile Compare Emission screen has been using as placeholders. The table
-- stores per-region, per-year per-capita CO2e benchmarks with an explicit
-- source citation so the screen can show "Nguồn: …" instead of fabricating
-- figures.
--
-- Read access is OPEN (anon + authenticated) — these are public reference
-- numbers, not user data. Writes are restricted to service_role; updates
-- should land via future migrations as new years of data ship.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "EmissionBenchmarks" (
  id                          UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code                 TEXT            NOT NULL,        -- 'WORLD', 'VN', 'VN-HCM', ...
  region_name                 TEXT            NOT NULL,        -- display name (vi)
  region_type                 TEXT            NOT NULL
                                CHECK (region_type IN ('global', 'country', 'city')),
  year_of_data                INTEGER         NOT NULL,        -- e.g. 2022
  total_co2e_kg_per_capita    NUMERIC(10, 2)  NOT NULL,        -- annual total
  scope_1_share               NUMERIC(4, 3)   NOT NULL,        -- 0..1, direct
  scope_2_share               NUMERIC(4, 3)   NOT NULL,        -- 0..1, purchased energy
  scope_3_share               NUMERIC(4, 3)   NOT NULL,        -- 0..1, supply chain
  source_name                 TEXT            NOT NULL,        -- e.g. 'Our World in Data'
  source_url                  TEXT,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ     NOT NULL DEFAULT now(),

  UNIQUE (region_code, year_of_data),
  CONSTRAINT benchmarks_scope_shares_sum CHECK (
    abs((scope_1_share + scope_2_share + scope_3_share) - 1.0) < 0.01
  ),
  CONSTRAINT benchmarks_positive_total CHECK (total_co2e_kg_per_capita > 0)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_region_year
  ON "EmissionBenchmarks" (region_code, year_of_data DESC);

ALTER TABLE "EmissionBenchmarks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "benchmarks: public read" ON "EmissionBenchmarks";
CREATE POLICY "benchmarks: public read"
  ON "EmissionBenchmarks" FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── Seed: world + Vietnam (best citable per-capita figures, 2022) ──────────
-- Global: 4.66 t CO2 per capita, energy-related CO2, IEA via Our World in
-- Data (2022). Scope split is an indicative breakdown from EDGAR sectoral
-- shares; we surface it transparently so users see the assumption.
INSERT INTO "EmissionBenchmarks" (
  region_code, region_name, region_type, year_of_data,
  total_co2e_kg_per_capita,
  scope_1_share, scope_2_share, scope_3_share,
  source_name, source_url, notes
) VALUES (
  'WORLD', 'Toàn cầu', 'global', 2022,
  4660.00,
  0.400, 0.350, 0.250,
  'Our World in Data (IEA)',
  'https://ourworldindata.org/co2-emissions',
  'Per-capita energy CO2 (2022). Scope split is an indicative sectoral breakdown from EDGAR — direct fuel use vs purchased electricity vs supply chain.'
),
(
  'VN', 'Việt Nam', 'country', 2022,
  3470.00,
  0.450, 0.300, 0.250,
  'Our World in Data (IEA)',
  'https://ourworldindata.org/co2/country/vietnam',
  'Per-capita energy CO2 (2022). Scope 1 dominated by household + transport fuel given high motorbike share.'
)
ON CONFLICT (region_code, year_of_data) DO NOTHING;
