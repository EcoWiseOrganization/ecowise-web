-- ================================================================
-- EcoWise: Organization metadata (Phase 3)
-- Migration: 008_org_metadata
--   • Add industry / verification_status / website_url / address columns
--     idempotently. logo_url may already exist from earlier setup.
--   • Default subscription quota constants for BR-09 enforcement
--     before Phase 7 introduces real subscription tables.
-- ================================================================

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS industry             TEXT,
  ADD COLUMN IF NOT EXISTS website_url          TEXT,
  ADD COLUMN IF NOT EXISTS address              TEXT,
  ADD COLUMN IF NOT EXISTS contact_email        TEXT,
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS verification_status  TEXT  DEFAULT 'Pending'
    CHECK (verification_status IN ('Pending', 'Verified', 'Suspended')),
  ADD COLUMN IF NOT EXISTS max_users            INTEGER  DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_events           INTEGER  DEFAULT 10;

COMMENT ON COLUMN "Organization".industry            IS 'Primary industry sector (free text until Phase 7 introduces industry_type table).';
COMMENT ON COLUMN "Organization".verification_status IS 'Pending until System Admin verifies the org. Suspended freezes write access.';
COMMENT ON COLUMN "Organization".max_users           IS 'BR-09 default soft-limit until Phase 7 replaces with subscription-based quota.';
COMMENT ON COLUMN "Organization".max_events          IS 'BR-09 default soft-limit until Phase 7 replaces with subscription-based quota.';

-- ── 2) Settings update RLS already covered by migration 001 policy
--    "orgs: admin can update". No change needed.

-- ── 3) Add an enum for emission log review decision so it is auditable
--    via JSONB old/new values from the audit trigger.
DO $$ BEGIN
  ALTER TYPE emission_log_status ADD VALUE IF NOT EXISTS 'Rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional rejection reason column for audit trail.
ALTER TABLE "EmissionLogs"
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ;

COMMENT ON COLUMN "EmissionLogs".review_reason IS 'Optional reviewer note recorded when transitioning to Verified or Rejected.';
