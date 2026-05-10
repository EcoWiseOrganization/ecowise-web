-- ================================================================
-- EcoWise: Audit Logs (Phase 0)
-- Migration: 004_audit_logs
-- BR-16: Critical actions create audit logs that are IMMUTABLE.
--   Even System Admin cannot UPDATE/DELETE rows in this table.
-- Tables touched: "AuditLogs" + generic trigger function audit_table_change
-- Idempotent: safe to re-run.
-- ================================================================

-- ── ENUM: audit_log_status (BR-20) ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE audit_log_status AS ENUM ('success', 'failure', 'warning');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TABLE: "AuditLogs" ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLogs" (
  id              UUID              DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id   UUID              REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role      TEXT,                                         -- 'system_admin' | 'org_admin' | 'employee' | 'individual' | 'guest' | 'system'
  action          TEXT              NOT NULL,                   -- e.g. 'login', 'create_organization', 'update_emission_log'
  resource_type   TEXT              NOT NULL,                   -- e.g. 'organization', 'emission_log', 'auth'
  resource_id     UUID,                                         -- NULL for non-entity actions (e.g. login)
  org_id          UUID,                                         -- denormalized for tenant-scoped queries
  old_value       JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  status          audit_log_status  NOT NULL DEFAULT 'success',
  error_message   TEXT,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- ── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON "AuditLogs" (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource      ON "AuditLogs" (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id        ON "AuditLogs" (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON "AuditLogs" (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON "AuditLogs" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status        ON "AuditLogs" (status);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
-- Only System Admin can SELECT.
-- INSERT/UPDATE/DELETE are blocked at policy level too — service role bypasses
-- RLS for INSERT (used by writeAuditLog), but the immutability trigger below
-- still rejects UPDATE/DELETE even from service role.
ALTER TABLE "AuditLogs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs: system admin can select" ON "AuditLogs";
CREATE POLICY "audit_logs: system admin can select"
  ON "AuditLogs" FOR SELECT
  TO authenticated
  USING (is_system_admin());

-- Explicit deny for non-service-role mutations: no INSERT/UPDATE/DELETE
-- policy is created → all such ops via authenticated/anon are blocked by RLS
-- by default. Service role bypasses RLS to write via writeAuditLog().

-- ── IMMUTABILITY TRIGGER (BR-16) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: AuditLogs rows cannot be % (BR-16).', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable_update ON "AuditLogs";
CREATE TRIGGER trg_audit_logs_immutable_update
  BEFORE UPDATE ON "AuditLogs"
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_audit_logs_immutable_delete ON "AuditLogs";
CREATE TRIGGER trg_audit_logs_immutable_delete
  BEFORE DELETE ON "AuditLogs"
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- TRUNCATE is also rejected by the trigger pattern below (statement-level).
CREATE OR REPLACE FUNCTION public.prevent_audit_log_truncate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: AuditLogs cannot be TRUNCATEd (BR-16).';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable_truncate ON "AuditLogs";
CREATE TRIGGER trg_audit_logs_immutable_truncate
  BEFORE TRUNCATE ON "AuditLogs"
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_truncate();

-- ── GENERIC AUDIT TRIGGER FUNCTION ────────────────────────────────────────
-- Attached AFTER INSERT/UPDATE/DELETE on selected entity tables to
-- automatically write a row to "AuditLogs".
--
-- TG_ARGV[0] — resource_type (e.g. 'organization', 'event')
-- TG_ARGV[1] — column name in the row that holds the org_id (default 'org_id'; pass 'id' for the Organization table itself)
--
-- Notes:
--  • SECURITY DEFINER → trigger can INSERT into AuditLogs even when the
--    caller is an authenticated user without an explicit AuditLogs INSERT
--    policy (no policy exists; only SELECT is allowed for sys admin).
--  • auth.uid() is read from JWT claim. NULL if invoked via service-role
--    without JWT context (e.g. background jobs).
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor          UUID  := auth.uid();
  v_resource_type  TEXT  := TG_ARGV[0];
  v_org_col        TEXT  := COALESCE(TG_ARGV[1], 'org_id');
  v_action         TEXT;
  v_old            JSONB := NULL;
  v_new            JSONB := NULL;
  v_resource_id    UUID;
  v_org_id         UUID  := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create_' || v_resource_type;
    v_new    := to_jsonb(NEW);
    v_resource_id := (v_new->>'id')::UUID;
    IF v_new ? v_org_col AND v_new->>v_org_col IS NOT NULL THEN
      v_org_id := (v_new->>v_org_col)::UUID;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_' || v_resource_type;
    v_old    := to_jsonb(OLD);
    v_new    := to_jsonb(NEW);
    v_resource_id := (v_new->>'id')::UUID;
    IF v_new ? v_org_col AND v_new->>v_org_col IS NOT NULL THEN
      v_org_id := (v_new->>v_org_col)::UUID;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete_' || v_resource_type;
    v_old    := to_jsonb(OLD);
    v_resource_id := (v_old->>'id')::UUID;
    IF v_old ? v_org_col AND v_old->>v_org_col IS NOT NULL THEN
      v_org_id := (v_old->>v_org_col)::UUID;
    END IF;
  END IF;

  INSERT INTO "AuditLogs"
    (actor_user_id, action, resource_type, resource_id, org_id, old_value, new_value, status)
  VALUES
    (v_actor, v_action, v_resource_type, v_resource_id, v_org_id, v_old, v_new, 'success');

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ── ATTACH AUDIT TRIGGERS to critical entity tables ───────────────────────

-- Organization itself: org_id = id of this row
DROP TRIGGER IF EXISTS trg_audit_organization ON "Organization";
CREATE TRIGGER trg_audit_organization
  AFTER INSERT OR UPDATE OR DELETE ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('organization', 'id');

-- OrganizationMembers: has org_id column
DROP TRIGGER IF EXISTS trg_audit_organization_members ON "OrganizationMembers";
CREATE TRIGGER trg_audit_organization_members
  AFTER INSERT OR UPDATE OR DELETE ON "OrganizationMembers"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('organization_member');

-- Events: has org_id column
DROP TRIGGER IF EXISTS trg_audit_events ON "Events";
CREATE TRIGGER trg_audit_events
  AFTER INSERT OR UPDATE OR DELETE ON "Events"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('event');

-- EmissionLogs: has org_id column
DROP TRIGGER IF EXISTS trg_audit_emission_logs ON "EmissionLogs";
CREATE TRIGGER trg_audit_emission_logs
  AFTER INSERT OR UPDATE OR DELETE ON "EmissionLogs"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('emission_log');

-- EmissionFactors: no org_id (global) — trigger leaves org_id NULL
DROP TRIGGER IF EXISTS trg_audit_emission_factors ON "EmissionFactors";
CREATE TRIGGER trg_audit_emission_factors
  AFTER INSERT OR UPDATE OR DELETE ON "EmissionFactors"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('emission_factor');

-- EmissionCategories: no org_id (global)
DROP TRIGGER IF EXISTS trg_audit_emission_categories ON "EmissionCategories";
CREATE TRIGGER trg_audit_emission_categories
  AFTER INSERT OR UPDATE OR DELETE ON "EmissionCategories"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('emission_category');

-- CalculationTemplates: no org_id (global)
DROP TRIGGER IF EXISTS trg_audit_calculation_templates ON "CalculationTemplates";
CREATE TRIGGER trg_audit_calculation_templates
  AFTER INSERT OR UPDATE OR DELETE ON "CalculationTemplates"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('calculation_template');

-- ── COMMENT ───────────────────────────────────────────────────────────────
COMMENT ON TABLE  "AuditLogs"                        IS 'BR-16: Immutable audit trail of critical actions. SELECT restricted to System Admin.';
COMMENT ON FUNCTION public.audit_table_change()      IS 'Generic AFTER INSERT/UPDATE/DELETE trigger that writes to AuditLogs. TG_ARGV[0] = resource_type, TG_ARGV[1] = org column (default org_id, pass id for Organization).';
COMMENT ON FUNCTION public.prevent_audit_log_modification() IS 'BR-16: rejects UPDATE/DELETE on AuditLogs.';
COMMENT ON FUNCTION public.prevent_audit_log_truncate()     IS 'BR-16: rejects TRUNCATE on AuditLogs.';
