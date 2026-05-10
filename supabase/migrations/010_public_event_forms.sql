-- ================================================================
-- EcoWise: Public event emission forms (Phase 5)
-- Migration: 010_public_event_forms
--   • EventPublicForms — Org Admin generates a public form per event with a
--     unique signed token, brand customization, and a JSONB schema.
--   • EventPublicSubmissions — guest submissions stored alongside computed
--     CO2e. A trigger auto-creates a matching "EmissionLogs" row so the
--     org's emission dashboard reflects guest data immediately (BR-08).
--   • Rate-limit table dedicated to per-IP submissions on these public forms.
-- Idempotent: safe to re-run.
-- ================================================================

-- ── ENUM: form status ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE event_public_form_status AS ENUM ('Draft', 'Published', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TABLE: EventPublicForms ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EventPublicForms" (
  id              UUID                       DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID                       NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
  org_id          UUID                       NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  token           UUID                       NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  fields          JSONB                      NOT NULL DEFAULT '[]'::jsonb,
  welcome_message TEXT,
  brand_color     TEXT,
  status          event_public_form_status   NOT NULL DEFAULT 'Draft',
  created_at      TIMESTAMPTZ                NOT NULL DEFAULT now(),
  created_by      UUID                       REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ                NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_public_forms_event ON "EventPublicForms" (event_id);
CREATE INDEX IF NOT EXISTS idx_event_public_forms_org   ON "EventPublicForms" (org_id);
-- token has a UNIQUE constraint already (acts as an index)

-- ── TABLE: EventPublicSubmissions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EventPublicSubmissions" (
  id                 UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id            UUID         NOT NULL REFERENCES "EventPublicForms"(id) ON DELETE CASCADE,
  event_id           UUID         NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
  org_id             UUID         NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  submitted_by_email TEXT,
  submitted_data     JSONB        NOT NULL,
  computed_co2e      NUMERIC(18,4),
  emission_log_id    UUID,
  ip_address         TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_public_submissions_form ON "EventPublicSubmissions" (form_id);
CREATE INDEX IF NOT EXISTS idx_event_public_submissions_org  ON "EventPublicSubmissions" (org_id);
CREATE INDEX IF NOT EXISTS idx_event_public_submissions_evt  ON "EventPublicSubmissions" (event_id);
CREATE INDEX IF NOT EXISTS idx_event_public_submissions_at   ON "EventPublicSubmissions" (created_at DESC);

-- ── TABLE: rate limiter (per-IP per-form) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "EventPublicFormRateLimits" (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  token       UUID         NOT NULL,
  ip_address  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_form_rate_token_ip_time
  ON "EventPublicFormRateLimits" (token, ip_address, created_at DESC);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE "EventPublicForms"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventPublicSubmissions"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventPublicFormRateLimits" ENABLE ROW LEVEL SECURITY;

-- Org members can view forms; only Org Admin can write.
DROP POLICY IF EXISTS "event_public_forms: org members can select" ON "EventPublicForms";
CREATE POLICY "event_public_forms: org members can select"
  ON "EventPublicForms" FOR SELECT
  TO authenticated
  USING (public.is_emission_org_member(org_id));

DROP POLICY IF EXISTS "event_public_forms: org admin write" ON "EventPublicForms";
CREATE POLICY "event_public_forms: org admin write"
  ON "EventPublicForms" FOR ALL
  TO authenticated
  USING (public.is_emission_org_admin(org_id))
  WITH CHECK (public.is_emission_org_admin(org_id));

-- Submissions: read by org members; writes only via service role.
DROP POLICY IF EXISTS "event_public_submissions: org members can select" ON "EventPublicSubmissions";
CREATE POLICY "event_public_submissions: org members can select"
  ON "EventPublicSubmissions" FOR SELECT
  TO authenticated
  USING (public.is_emission_org_member(org_id));

-- ── AUDIT TRIGGERS ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_event_public_forms ON "EventPublicForms";
CREATE TRIGGER trg_audit_event_public_forms
  AFTER INSERT OR UPDATE OR DELETE ON "EventPublicForms"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('event_public_form');

DROP TRIGGER IF EXISTS trg_audit_event_public_submissions ON "EventPublicSubmissions";
CREATE TRIGGER trg_audit_event_public_submissions
  AFTER INSERT OR UPDATE OR DELETE ON "EventPublicSubmissions"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('event_public_submission');

-- ── updated_at auto trigger for EventPublicForms ──────────────────────────
DROP TRIGGER IF EXISTS trg_event_public_forms_updated_at ON "EventPublicForms";
CREATE TRIGGER trg_event_public_forms_updated_at
  BEFORE UPDATE ON "EventPublicForms"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

COMMENT ON TABLE "EventPublicForms"        IS 'Phase 5 (UC-33): public form definitions. Token addressable (BR-08).';
COMMENT ON TABLE "EventPublicSubmissions"  IS 'Phase 5 (UC-21): guest submissions. Auto-creates matching EmissionLogs row at the application layer.';
COMMENT ON TABLE "EventPublicFormRateLimits" IS 'Phase 5: per-IP per-token submission timestamps for the public-form rate limiter.';
