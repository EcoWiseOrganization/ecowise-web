-- ─────────────────────────────────────────────────────────────────────────
-- Migration 032 — emission factor source becomes free-form text
--
-- Admins need to register novel source references (e.g. a new regional
-- regulator, an internal study) at EmissionFactor creation time without
-- shipping a schema change. Convert source_reference from the
-- ghg_ef_source ENUM to VARCHAR(100). Existing rows ("MONRE_VN",
-- "IPCC", …) carry over verbatim and remain valid suggestions in the
-- admin combobox. The enum itself is dropped — it had only this one
-- referrer.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- The composite (source_reference, year_valid) index depends on the
-- column type — drop and recreate around the conversion.
DROP INDEX IF EXISTS idx_ef_source_year;

-- Detach the ENUM default so PostgreSQL doesn't try to cast it
-- during the type change.
ALTER TABLE "EmissionFactors"
  ALTER COLUMN source_reference DROP DEFAULT;

-- Switch column type. USING source_reference::text preserves every
-- existing label verbatim.
ALTER TABLE "EmissionFactors"
  ALTER COLUMN source_reference TYPE VARCHAR(100)
  USING source_reference::text;

-- Re-attach the default as a plain string literal.
ALTER TABLE "EmissionFactors"
  ALTER COLUMN source_reference SET DEFAULT 'Custom';

-- Reinstate the index now that the column type is stable.
CREATE INDEX idx_ef_source_year
  ON "EmissionFactors"(source_reference, year_valid);

-- The enum is no longer referenced anywhere; drop it to keep the
-- type catalog tidy. Wrapped in DO so re-running the migration is a
-- no-op rather than an error.
DO $$ BEGIN
  DROP TYPE ghg_ef_source;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

COMMIT;
