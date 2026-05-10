-- ================================================================
-- EcoWise: EmissionLogs Compliance Constraints (Phase 0)
-- Migration: 005_emission_log_constraints
-- Implements:
--   • BR-06 (Frozen Factor Snapshot) — adds nullable factor_* columns to be
--     populated when a log is created. App layer will require them on insert
--     starting from Phase 4. Older rows (created before Phase 0) remain NULL.
--   • BR-07 (Published / Exported lock) — UPDATE/DELETE blocked once status
--     is one of those terminal values. Returns MSG12 to the caller.
-- Idempotent: safe to re-run.
-- ================================================================

-- ── 1) Extend emission_log_status enum with Published & Exported ──────────
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS requires PG12+. Wrap in DO block
-- because ADD VALUE cannot run inside a transaction with CREATE TYPE in
-- some environments — but on Supabase (PG 15+) it is fine.
DO $$ BEGIN
  ALTER TYPE emission_log_status ADD VALUE IF NOT EXISTS 'Published';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE emission_log_status ADD VALUE IF NOT EXISTS 'Exported';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2) Add frozen factor snapshot columns ─────────────────────────────────
-- These are NULLABLE initially because:
--   • existing rows pre-Phase 0 have no snapshot.
--   • app layer (Phase 4) will set NOT NULL via service-side validation
--     and may later enforce via CHECK once back-fill is done.
ALTER TABLE "EmissionLogs"
  ADD COLUMN IF NOT EXISTS factor_id        UUID,
  ADD COLUMN IF NOT EXISTS factor_value     NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS factor_gwp       NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS factor_unit      TEXT,
  ADD COLUMN IF NOT EXISTS factor_version   TEXT,
  ADD COLUMN IF NOT EXISTS factor_source    TEXT;

COMMENT ON COLUMN "EmissionLogs".factor_id      IS 'BR-06: snapshot of EmissionFactors.id at the time of log creation (no FK — soft pointer).';
COMMENT ON COLUMN "EmissionLogs".factor_value   IS 'BR-06: frozen co2e_total value applied when this log was computed.';
COMMENT ON COLUMN "EmissionLogs".factor_gwp     IS 'BR-06: GWP standard reference applied (e.g. AR6 GWP100).';
COMMENT ON COLUMN "EmissionLogs".factor_unit    IS 'BR-06: unit of the frozen factor (e.g. kgCO2e/kWh).';
COMMENT ON COLUMN "EmissionLogs".factor_version IS 'BR-06: version label of the factor entry at log time.';
COMMENT ON COLUMN "EmissionLogs".factor_source  IS 'BR-06: source reference (MONRE_VN, IPCC, DEFRA, EPA, Climatiq, Custom).';

-- ── 3) Lock published/exported logs (BR-07) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_published_emission_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IN ('Published', 'Exported') THEN
    -- Allow status itself to remain identical so admin can patch e.g.
    -- evidence_url/notes? No — BR-07 is strict: any modification rejected.
    RAISE EXCEPTION
      'MSG12: Activity data inside a Published or Exported report cannot be modified (BR-07). Log id=%, status=%.',
      OLD.id, OLD.status
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' AND OLD.status IN ('Published', 'Exported') THEN
    RAISE EXCEPTION
      'MSG12: Activity data inside a Published or Exported report cannot be deleted (BR-07). Log id=%, status=%.',
      OLD.id, OLD.status
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_emission_logs_published_lock_update ON "EmissionLogs";
CREATE TRIGGER trg_emission_logs_published_lock_update
  BEFORE UPDATE ON "EmissionLogs"
  FOR EACH ROW EXECUTE FUNCTION public.prevent_published_emission_log_modification();

DROP TRIGGER IF EXISTS trg_emission_logs_published_lock_delete ON "EmissionLogs";
CREATE TRIGGER trg_emission_logs_published_lock_delete
  BEFORE DELETE ON "EmissionLogs"
  FOR EACH ROW EXECUTE FUNCTION public.prevent_published_emission_log_modification();

COMMENT ON FUNCTION public.prevent_published_emission_log_modification() IS
  'BR-07: rejects UPDATE/DELETE on EmissionLogs whose status is Published or Exported. Raises MSG12.';
